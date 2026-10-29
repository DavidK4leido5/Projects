import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { addresses, orderFulfilments, orderItems, orders, products, stores } from "@/lib/db/schema";
import { lifetimes, tags } from "@/lib/cache";
import { listStoresWithCounts } from "@/features/admin/queries";

/** Product stock at or below this is treated as low. */
export const LOW_STOCK_THRESHOLD = 5;

/** The store roster is small enough to page in memory. */
export const STORES_PER_PAGE = 20;

/**
 * The admin store roster. One row per store account, so it changes only when a
 * store does; the page slices the cached list by URL.
 *
 * ponytail: cached full read, sliced by page. Move to a paged query if the
 * roster grows past a few hundred stores.
 */
export async function listAdminStores() {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.stores);
  return listStoresWithCounts();
}

export type AdminOrderSlice = {
  storeId: string;
  storeName: string;
  status: string;
  itemCount: number;
};

/** Every store's slice of every order, keyed by order id. */
export async function adminOrderSlices(): Promise<Record<string, AdminOrderSlice[]>> {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.orders);
  cacheTag(tags.stores);

  const db = getDb();
  const [slices, itemRows] = await Promise.all([
    db
      .select({
        orderId: orderFulfilments.orderId,
        storeId: orderFulfilments.storeId,
        storeName: stores.name,
        status: orderFulfilments.status,
      })
      .from(orderFulfilments)
      .innerJoin(stores, eq(orderFulfilments.storeId, stores.id)),
    db
      .select({
        orderId: orderItems.orderId,
        storeId: orderItems.storeId,
        quantity: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
      })
      .from(orderItems)
      .groupBy(orderItems.orderId, orderItems.storeId),
  ]);

  const itemCounts = new Map<string, number>();
  for (const row of itemRows) {
    if (row.storeId) itemCounts.set(row.orderId + ":" + row.storeId, row.quantity);
  }

  const byOrder = new Map<string, AdminOrderSlice[]>();
  for (const slice of slices) {
    const list = byOrder.get(slice.orderId) ?? [];
    list.push({
      storeId: slice.storeId,
      storeName: slice.storeName,
      status: slice.status,
      itemCount: itemCounts.get(slice.orderId + ":" + slice.storeId) ?? 0,
    });
    byOrder.set(slice.orderId, list);
  }
  return Object.fromEntries(byOrder);
}

export type AdminMetrics = {
  orders: number;
  ordersToday: number;
  openSlices: { status: string; count: number }[];
  lowStock: number;
};

/** The daily pulse an operator needs, beside the existing totals. */
export async function adminMetrics(): Promise<AdminMetrics> {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.orders);
  cacheTag(tags.products);

  const db = getDb();
  const [totals, today, sliceRows, lowStock] = await Promise.all([
    db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(orders),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(sql`${orders.createdAt} >= date_trunc('day', now())`),
    db
      .select({
        status: orderFulfilments.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(orderFulfilments)
      .where(inArray(orderFulfilments.status, ["processing", "packed", "shipped"]))
      .groupBy(orderFulfilments.status),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(products)
      .where(lte(products.stock, LOW_STOCK_THRESHOLD)),
  ]);

  return {
    orders: totals[0]?.count ?? 0,
    ordersToday: today[0]?.count ?? 0,
    openSlices: ["processing", "packed", "shipped"].map((status) => ({
      status,
      count: sliceRows.find((row) => row.status === status)?.count ?? 0,
    })),
    lowStock: lowStock[0]?.count ?? 0,
  };
}

export type StoreOrderStats = { orders: number; openSlices: number };

/** How much order traffic each store is carrying right now. */
export async function storeOrderStats(): Promise<Record<string, StoreOrderStats>> {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.orders);

  const rows = await getDb()
    .select({
      storeId: orderFulfilments.storeId,
      orders: sql<number>`count(distinct ${orderFulfilments.orderId})`.mapWith(Number),
      openSlices:
        sql<number>`count(*) filter (where ${orderFulfilments.status} in ('processing', 'packed', 'shipped'))`.mapWith(
          Number,
        ),
    })
    .from(orderFulfilments)
    .groupBy(orderFulfilments.storeId);

  const stats = new Map<string, StoreOrderStats>();
  for (const row of rows) {
    stats.set(row.storeId, { orders: row.orders, openSlices: row.openSlices });
  }
  return Object.fromEntries(stats);
}

export type ProfileActivity = {
  withAddress: string[];
  orderCounts: Record<string, number>;
};

/** A profile's saved address and order history, without loading either. */
export async function profileActivity(): Promise<ProfileActivity> {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.users);
  cacheTag(tags.orders);

  const db = getDb();
  const [addressRows, orderRows] = await Promise.all([
    db.select({ profileId: addresses.profileId }).from(addresses),
    db
      .select({ userId: orders.userId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(isNotNull(orders.userId))
      .groupBy(orders.userId),
  ]);

  const orderCounts = new Map<string, number>();
  for (const row of orderRows) {
    if (row.userId) orderCounts.set(row.userId, row.count);
  }
  return {
    withAddress: addressRows.map((row) => row.profileId),
    orderCounts: Object.fromEntries(orderCounts),
  };
}

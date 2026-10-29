import "server-only";

import { eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { addresses, orderFulfilments, orderItems, orders, products, stores } from "@/lib/db/schema";

/** Product stock at or below this is treated as low. */
export const LOW_STOCK_THRESHOLD = 5;

export type AdminOrderSlice = {
  storeId: string;
  storeName: string;
  status: string;
  itemCount: number;
};

/** Every store's slice of every order, keyed by order id. */
export async function adminOrderSlices(): Promise<Map<string, AdminOrderSlice[]>> {
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
  return byOrder;
}

export type AdminMetrics = {
  ordersToday: number;
  openSlices: { status: string; count: number }[];
  lowStock: number;
};

/** The daily pulse an operator needs, beside the existing totals. */
export async function adminMetrics(): Promise<AdminMetrics> {
  const db = getDb();
  const [today, sliceRows, lowStock] = await Promise.all([
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
export async function storeOrderStats(): Promise<Map<string, StoreOrderStats>> {
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
  return stats;
}

export type ProfileActivity = {
  withAddress: Set<string>;
  orderCounts: Map<string, number>;
};

/** A profile's saved address and order history, without loading either. */
export async function profileActivity(): Promise<ProfileActivity> {
  const db = getDb();
  const [addressRows, orderRows] = await Promise.all([
    db.select({ profileId: addresses.profileId }).from(addresses),
    db
      .select({ userId: orders.userId, count: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(isNotNull(orders.userId))
      .groupBy(orders.userId),
  ]);

  const withAddress = new Set(addressRows.map((row) => row.profileId));
  const orderCounts = new Map<string, number>();
  for (const row of orderRows) {
    if (row.userId) orderCounts.set(row.userId, row.count);
  }
  return { withAddress, orderCounts };
}

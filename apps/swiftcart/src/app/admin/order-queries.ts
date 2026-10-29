import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { lifetimes, tags } from "@/lib/cache";
import { orderFulfilments, orderItems, orders, stores } from "@/lib/db/schema";
import { orderStatus } from "@/lib/order-rollup";
import type { SliceStatus } from "@/lib/order-status";

export const ORDERS_PER_PAGE = 20;

export const ORDER_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
] as const;

export type OrderStatusFilter = (typeof ORDER_STATUS_FILTERS)[number]["value"];

export function isOrderStatusFilter(value: string): value is OrderStatusFilter {
  return ORDER_STATUS_FILTERS.some((filter) => filter.value === value);
}

export type AdminOrderSliceRow = {
  storeId: string;
  storeName: string;
  status: SliceStatus;
  itemCount: number;
};

export type AdminOrderItemRow = {
  id: string;
  storeId: string | null;
  storeName: string;
  productName: string;
  optionSummary: string | null;
  quantity: number;
  priceCents: number;
};

/** One table row: the order header, every store slice, and its line items. */
export type AdminOrderRow = {
  id: string;
  token: string;
  ref: string | null;
  placedOn: string;
  totalCents: number;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  address: string;
  slices: AdminOrderSliceRow[];
  items: AdminOrderItemRow[];
};

export type AdminOrderPage = {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pages: number;
};

const placedOnFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(key(row));
    if (list) list.push(row);
    else groups.set(key(row), [row]);
  }
  return groups;
}

/** Orders whose every slice is delivered (and that actually has slices). */
const completedSql = sql`exists (select 1 from ${orderFulfilments} where ${orderFulfilments.orderId} = ${orders.id}) and not exists (select 1 from ${orderFulfilments} where ${orderFulfilments.orderId} = ${orders.id} and ${orderFulfilments.status} <> 'delivered')`;

function sliceAtSql(status: string): SQL {
  return sql`exists (select 1 from ${orderFulfilments} where ${orderFulfilments.orderId} = ${orders.id} and ${orderFulfilments.status} = ${status})`;
}

/**
 * One page of the admin table, filtered and paged in Postgres. Slices and line
 * items for the page come back in two batched queries, so a row is complete for
 * the drawer without a second round trip.
 */
export async function listAdminOrders({
  q,
  status,
  page,
}: {
  q: string;
  status: OrderStatusFilter;
  page: number;
}): Promise<AdminOrderPage> {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.orders);
  cacheTag(tags.stores);

  const db = getDb();
  const current = Math.max(1, Math.trunc(page) || 1);
  const conditions: SQL[] = [];

  const term = q.trim();
  if (term) {
    const pattern = "%" + term.replace(/[\\%_]/g, (char) => "\\" + char) + "%";
    const match = or(
      ilike(orders.publicRef, pattern),
      ilike(orders.customerName, pattern),
      ilike(orders.customerEmail, pattern),
    );
    if (match) conditions.push(match);
  }
  if (status === "completed") conditions.push(completedSql);
  else if (status !== "all") conditions.push(sliceAtSql(status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRows, orderRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(where),
    db
      .select({
        id: orders.id,
        accessToken: orders.accessToken,
        publicRef: orders.publicRef,
        createdAt: orders.createdAt,
        totalCents: orders.totalCents,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        deliveryLine1: orders.deliveryLine1,
        deliveryLine2: orders.deliveryLine2,
        deliveryCity: orders.deliveryCity,
        deliveryRegion: orders.deliveryRegion,
        deliveryPostal: orders.deliveryPostal,
        deliveryCountry: orders.deliveryCountry,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(ORDERS_PER_PAGE)
      .offset((current - 1) * ORDERS_PER_PAGE),
  ]);

  const total = countRows[0]?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  if (orderRows.length === 0) return { rows: [], total, page: current, pages };

  const ids = orderRows.map((row) => row.id);
  const [sliceRows, itemRows] = await Promise.all([
    db
      .select({
        orderId: orderFulfilments.orderId,
        storeId: orderFulfilments.storeId,
        status: orderFulfilments.status,
        storeName: stores.name,
      })
      .from(orderFulfilments)
      .innerJoin(stores, eq(orderFulfilments.storeId, stores.id))
      .where(inArray(orderFulfilments.orderId, ids)),
    db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        storeId: orderItems.storeId,
        storeName: orderItems.storeName,
        productName: orderItems.productName,
        optionSummary: orderItems.optionSummary,
        quantity: orderItems.quantity,
        priceCents: orderItems.priceCents,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, ids)),
  ]);

  const itemCounts = new Map<string, number>();
  for (const item of itemRows) {
    const key = item.orderId + ":" + (item.storeId ?? "");
    itemCounts.set(key, (itemCounts.get(key) ?? 0) + item.quantity);
  }

  const slicesByOrder = groupBy(sliceRows, (row) => row.orderId);
  const itemsByOrder = groupBy(itemRows, (row) => row.orderId);

  const rows = orderRows.map((order) => {
    const slices = (slicesByOrder.get(order.id) ?? [])
      .map((slice) => ({
        storeId: slice.storeId,
        storeName: slice.storeName,
        status: slice.status as SliceStatus,
        itemCount: itemCounts.get(order.id + ":" + slice.storeId) ?? 0,
      }))
      .sort((a, b) => a.storeName.localeCompare(b.storeName));

    const items = (itemsByOrder.get(order.id) ?? [])
      .map((item) => ({
        id: item.id,
        storeId: item.storeId,
        storeName: item.storeName,
        productName: item.productName,
        optionSummary: item.optionSummary,
        quantity: item.quantity,
        priceCents: item.priceCents,
      }))
      .sort(
        (a, b) =>
          a.storeName.localeCompare(b.storeName) || a.productName.localeCompare(b.productName),
      );

    return {
      id: order.id,
      token: order.accessToken,
      ref: order.publicRef,
      placedOn: placedOnFormat.format(order.createdAt),
      totalCents: order.totalCents,
      status: orderStatus(slices.map((slice) => slice.status)),
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      address: [
        order.deliveryLine1,
        order.deliveryLine2,
        order.deliveryCity,
        order.deliveryRegion,
        order.deliveryPostal,
        order.deliveryCountry,
      ]
        .filter((part): part is string => Boolean(part))
        .join(", "),
      slices,
      items,
    };
  });

  return { rows, total, page: current, pages };
}

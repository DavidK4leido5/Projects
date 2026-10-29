import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orderEvents, orderFulfilments, orderItems, orders, stores } from "@/lib/db/schema";
import type { getActor } from "@/lib/auth/guards";
import { SLICE_FLOW, rollup, type SliceStatus } from "@/lib/order-status";

export { SLICE_FLOW, rollup, type SliceStatus } from "@/lib/order-status";

export type Slice = {
  storeId: string;
  storeName: string;
  status: SliceStatus;
  itemCount: number;
};

export type TrackRow = {
  id: string;
  token: string;
  ref: string | null;
  createdAt: Date;
  totalCents: number;
  status: string;
  role: "user" | "store" | "admin";
  slices: Slice[];
};

type Actor = Awaited<ReturnType<typeof getActor>>;

export function canAdvance(from: SliceStatus, to: SliceStatus): boolean {
  if (to === "cancelled") return from === "processing";
  const index = SLICE_FLOW.indexOf(from as (typeof SLICE_FLOW)[number]);
  const next = SLICE_FLOW.indexOf(to as (typeof SLICE_FLOW)[number]);
  return index >= 0 && next === index + 1;
}

async function slicesFor(orderIds: string[]): Promise<Map<string, Slice[]>> {
  if (orderIds.length === 0) return new Map();

  const rows = await getDb()
    .select({
      orderId: orderFulfilments.orderId,
      storeId: orderFulfilments.storeId,
      status: orderFulfilments.status,
      storeName: stores.name,
    })
    .from(orderFulfilments)
    .innerJoin(stores, eq(orderFulfilments.storeId, stores.id))
    .where(inArray(orderFulfilments.orderId, orderIds));

  const counts = await getDb()
    .select({
      orderId: orderItems.orderId,
      storeId: orderItems.storeId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  const byOrder = new Map<string, Slice[]>();
  for (const row of rows) {
    const list = byOrder.get(row.orderId) ?? [];
    const itemCount = counts
      .filter((item) => item.orderId === row.orderId && item.storeId === row.storeId)
      .reduce((total, item) => total + item.quantity, 0);
    list.push({
      storeId: row.storeId,
      storeName: row.storeName,
      status: row.status as SliceStatus,
      itemCount,
    });
    byOrder.set(row.orderId, list);
  }
  return byOrder;
}

/** Rows the actor is allowed to see, scoped by role. */
export async function listTracking(actor: Actor): Promise<TrackRow[]> {
  const db = getDb();

  if (actor.kind === "anonymous") return [];

  let orderRows: {
    id: string;
    accessToken: string;
    publicRef: string | null;
    createdAt: Date;
    totalCents: number;
  }[];

  if (actor.kind === "admin") {
    orderRows = await db
      .select({
        id: orders.id,
        accessToken: orders.accessToken,
        publicRef: orders.publicRef,
        createdAt: orders.createdAt,
        totalCents: orders.totalCents,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(100);
  } else if (actor.kind === "store") {
    const mine = await db
      .select({ orderId: orderFulfilments.orderId })
      .from(orderFulfilments)
      .where(eq(orderFulfilments.storeId, actor.store.id));
    const ids = [...new Set(mine.map((row) => row.orderId))];
    if (ids.length === 0) return [];
    orderRows = await db
      .select({
        id: orders.id,
        accessToken: orders.accessToken,
        publicRef: orders.publicRef,
        createdAt: orders.createdAt,
        totalCents: orders.totalCents,
      })
      .from(orders)
      .where(inArray(orders.id, ids))
      .orderBy(desc(orders.createdAt));
  } else {
    orderRows = await db
      .select({
        id: orders.id,
        accessToken: orders.accessToken,
        publicRef: orders.publicRef,
        createdAt: orders.createdAt,
        totalCents: orders.totalCents,
      })
      .from(orders)
      .where(eq(orders.userId, actor.profile.id))
      .orderBy(desc(orders.createdAt));
  }

  const byOrder = await slicesFor(orderRows.map((row) => row.id));

  return orderRows.map((row) => {
    const all = byOrder.get(row.id) ?? [];
    const visible =
      actor.kind === "store" ? all.filter((slice) => slice.storeId === actor.store.id) : all;
    return {
      id: row.id,
      token: row.accessToken,
      ref: row.publicRef,
      createdAt: row.createdAt,
      totalCents: row.totalCents,
      status: rollup(visible.map((slice) => slice.status)),
      role: actor.kind,
      slices: visible,
    };
  });
}

export async function getTrackingOrder(token: string, actor: Actor) {
  if (actor.kind === "anonymous") return null;

  const rows = await getDb().select().from(orders).where(eq(orders.accessToken, token)).limit(1);
  const order = rows[0];
  if (!order) return null;

  if (actor.kind === "user" && order.userId !== actor.profile.id) return null;

  const byOrder = await slicesFor([order.id]);
  const allSlices = byOrder.get(order.id) ?? [];
  const slices =
    actor.kind === "store"
      ? allSlices.filter((slice) => slice.storeId === actor.store.id)
      : allSlices;

  if (actor.kind === "store" && slices.length === 0) return null;

  const items = await getDb().select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const visibleItems =
    actor.kind === "store" ? items.filter((item) => item.storeId === actor.store.id) : items;

  const events = await getDb()
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, order.id))
    .orderBy(desc(orderEvents.createdAt));

  return {
    order: {
      id: order.id,
      token: order.accessToken,
      ref: order.publicRef,
      createdAt: order.createdAt,
      totalCents: order.totalCents,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      address: [
        order.deliveryLine1,
        order.deliveryLine2,
        order.deliveryCity,
        order.deliveryRegion,
        order.deliveryPostal,
        order.deliveryCountry,
      ]
        .filter(Boolean)
        .join(", "),
    },
    status: rollup(slices.map((slice) => slice.status)),
    slices,
    items: visibleItems,
    events:
      actor.kind === "user"
        ? []
        : events.filter(
            (event) =>
              actor.kind === "admin" || slices.some((slice) => slice.storeId === event.storeId),
          ),
    role: actor.kind,
  };
}

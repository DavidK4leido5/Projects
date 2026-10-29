"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { getDb } from "@/lib/db";
import {
  orderEvents,
  orderFulfilments,
  orderItems,
  orders,
  productVariants,
} from "@/lib/db/schema";
import { getActor } from "@/lib/auth/guards";
import { tags } from "@/lib/cache";
import { SLICE_FLOW, canAdvance, type SliceStatus } from "@/features/orders/tracking";

export type TrackResult = { ok: true } | { ok: false; error: string };

function isStatus(value: string): value is SliceStatus {
  return value === "cancelled" || (SLICE_FLOW as readonly string[]).includes(value);
}

/**
 * Moves one store slice forward. A store may only move its own slice; an admin
 * may move any slice and must name the store.
 */
export async function setFulfilmentStatus(
  token: string,
  to: string,
  note?: string,
  storeId?: string,
): Promise<TrackResult> {
  const actor = await getActor();
  if (actor.kind !== "store" && actor.kind !== "admin") {
    return { ok: false, error: "Only a store or an admin can change fulfilment." };
  }
  if (!isStatus(to)) return { ok: false, error: "Unknown status." };

  const db = getDb();
  const orderRows = await db.select().from(orders).where(eq(orders.accessToken, token)).limit(1);
  const order = orderRows[0];
  if (!order) return { ok: false, error: "Order not found." };

  const targetStore = actor.kind === "store" ? actor.store.id : storeId;
  if (!targetStore) return { ok: false, error: "Choose which store to update." };

  const sliceRows = await db
    .select()
    .from(orderFulfilments)
    .where(and(eq(orderFulfilments.orderId, order.id), eq(orderFulfilments.storeId, targetStore)))
    .limit(1);
  const slice = sliceRows[0];
  if (!slice) return { ok: false, error: "Order not found." };

  const from = slice.status as SliceStatus;
  if (from === to) return { ok: true };
  if (!canAdvance(from, to)) {
    return { ok: false, error: "That step is not allowed from " + from + "." };
  }
  if (to === "cancelled" && !(note ?? "").trim()) {
    return { ok: false, error: "A cancellation needs a reason." };
  }

  await db
    .update(orderFulfilments)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(orderFulfilments.id, slice.id));

  if (to === "cancelled") {
    const lines = await db
      .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, order.id), eq(orderItems.storeId, targetStore)));

    for (const line of lines) {
      if (!line.variantId) continue;
      await db
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${line.quantity}` })
        .where(eq(productVariants.id, line.variantId));
    }
    // The stock coming back changes what shoppers can buy.
    updateTag(tags.products);
  }

  await db.insert(orderEvents).values({
    orderId: order.id,
    storeId: targetStore,
    actorId: actor.profile.id,
    actorRole: actor.kind,
    fromStatus: from,
    toStatus: to,
    note: (note ?? "").trim() || null,
  });

  updateTag(tags.orders);
  updateTag(tags.order(order.id));
  revalidatePath("/track");
  revalidatePath("/dashboard/orders");
  revalidatePath("/admin/orders");
  return { ok: true };
}

/** Adds an internal note without changing status. */
export async function addOrderNote(token: string, note: string): Promise<TrackResult> {
  const actor = await getActor();
  if (actor.kind !== "store" && actor.kind !== "admin") {
    return { ok: false, error: "Not allowed." };
  }
  if (!note.trim()) return { ok: false, error: "Write something first." };

  const db = getDb();
  const orderRows = await db.select().from(orders).where(eq(orders.accessToken, token)).limit(1);
  const order = orderRows[0];
  if (!order) return { ok: false, error: "Order not found." };

  const storeId = actor.kind === "store" ? actor.store.id : null;

  await db.insert(orderEvents).values({
    orderId: order.id,
    storeId,
    actorId: actor.profile.id,
    actorRole: actor.kind,
    fromStatus: null,
    toStatus: "note",
    note: note.trim(),
  });

  updateTag(tags.order(order.id));
  revalidatePath("/track");
  return { ok: true };
}

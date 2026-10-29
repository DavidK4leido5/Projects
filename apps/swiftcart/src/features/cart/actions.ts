"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addToCart(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const productId = text(formData, "productId");
  if (!productId) return;

  await getDb()
    .insert(cartItems)
    .values({ userId: actor.profile.id, productId, quantity: 1 })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity: sql`least(${cartItems.quantity} + 1, 99)` },
    });

  revalidatePath("/cart");
  revalidatePath("/");
}

export async function setQuantity(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const id = text(formData, "id");
  const requested = Number(text(formData, "quantity"));
  if (!id || !Number.isFinite(requested)) return;

  const quantity = Math.min(Math.max(Math.trunc(requested), 0), 99);

  if (quantity === 0) {
    await getDb()
      .delete(cartItems)
      .where(and(eq(cartItems.id, id), eq(cartItems.userId, actor.profile.id)));
  } else {
    await getDb()
      .update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.id, id), eq(cartItems.userId, actor.profile.id)));
  }

  revalidatePath("/cart");
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const id = text(formData, "id");
  if (!id) return;

  await getDb()
    .delete(cartItems)
    .where(and(eq(cartItems.id, id), eq(cartItems.userId, actor.profile.id)));

  revalidatePath("/cart");
}

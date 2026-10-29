"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { cartItems, productVariants } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function variantStock(
  variantId: string,
): Promise<{ productId: string; stock: number } | null> {
  const rows = await getDb()
    .select({ productId: productVariants.productId, stock: productVariants.stock })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);
  return rows[0] ?? null;
}

export async function addToCart(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const variantId = text(formData, "variantId");
  if (!variantId) return;

  const variant = await variantStock(variantId);
  if (!variant || variant.stock <= 0) return;

  await getDb()
    .insert(cartItems)
    .values({ userId: actor.profile.id, productId: variant.productId, variantId, quantity: 1 })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.variantId],
      set: { quantity: sql`least(${cartItems.quantity} + 1, ${variant.stock})` },
    });

  revalidatePath("/cart");
  revalidatePath("/");
}

export async function setQuantity(formData: FormData): Promise<void> {
  const actor = await requireUser();
  const id = text(formData, "id");
  const requested = Number(text(formData, "quantity"));
  if (!id || !Number.isFinite(requested)) return;

  const rows = await getDb()
    .select({ variantId: cartItems.variantId })
    .from(cartItems)
    .where(and(eq(cartItems.id, id), eq(cartItems.userId, actor.profile.id)))
    .limit(1);

  const row = rows[0];
  if (!row) return;

  const variant = await variantStock(row.variantId);
  const stock = Math.max(variant?.stock ?? 0, 1);
  const quantity = Math.min(Math.max(Math.trunc(requested), 0), stock);

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

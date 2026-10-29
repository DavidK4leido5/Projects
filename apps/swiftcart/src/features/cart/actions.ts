"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { cartItems, productVariants } from "@/lib/db/schema";
import { ensureCart, getCartId, mergeGuestCart } from "@/lib/cart";

export type CartResult = { ok: true } | { ok: false; error: string };

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

/** Runs right after sign-in so the guest cart follows the visitor in. */
export async function mergeCartAfterLogin(): Promise<void> {
  await mergeGuestCart();
  revalidatePath("/cart");
}

export async function addToCart(variantId: string): Promise<CartResult> {
  if (!variantId) return { ok: false, error: "Missing variant." };

  const variant = await variantStock(variantId);
  if (!variant) return { ok: false, error: "That item is no longer available." };
  if (variant.stock <= 0) return { ok: false, error: "Out of stock." };

  const cartId = await ensureCart();

  await getDb()
    .insert(cartItems)
    .values({ cartId, productId: variant.productId, variantId, quantity: 1 })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: { quantity: sql`least(${cartItems.quantity} + 1, ${variant.stock})` },
    });

  revalidatePath("/cart");
  return { ok: true };
}

export async function setQuantity(id: string, quantity: number): Promise<CartResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, error: "Your cart is empty." };

  const rows = await getDb()
    .select({ variantId: cartItems.variantId })
    .from(cartItems)
    .where(and(eq(cartItems.id, id), eq(cartItems.cartId, cartId)))
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, error: "That line is gone." };

  const variant = await variantStock(row.variantId);
  const stock = Math.max(variant?.stock ?? 0, 1);
  const wanted = Math.min(Math.max(Math.trunc(quantity), 0), stock);

  if (wanted === 0) {
    await getDb()
      .delete(cartItems)
      .where(and(eq(cartItems.id, id), eq(cartItems.cartId, cartId)));
  } else {
    await getDb()
      .update(cartItems)
      .set({ quantity: wanted })
      .where(and(eq(cartItems.id, id), eq(cartItems.cartId, cartId)));
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeFromCart(id: string): Promise<CartResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, error: "Your cart is empty." };

  await getDb()
    .delete(cartItems)
    .where(and(eq(cartItems.id, id), eq(cartItems.cartId, cartId)));
  revalidatePath("/cart");
  return { ok: true };
}

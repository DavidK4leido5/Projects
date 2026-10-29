"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { cartItems, orderItems, orders, productVariants, products } from "@/lib/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { getCart } from "@/features/cart/queries";
import { tags } from "@/lib/cache";

/** "Size: M, Color: Bone" for the order snapshot. */
function summarise(options: Record<string, string>): string | null {
  const entries = Object.entries(options);
  if (entries.length === 0) return null;
  return entries.map(([name, value]) => name + ": " + value).join(", ");
}

/**
 * Turns the cart into an order.
 *
 * Stock is claimed on the variant with a conditional update per row, so two
 * shoppers cannot both take the last unit of one combination. The HTTP driver
 * has no transactions, so a failed claim is compensated by putting the earlier
 * claims back. That leaves a small window where a crash mid-loop under-counts
 * stock, which is survivable; it never oversells.
 */
export async function placeOrder(_formData: FormData): Promise<void> {
  const actor = await requireUser();
  const { items, totalCents } = await getCart(actor.profile.id);
  if (items.length === 0) redirect("/cart");

  const db = getDb();
  const claimed: Array<{ variantId: string; quantity: number }> = [];

  for (const item of items) {
    const updated = await db
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
      .where(and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity)))
      .returning({ id: productVariants.id });

    if (updated.length === 0) {
      for (const done of claimed) {
        await db
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} + ${done.quantity}` })
          .where(eq(productVariants.id, done.variantId));
      }
      redirect("/cart?error=stock");
    }

    claimed.push({ variantId: item.variantId, quantity: item.quantity });
  }

  // Products keep a rolled-up stock number for cards and filters.
  for (const item of items) {
    await db
      .update(products)
      .set({ stock: sql`greatest(${products.stock} - ${item.quantity}, 0)` })
      .where(eq(products.id, item.productId));
  }

  const inserted = await db
    .insert(orders)
    .values({ userId: actor.profile.id, customerEmail: actor.profile.email, totalCents })
    .returning({ id: orders.id });

  const order = inserted[0];
  if (!order) redirect("/cart?error=order");

  await db.insert(orderItems).values(
    items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      optionSummary: summarise(item.variantOptions),
      productName: item.productName,
      storeName: item.storeName,
      priceCents: item.priceCents,
      quantity: item.quantity,
    })),
  );

  await db.delete(cartItems).where(eq(cartItems.userId, actor.profile.id));

  updateTag(tags.orders);
  updateTag(tags.products);
  redirect("/orders/" + order.id);
}

export async function setOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;
  if (status !== "placed" && status !== "fulfilled" && status !== "cancelled") return;

  await getDb().update(orders).set({ status }).where(eq(orders.id, id));
  updateTag(tags.orders);
  updateTag(tags.order(id));
}

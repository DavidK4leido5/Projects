"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { cartItems, orderItems, orders, products } from "@/lib/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { getCart } from "@/features/cart/queries";

/**
 * Turns the cart into an order.
 *
 * Stock is claimed with a conditional update per row, so two shoppers cannot
 * both take the last unit. The HTTP driver has no transactions, so a failed
 * claim is compensated by putting the earlier claims back. That leaves a small
 * window where a crash mid-loop under-counts stock, which is survivable; it
 * never oversells.
 */
export async function placeOrder(_formData: FormData): Promise<void> {
  const actor = await requireUser();
  const { items, totalCents } = await getCart(actor.profile.id);
  if (items.length === 0) redirect("/cart");

  const db = getDb();
  const claimed: Array<{ productId: string; quantity: number }> = [];

  for (const item of items) {
    const updated = await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${item.quantity}` })
      .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
      .returning({ id: products.id });

    if (updated.length === 0) {
      for (const done of claimed) {
        await db
          .update(products)
          .set({ stock: sql`${products.stock} + ${done.quantity}` })
          .where(eq(products.id, done.productId));
      }
      redirect("/cart?error=stock");
    }

    claimed.push({ productId: item.productId, quantity: item.quantity });
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
      productName: item.productName,
      storeName: item.storeName,
      priceCents: item.priceCents,
      quantity: item.quantity,
    })),
  );

  await db.delete(cartItems).where(eq(cartItems.userId, actor.profile.id));

  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  redirect("/orders/" + order.id);
}

export async function setOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;
  if (status !== "placed" && status !== "fulfilled" && status !== "cancelled") return;

  await getDb().update(orders).set({ status }).where(eq(orders.id, id));
  revalidatePath("/admin/orders");
  revalidatePath("/orders/" + id);
}

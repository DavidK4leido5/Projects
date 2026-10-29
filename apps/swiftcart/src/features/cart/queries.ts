import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cartItems, productImages, products, stores } from "@/lib/db/schema";

export async function getCart(userId: string) {
  const rows = await getDb()
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      priceCents: products.priceCents,
      coverKey: sql<
        string | null
      >`(select pi.key from ${productImages} pi where pi.product_id = ${products.id} order by pi.position limit 1)`,
      stock: products.stock,
      storeName: stores.name,
      storeSlug: stores.slug,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(cartItems.createdAt);

  const totalCents = rows.reduce((sum, row) => sum + row.priceCents * row.quantity, 0);
  const itemCount = rows.reduce((sum, row) => sum + row.quantity, 0);

  return { items: rows, totalCents, itemCount };
}

export async function cartCount(userId: string): Promise<number> {
  const { itemCount } = await getCart(userId);
  return itemCount;
}

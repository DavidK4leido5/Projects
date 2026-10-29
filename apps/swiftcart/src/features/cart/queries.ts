import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cartItems, productImages, productVariants, products, stores } from "@/lib/db/schema";

export async function getCart(cartId: string | null) {
  if (!cartId) return { items: [], totalCents: 0, itemCount: 0 };

  const rows = await getDb()
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      variantId: productVariants.id,
      variantOptions: productVariants.options,
      variantImageKey: productVariants.imageKey,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      priceCents:
        sql<number>`coalesce(${productVariants.priceCents}, ${products.priceCents})`.mapWith(
          Number,
        ),
      coverKey: sql<
        string | null
      >`(select pi.key from ${productImages} pi where pi.product_id = ${products.id} order by pi.position limit 1)`,
      stock: productVariants.stock,
      storeName: stores.name,
      storeSlug: stores.slug,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(cartItems.createdAt);

  const totalCents = rows.reduce((sum, row) => sum + row.priceCents * row.quantity, 0);
  const itemCount = rows.reduce((sum, row) => sum + row.quantity, 0);

  return { items: rows, totalCents, itemCount };
}

export async function cartCount(cartId: string | null): Promise<number> {
  if (!cartId) return 0;
  const rows = await getDb()
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return rows.reduce((sum, row) => sum + row.quantity, 0);
}

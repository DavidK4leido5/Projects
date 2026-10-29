"use server";

import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { requireStoreOwner } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { productVariants, products } from "@/lib/db/schema";
import { tags } from "@/lib/cache";

export type StockResult = { ok: true } | { ok: false; error: string };

const MAX_STOCK = 100_000;

/** Sets one variant's stock, scoped to the store that owns its product. */
export async function updateVariantStock(variantId: string, stock: number): Promise<StockResult> {
  const actor = await requireStoreOwner();

  if (!variantId) return { ok: false, error: "Missing variant id." };
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    return { ok: false, error: "Stock must be a whole number from 0 to 100,000." };
  }

  const owned = await getDb()
    .select({ id: productVariants.id, productId: productVariants.productId })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(productVariants.id, variantId), eq(products.storeId, actor.store.id)))
    .limit(1);

  const variant = owned[0];
  if (!variant) return { ok: false, error: "Item not found." };

  await getDb().update(productVariants).set({ stock }).where(eq(productVariants.id, variant.id));

  // The product's own stock is the sum of its variants, the same rule the
  // item editor applies. Keep the storefront counts in step.
  const totals = await getDb()
    .select({ total: sql<number>`coalesce(sum(${productVariants.stock}), 0)`.mapWith(Number) })
    .from(productVariants)
    .where(eq(productVariants.productId, variant.productId));

  await getDb()
    .update(products)
    .set({ stock: totals[0]?.total ?? 0 })
    .where(eq(products.id, variant.productId));

  updateTag(tags.inventory(actor.store.id));
  updateTag(tags.products);
  updateTag(tags.store(actor.store.slug));
  return { ok: true };
}

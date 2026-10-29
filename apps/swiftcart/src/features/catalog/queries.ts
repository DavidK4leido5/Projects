import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { products, stores } from "@/lib/db/schema";

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  stock: products.stock,
  imageKey: products.imageKey,
  createdAt: products.createdAt,
  storeName: stores.name,
  storeSlug: stores.slug,
  storeTagline: stores.tagline,
};

export type ProductCardModel = Awaited<ReturnType<typeof listProducts>>[number];

export async function listProducts(limit = 24) {
  return getDb()
    .select(productColumns)
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}

export async function getProductBySlug(slug: string) {
  const rows = await getDb()
    .select(productColumns)
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(eq(products.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

export async function getStoreBySlug(slug: string) {
  const rows = await getDb().select().from(stores).where(eq(stores.slug, slug)).limit(1);
  const store = rows[0];
  if (!store) return null;

  const items = await getDb()
    .select(productColumns)
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(eq(products.storeId, store.id))
    .orderBy(desc(products.createdAt));

  return { store, products: items };
}

export async function listStoreProducts(storeId: string) {
  return getDb()
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(desc(products.createdAt));
}

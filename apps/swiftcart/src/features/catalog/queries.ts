import "server-only";

import { and, asc, desc, eq, gt, ilike, isNotNull, or, sql } from "drizzle-orm";
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

export type CatalogFilters = {
  q?: string;
  store?: string;
  sort?: "new" | "price-asc" | "price-desc";
  inStock?: boolean;
  page?: number;
  perPage?: number;
};

export async function listProducts(limit = 24) {
  return getDb()
    .select(productColumns)
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}

export async function searchProducts(filters: CatalogFilters) {
  const perPage = Math.min(Math.max(filters.perPage ?? 12, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);

  const conditions = [];
  const term = filters.q?.trim();
  if (term) {
    const pattern = "%" + term + "%";
    conditions.push(
      or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        ilike(stores.name, pattern),
      ),
    );
  }
  if (filters.store) conditions.push(eq(stores.slug, filters.store));
  if (filters.inStock) conditions.push(gt(products.stock, 0));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    filters.sort === "price-asc"
      ? asc(products.priceCents)
      : filters.sort === "price-desc"
        ? desc(products.priceCents)
        : desc(products.createdAt);

  const counted = await getDb()
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(where);

  const total = counted[0]?.total ?? 0;

  const items = await getDb()
    .select(productColumns)
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(where)
    .orderBy(orderBy)
    .limit(perPage)
    .offset((page - 1) * perPage);

  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export type HeroSlideModel = {
  id: string;
  slug: string;
  name: string;
  imageKey: string;
};

/** Featured products that have artwork, newest first. These drive the hero. */
export async function listFeaturedProducts(limit = 8): Promise<HeroSlideModel[]> {
  const rows = await getDb()
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      imageKey: products.imageKey,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(and(eq(products.featured, true), isNotNull(products.imageKey)))
    .orderBy(desc(products.createdAt))
    .limit(limit);

  // The where clause guarantees a key; the cast keeps that promise in the type.
  return rows.flatMap((row) => (row.imageKey ? [{ ...row, imageKey: row.imageKey }] : []));
}

export async function listStoreFacets() {
  return getDb()
    .select({
      slug: stores.slug,
      name: stores.name,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
    })
    .from(stores)
    .leftJoin(products, eq(products.storeId, stores.id))
    .groupBy(stores.slug, stores.name)
    .orderBy(asc(stores.name));
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

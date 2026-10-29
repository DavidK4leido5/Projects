import "server-only";

import { and, asc, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { productImages, products, stores } from "@/lib/db/schema";
import { lifetimes, tags } from "@/lib/cache";

const productColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  stock: products.stock,
  featured: products.featured,
  coverKey: sql<
    string | null
  >`(select pi.key from ${productImages} pi where pi.product_id = ${products.id} order by pi.position limit 1)`,
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

/** Shared by every visitor, so it is cached and tagged rather than reloaded. */
export async function listProducts(limit = 24) {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.products);

  return getDb()
    .select(productColumns)
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}

export async function searchProducts(filters: CatalogFilters) {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.products);
  cacheTag(tags.stores);

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
  coverKey: string;
};

/** Featured products that have artwork, newest first. These drive the hero. */
export async function listFeaturedProducts(limit = 8): Promise<HeroSlideModel[]> {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.featured);
  cacheTag(tags.products);

  const rows = await getDb()
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      coverKey: sql<
        string | null
      >`(select pi.key from ${productImages} pi where pi.product_id = ${products.id} order by pi.position limit 1)`,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(
      and(
        eq(products.featured, true),
        sql`exists (select 1 from ${productImages} pi where pi.product_id = ${products.id})`,
      ),
    )
    .orderBy(desc(products.createdAt))
    .limit(limit);

  return rows.flatMap((row) => (row.coverKey ? [{ ...row, coverKey: row.coverKey }] : []));
}

export async function listStoreFacets() {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.stores);

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
  "use cache";
  cacheLife(lifetimes.detail);
  cacheTag(tags.product(slug));
  cacheTag(tags.products);

  const rows = await getDb()
    .select(productColumns)
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(eq(products.slug, slug))
    .limit(1);

  const product = rows[0];
  if (!product) return null;

  const gallery = await getDb()
    .select({ key: productImages.key })
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(productImages.position);

  return { ...product, images: gallery.map((image) => image.key) };
}

export async function getStoreBySlug(slug: string) {
  "use cache";
  cacheLife(lifetimes.detail);
  cacheTag(tags.store(slug));
  cacheTag(tags.products);

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

/**
 * Deliberately not cached: it is read by the seller's own dashboard, which is
 * per-user and would poison a shared cache entry.
 */
export async function listStoreProducts(storeId: string) {
  return getDb()
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(desc(products.createdAt));
}

/** Prebuild paths for the on-demand routes. */
export async function listProductSlugs() {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.products);

  const rows = await getDb().select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}

export async function listStoreSlugs() {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.stores);

  const rows = await getDb().select({ slug: stores.slug }).from(stores);
  return rows.map((row) => row.slug);
}

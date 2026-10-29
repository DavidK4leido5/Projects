import "server-only";

import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productImages, productVariants, products, stores } from "@/lib/db/schema";
import type { ProductProperty, VariantOptions } from "@/lib/db/schema";

export type StoreVariant = {
  id: string;
  options: VariantOptions;
  priceCents: number | null;
  stock: number;
  sku: string | null;
  imageKey: string | null;
};

export type StoreItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  featured: boolean;
  bannerWideKey: string | null;
  bannerTallKey: string | null;
  slug: string;
  images: string[];
  properties: ProductProperty[];
  variants: StoreVariant[];
};

type ProductDetails = {
  images: Map<string, string[]>;
  variants: Map<string, StoreVariant[]>;
};

async function loadProductDetails(ids: string[]): Promise<ProductDetails> {
  const empty: ProductDetails = { images: new Map(), variants: new Map() };
  if (ids.length === 0) return empty;

  const [images, variants] = await Promise.all([
    getDb()
      .select({ productId: productImages.productId, key: productImages.key })
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(productImages.position),
    getDb()
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, ids))
      .orderBy(asc(productVariants.position)),
  ]);

  const imagesByProduct = new Map<string, string[]>();
  for (const image of images) {
    const list = imagesByProduct.get(image.productId) ?? [];
    list.push(image.key);
    imagesByProduct.set(image.productId, list);
  }

  const variantsByProduct = new Map<string, StoreVariant[]>();
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push({
      id: variant.id,
      options: variant.options,
      priceCents: variant.priceCents,
      stock: variant.stock,
      sku: variant.sku,
      imageKey: variant.imageKey,
    });
    variantsByProduct.set(variant.productId, list);
  }

  return { images: imagesByProduct, variants: variantsByProduct };
}

/** The seller's own catalogue, with previews, properties, and every variant. */
export async function listStoreItems(storeId: string): Promise<StoreItem[]> {
  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(desc(products.createdAt));

  if (rows.length === 0) return [];

  const details = await loadProductDetails(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    stock: row.stock,
    featured: row.featured,
    bannerWideKey: row.bannerWideKey,
    bannerTallKey: row.bannerTallKey,
    slug: row.slug,
    images: details.images.get(row.id) ?? [],
    properties: row.properties ?? [],
    variants: details.variants.get(row.id) ?? [],
  }));
}

export type ProductScope = "store" | "admin";

export type ProductSort = "new" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

/** A table row, plus the store it belongs to for the admin view. */
export type ProductListItem = StoreItem & {
  category: string | null;
  storeId: string;
  storeName: string;
  storeSlug: string;
};

export type ListProductsPageArgs = {
  scope: ProductScope;
  storeId?: string;
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

export type ProductsPageResult = {
  items: ProductListItem[];
  total: number;
  pages: number;
  page: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One page of products for either scope. Store scope is always pinned to the
 * seller's store; admin scope can filter by any store. Not cached: both callers
 * sit behind an auth guard.
 */
export async function listProductsPage(args: ListProductsPageArgs): Promise<ProductsPageResult> {
  const perPage = Math.min(Math.max(Math.trunc(args.perPage ?? 20), 1), 100);
  const requestedPage = Math.max(Math.trunc(args.page ?? 1), 1);
  const term = args.q?.trim() ?? "";
  const category = args.category?.trim() ?? "";

  const conditions = [];

  if (args.scope === "store") {
    if (!args.storeId) return { items: [], total: 0, pages: 1, page: 1 };
    conditions.push(eq(products.storeId, args.storeId));
  } else if (args.storeId) {
    // The value comes from a URL; never hand a bad UUID to Postgres.
    if (!UUID.test(args.storeId)) return { items: [], total: 0, pages: 1, page: 1 };
    conditions.push(eq(products.storeId, args.storeId));
  }

  if (term) {
    const pattern = "%" + term + "%";
    conditions.push(
      args.scope === "admin"
        ? or(
            ilike(products.name, pattern),
            ilike(products.description, pattern),
            ilike(stores.name, pattern),
          )
        : or(ilike(products.name, pattern), ilike(products.description, pattern)),
    );
  }

  if (category) conditions.push(eq(products.category, category));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    args.sort === "price-asc"
      ? [asc(products.priceCents), desc(products.createdAt)]
      : args.sort === "price-desc"
        ? [desc(products.priceCents), desc(products.createdAt)]
        : args.sort === "stock-asc"
          ? [asc(products.stock), desc(products.createdAt)]
          : args.sort === "stock-desc"
            ? [desc(products.stock), desc(products.createdAt)]
            : [desc(products.createdAt)];

  const counted = await getDb()
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(where);

  const total = counted[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, pages);

  const rows = await getDb()
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      priceCents: products.priceCents,
      stock: products.stock,
      featured: products.featured,
      bannerWideKey: products.bannerWideKey,
      bannerTallKey: products.bannerTallKey,
      slug: products.slug,
      category: products.category,
      properties: products.properties,
      storeId: products.storeId,
      storeName: stores.name,
      storeSlug: stores.slug,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(perPage)
    .offset((page - 1) * perPage);

  const details = await loadProductDetails(rows.map((row) => row.id));

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCents: row.priceCents,
      stock: row.stock,
      featured: row.featured,
      bannerWideKey: row.bannerWideKey,
      bannerTallKey: row.bannerTallKey,
      slug: row.slug,
      category: row.category,
      properties: row.properties ?? [],
      storeId: row.storeId,
      storeName: row.storeName,
      storeSlug: row.storeSlug,
      images: details.images.get(row.id) ?? [],
      variants: details.variants.get(row.id) ?? [],
    })),
    total,
    pages,
    page,
  };
}

/** Distinct non-null categories, optionally narrowed to one store. */
export async function listProductCategories(storeId?: string): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ category: products.category })
    .from(products)
    .where(storeId ? eq(products.storeId, storeId) : undefined)
    .orderBy(asc(products.category));

  return rows.flatMap((row) => (row.category ? [row.category] : []));
}

/** Store choices for the admin-only store filter. */
export async function listStoreOptions(): Promise<{ id: string; name: string }[]> {
  return getDb()
    .select({ id: stores.id, name: stores.name })
    .from(stores)
    .orderBy(asc(stores.name));
}

/** Counts and stock value for the dashboard cards, without loading every row. */
export async function storeProductStats(storeId: string) {
  const rows = await getDb()
    .select({
      items: sql<number>`count(*)`.mapWith(Number),
      stockValueCents:
        sql<number>`coalesce(sum(${products.priceCents} * ${products.stock}), 0)`.mapWith(Number),
      featured: sql<number>`count(*) filter (where ${products.featured})`.mapWith(Number),
    })
    .from(products)
    .where(eq(products.storeId, storeId));

  return rows[0] ?? { items: 0, stockValueCents: 0, featured: 0 };
}

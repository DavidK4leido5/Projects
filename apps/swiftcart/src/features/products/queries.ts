import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productImages, productVariants, products } from "@/lib/db/schema";
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

/** The seller's own catalogue, with previews, properties, and every variant. */
export async function listStoreItems(storeId: string): Promise<StoreItem[]> {
  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(desc(products.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

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
    images: imagesByProduct.get(row.id) ?? [],
    properties: row.properties ?? [],
    variants: variantsByProduct.get(row.id) ?? [],
  }));
}

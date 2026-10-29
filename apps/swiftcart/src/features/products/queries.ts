import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";

export type StoreItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  featured: boolean;
  slug: string;
  images: string[];
};

/** The seller's own catalogue, with every preview in position order. */
export async function listStoreItems(storeId: string): Promise<StoreItem[]> {
  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .orderBy(desc(products.createdAt));

  if (rows.length === 0) return [];

  const images = await getDb()
    .select({ productId: productImages.productId, key: productImages.key })
    .from(productImages)
    .where(
      inArray(
        productImages.productId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(productImages.position);

  const byProduct = new Map<string, string[]>();
  for (const image of images) {
    const list = byProduct.get(image.productId) ?? [];
    list.push(image.key);
    byProduct.set(image.productId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    stock: row.stock,
    featured: row.featured,
    slug: row.slug,
    images: byProduct.get(row.id) ?? [],
  }));
}

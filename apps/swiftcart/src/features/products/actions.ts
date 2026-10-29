"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreOwner } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import type { FormState } from "@/lib/form";
import { slugify } from "@/lib/slug";
import { tags } from "@/lib/cache";
import { removeImage } from "@/lib/media";

const MAX_IMAGES = 10;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePriceCents(input: string): number | null {
  const normalized = input.replace(/[^0-9.]/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function parseImages(formData: FormData): string[] {
  const raw = text(formData, "images");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  } catch {
    return [];
  }
}

type ProductInput = {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  featured: boolean;
  images: string[];
};

function parseProductForm(formData: FormData): ProductInput | { error: string } {
  const name = text(formData, "name");
  const description = text(formData, "description");
  const priceCents = parsePriceCents(text(formData, "price"));
  const images = parseImages(formData);
  const stockRaw = text(formData, "stock");
  const stock = stockRaw === "" ? 0 : Number(stockRaw);
  const featured = formData.get("featured") === "on";

  if (name.length < 2) return { error: "Product name must be at least 2 characters." };
  if (name.length > 80) return { error: "Product name is too long." };
  if (priceCents === null) return { error: "Enter a price greater than zero." };
  if (!Number.isInteger(stock) || stock < 0)
    return { error: "Stock must be a whole number, zero or more." };
  if (description.length > 2000) return { error: "Description is too long." };
  if (images.length === 0) return { error: "Add at least one preview image." };
  if (images.length > MAX_IMAGES)
    return { error: "A product can have at most " + MAX_IMAGES + " previews." };

  return { name, description, priceCents, stock, featured, images };
}

async function writeImages(productId: string, images: string[]): Promise<void> {
  await getDb().delete(productImages).where(eq(productImages.productId, productId));
  await getDb()
    .insert(productImages)
    .values(images.map((key, position) => ({ productId, key, position })));
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStoreOwner();
  const input = parseProductForm(formData);
  if ("error" in input) return input;

  const slug = (slugify(input.name) || "product") + "-" + Math.random().toString(36).slice(2, 6);

  const inserted = await getDb()
    .insert(products)
    .values({
      storeId: actor.store.id,
      slug,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      stock: input.stock,
      featured: input.featured,
    })
    .returning({ id: products.id });

  const product = inserted[0];
  if (!product) return { error: "Could not create the product." };

  await writeImages(product.id, input.images);

  updateTag(tags.products);
  updateTag(tags.featured);
  updateTag(tags.store(actor.store.slug));
  redirect("/dashboard");
}

export async function updateProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStoreOwner();
  const id = text(formData, "id");
  if (!id) return { error: "Missing product id." };

  const input = parseProductForm(formData);
  if ("error" in input) return input;

  const owned = await getDb()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.storeId, actor.store.id)))
    .limit(1);
  if (!owned[0]) return { error: "Product not found." };

  const previous = await getDb()
    .select({ key: productImages.key })
    .from(productImages)
    .where(eq(productImages.productId, id));

  await getDb()
    .update(products)
    .set({
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      stock: input.stock,
      featured: input.featured,
    })
    .where(eq(products.id, id));

  await writeImages(id, input.images);

  // Anything dropped from the form leaves both stores as well.
  const kept = new Set(input.images);
  for (const image of previous) {
    if (!kept.has(image.key)) await removeImage(image.key).catch(() => undefined);
  }

  updateTag(tags.products);
  updateTag(tags.featured);
  updateTag(tags.store(actor.store.slug));
  redirect("/dashboard");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const actor = await requireStoreOwner();
  const id = text(formData, "id");
  if (!id) return;

  const owned = await getDb()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.storeId, actor.store.id)))
    .limit(1);
  if (!owned[0]) return;

  const images = await getDb()
    .select({ key: productImages.key })
    .from(productImages)
    .where(eq(productImages.productId, id));

  await getDb().delete(products).where(eq(products.id, id));

  for (const image of images) await removeImage(image.key).catch(() => undefined);

  updateTag(tags.products);
  updateTag(tags.featured);
  updateTag(tags.store(actor.store.slug));
}

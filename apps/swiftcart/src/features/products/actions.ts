"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreOwner } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { productImages, productVariants, products } from "@/lib/db/schema";
import type { ProductProperty, VariantOptions } from "@/lib/db/schema";
import type { FormState } from "@/lib/form";
import { slugify } from "@/lib/slug";
import { tags } from "@/lib/cache";
import { removeImage } from "@/lib/media";

const MAX_IMAGES = 10;
const MAX_PROPERTIES = 3;
const MAX_VALUES = 20;

type VariantInput = {
  options: VariantOptions;
  priceCents: number | null;
  stock: number;
  sku: string | null;
  imageKey: string | null;
};

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

function parseProperties(formData: FormData): ProductProperty[] | { error: string } {
  const raw = text(formData, "properties");
  if (!raw || raw === "[]") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Options could not be read." };
  }
  if (!Array.isArray(parsed)) return { error: "Options could not be read." };
  if (parsed.length > MAX_PROPERTIES) {
    return { error: "An item can have at most " + MAX_PROPERTIES + " options." };
  }

  const seen = new Set<string>();
  const properties: ProductProperty[] = [];

  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) return { error: "Options could not be read." };
    const name = String((entry as { name?: unknown }).name ?? "").trim();
    const values = Array.isArray((entry as { values?: unknown }).values)
      ? ((entry as { values: unknown[] }).values as unknown[])
      : [];
    const clean = values.map((value) => String(value).trim()).filter((value) => value.length > 0);

    if (name.length < 1 || name.length > 30)
      return { error: "Option names need 1 to 30 characters." };
    if (seen.has(name.toLowerCase())) return { error: "Option names must be different." };
    if (clean.length === 0) return { error: "Every option needs at least one value." };
    if (clean.length > MAX_VALUES) {
      return { error: "An option can have at most " + MAX_VALUES + " values." };
    }
    if (new Set(clean.map((value) => value.toLowerCase())).size !== clean.length) {
      return { error: "Values inside one option must be different." };
    }

    seen.add(name.toLowerCase());
    properties.push({ name, values: clean });
  }

  return properties;
}

function combinationKey(options: VariantOptions): string {
  return Object.keys(options)
    .sort()
    .map((key) => key + "=" + options[key])
    .join("|");
}

function parseVariants(
  formData: FormData,
  properties: ProductProperty[],
  fallbackStock: number,
): VariantInput[] | { error: string } {
  const allowed = new Map(properties.map((property) => [property.name, new Set(property.values)]));
  const raw = text(formData, "variants");

  if (!raw) {
    return [{ options: {}, priceCents: null, stock: fallbackStock, sku: null, imageKey: null }];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Variants could not be read." };
  }
  if (!Array.isArray(parsed)) return { error: "Variants could not be read." };

  const byKey = new Map<string, VariantInput>();
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null)
      return { error: "Variants could not be read." };
    const record = entry as Record<string, unknown>;
    const options =
      typeof record.options === "object" && record.options !== null
        ? (record.options as VariantOptions)
        : {};

    for (const [name, value] of Object.entries(options)) {
      const values = allowed.get(name);
      if (!values || !values.has(value)) return { error: "Unknown option value: " + name + "." };
    }
    if (properties.length > 0 && Object.keys(options).length === 0) {
      return { error: "Every combination needs at least one option value." };
    }

    const stock = Number(record.stock ?? 0);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: "Variant stock must be a whole number, zero or more." };
    }

    const priceRaw = String(record.price ?? "").trim();
    const priceCents = priceRaw ? parsePriceCents(priceRaw) : null;
    if (priceRaw && priceCents === null)
      return { error: "Variant price must be greater than zero." };

    const sku = String(record.sku ?? "").trim() || null;
    const imageKey = String(record.imageKey ?? "").trim() || null;

    byKey.set(combinationKey(options), {
      options,
      priceCents,
      stock,
      sku: sku ? sku.slice(0, 64) : null,
      imageKey,
    });
  }

  const variants = [...byKey.values()];

  if (variants.length === 0) return { error: "Add at least one combination." };
  if (variants.length > 100) return { error: "An item can have at most 100 combinations." };

  return variants;
}

async function syncVariants(
  productId: string,
  variants: VariantInput[],
): Promise<{ removedImages: string[] }> {
  const db = getDb();
  const existing = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  const byKey = new Map(existing.map((row) => [combinationKey(row.options), row]));
  const kept = new Set<string>();
  const removedImages: string[] = [];

  for (const [position, variant] of variants.entries()) {
    const key = combinationKey(variant.options);
    const current = byKey.get(key);

    if (current) {
      kept.add(current.id);
      if (current.imageKey && current.imageKey !== variant.imageKey) {
        removedImages.push(current.imageKey);
      }
      await db
        .update(productVariants)
        .set({
          options: variant.options,
          priceCents: variant.priceCents,
          stock: variant.stock,
          sku: variant.sku,
          imageKey: variant.imageKey,
          position,
        })
        .where(eq(productVariants.id, current.id));
    } else {
      const inserted = await db
        .insert(productVariants)
        .values({
          productId,
          options: variant.options,
          priceCents: variant.priceCents,
          stock: variant.stock,
          sku: variant.sku,
          imageKey: variant.imageKey,
          position,
        })
        .returning({ id: productVariants.id });
      if (inserted[0]) kept.add(inserted[0].id);
    }
  }

  for (const row of existing) {
    if (kept.has(row.id)) continue;
    if (row.imageKey) removedImages.push(row.imageKey);
    await db.delete(productVariants).where(eq(productVariants.id, row.id));
  }

  return { removedImages };
}

type ProductInput = {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  featured: boolean;
  images: string[];
  bannerWide: string | null;
  bannerTall: string | null;
  properties: ProductProperty[];
  variants: VariantInput[];
};

function parseProductForm(formData: FormData): ProductInput | { error: string } {
  const name = text(formData, "name");
  const description = text(formData, "description");
  const priceCents = parsePriceCents(text(formData, "price"));
  const images = parseImages(formData);
  const stockRaw = text(formData, "stock");
  const fallbackStock = stockRaw === "" ? 0 : Number(stockRaw);
  const featured = formData.get("featured") === "on";
  const bannerWide = text(formData, "bannerWide") || null;
  const bannerTall = text(formData, "bannerTall") || null;

  if (name.length < 2) return { error: "Product name must be at least 2 characters." };
  if (name.length > 80) return { error: "Product name is too long." };
  if (priceCents === null) return { error: "Enter a price greater than zero." };
  if (!Number.isInteger(fallbackStock) || fallbackStock < 0) {
    return { error: "Stock must be a whole number, zero or more." };
  }
  if (description.length > 2000) return { error: "Description is too long." };
  if (images.length === 0) return { error: "Add at least one preview image." };
  if (images.length > MAX_IMAGES) {
    return { error: "A product can have at most " + MAX_IMAGES + " previews." };
  }
  if (featured && (!bannerWide || !bannerTall)) {
    return { error: "Hero banners are required: one 5:2 for desktop and one 9:16 for mobile." };
  }

  const properties = parseProperties(formData);
  if ("error" in properties) return properties;

  const variants = parseVariants(formData, properties, fallbackStock);
  if ("error" in variants) return variants;

  const stock = variants.reduce((total, variant) => total + variant.stock, 0);

  return {
    name,
    description,
    priceCents,
    stock,
    featured,
    images,
    bannerWide,
    bannerTall,
    properties,
    variants,
  };
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
      properties: input.properties,
      bannerWideKey: input.featured ? input.bannerWide : null,
      bannerTallKey: input.featured ? input.bannerTall : null,
    })
    .returning({ id: products.id });

  const product = inserted[0];
  if (!product) return { error: "Could not create the product." };

  await writeImages(product.id, input.images);
  await syncVariants(product.id, input.variants);

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
    .select({
      id: products.id,
      bannerWideKey: products.bannerWideKey,
      bannerTallKey: products.bannerTallKey,
    })
    .from(products)
    .where(and(eq(products.id, id), eq(products.storeId, actor.store.id)))
    .limit(1);
  const existing = owned[0];
  if (!existing) return { error: "Product not found." };

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
      properties: input.properties,
      bannerWideKey: input.featured ? input.bannerWide : null,
      bannerTallKey: input.featured ? input.bannerTall : null,
    })
    .where(eq(products.id, id));

  await writeImages(id, input.images);
  const { removedImages } = await syncVariants(id, input.variants);
  for (const key of removedImages) await removeImage(key).catch(() => undefined);

  const nextBanners = new Set(
    [input.featured ? input.bannerWide : null, input.featured ? input.bannerTall : null].filter(
      (key): key is string => Boolean(key),
    ),
  );
  for (const key of [existing.bannerWideKey, existing.bannerTallKey]) {
    if (key && !nextBanners.has(key)) await removeImage(key).catch(() => undefined);
  }

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
    .select({
      id: products.id,
      bannerWideKey: products.bannerWideKey,
      bannerTallKey: products.bannerTallKey,
    })
    .from(products)
    .where(and(eq(products.id, id), eq(products.storeId, actor.store.id)))
    .limit(1);
  const product = owned[0];
  if (!product) return;

  const [images, variants] = await Promise.all([
    getDb()
      .select({ key: productImages.key })
      .from(productImages)
      .where(eq(productImages.productId, id)),
    getDb()
      .select({ key: productVariants.imageKey })
      .from(productVariants)
      .where(eq(productVariants.productId, id)),
  ]);

  await getDb().delete(products).where(eq(products.id, id));

  for (const image of images) await removeImage(image.key).catch(() => undefined);
  for (const variant of variants) {
    if (variant.key) await removeImage(variant.key).catch(() => undefined);
  }
  for (const key of [product.bannerWideKey, product.bannerTallKey]) {
    if (key) await removeImage(key).catch(() => undefined);
  }

  updateTag(tags.products);
  updateTag(tags.featured);
  updateTag(tags.store(actor.store.slug));
}

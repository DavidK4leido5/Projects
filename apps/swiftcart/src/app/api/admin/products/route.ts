import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getDb } from "@/lib/db";
import { productImages, productVariants, products, stores } from "@/lib/db/schema";
import { getActor } from "@/lib/auth/guards";
import { saveImage } from "@/lib/media";
import { tags } from "@/lib/cache";

const MAX_PRODUCTS = 60;
const MAX_IMAGES = 5;
const MAX_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

type VariantInput = {
  options?: Record<string, string>;
  priceCents?: number | null;
  stock?: number;
  sku?: string | null;
};

type ProductInput = {
  name?: string;
  category?: string;
  description?: string;
  priceCents?: number;
  stock?: number;
  images?: string[];
  featured?: boolean;
  properties?: { name: string; values: string[] }[];
  variants?: VariantInput[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function combinationKey(options: Record<string, string>): string {
  return Object.keys(options)
    .sort()
    .map((key) => key + "=" + options[key])
    .join("|");
}

/** Pulls one remote image through the same pipeline as a real upload. */
async function importImage(url: string): Promise<{ key: string } | { error: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "user-agent": "SwiftCartSeeder/1.0 (+https://swiftcart.local)" },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return { error: "Could not fetch " + url };
  }
  if (!response.ok) return { error: "Image responded " + response.status };

  const type = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  const extension = EXTENSIONS[type];
  if (!extension) return { error: "Unsupported image type " + type };

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return { error: "Image over 8 MB" };

  try {
    const saved = await saveImage(`products/seed/${randomUUID()}.${extension}`, bytes, type);
    return { key: saved.key };
  } catch {
    return { error: "Could not store the image" };
  }
}

export async function POST(request: Request) {
  const actor = await getActor();
  if (actor.kind !== "admin" && actor.kind !== "store") {
    return Response.json({ error: "Sign in as a store or admin." }, { status: 401 });
  }

  let body: { products?: ProductInput[]; storeSlug?: string };
  try {
    body = (await request.json()) as { products?: ProductInput[]; storeSlug?: string };
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }

  const batch = body.products ?? [];
  if (batch.length === 0) return Response.json({ error: "No products." }, { status: 400 });
  if (batch.length > MAX_PRODUCTS) {
    return Response.json(
      { error: "At most " + MAX_PRODUCTS + " products at a time." },
      { status: 400 },
    );
  }

  const db = getDb();
  const created: string[] = [];
  const failed: { name: string; error: string }[] = [];

  const targetStore =
    actor.kind === "store"
      ? null
      : (
          await db
            .select({ id: stores.id })
            .from(stores)
            .where(body.storeSlug ? eq(stores.slug, body.storeSlug) : undefined)
            .limit(1)
        )[0];

  const storeId = actor.kind === "store" ? actor.store.id : targetStore?.id;

  if (!storeId) return Response.json({ error: "No store to attach products to." }, { status: 400 });

  for (const input of batch) {
    const name = (input.name ?? "").trim();
    if (name.length < 2) {
      failed.push({ name, error: "Name too short" });
      continue;
    }
    const priceCents = Math.trunc(input.priceCents ?? 0);
    if (priceCents < 0) {
      failed.push({ name, error: "Bad price" });
      continue;
    }

    const keys: string[] = [];
    for (const url of (input.images ?? []).slice(0, MAX_IMAGES)) {
      const imported = await importImage(url);
      if ("key" in imported) keys.push(imported.key);
    }
    if (keys.length === 0) {
      failed.push({ name, error: "No usable image" });
      continue;
    }

    const properties = (input.properties ?? []).filter(
      (property) => property.name && Array.isArray(property.values) && property.values.length > 0,
    );

    const variants = (input.variants ?? []).length
      ? input.variants!
      : [{ options: {}, stock: Math.trunc(input.stock ?? 1), priceCents: null }];

    const stock = variants.reduce(
      (total, variant) => total + Math.max(0, Math.trunc(variant.stock ?? 0)),
      0,
    );

    const slug = (slugify(name) || "item") + "-" + randomUUID().slice(0, 6);
    const inserted = await db
      .insert(products)
      .values({
        storeId,
        slug,
        name,
        category: (input.category ?? "").trim() || null,
        description: (input.description ?? "").trim(),
        priceCents,
        stock,
        featured: Boolean(input.featured),
        properties,
      })
      .returning({ id: products.id });

    const product = inserted[0];
    if (!product) {
      failed.push({ name, error: "Insert failed" });
      continue;
    }

    await db
      .insert(productImages)
      .values(keys.map((key, position) => ({ productId: product.id, key, position })));

    const rows = variants.map((variant) => {
      const options = variant.options ?? {};
      return {
        productId: product.id,
        combinationKey: combinationKey(options),
        options,
        priceCents: variant.priceCents ?? null,
        stock: Math.max(0, Math.trunc(variant.stock ?? 0)),
        sku: variant.sku ?? null,
        imageKey: null,
      };
    });

    if (rows.length > 0) await db.insert(productVariants).values(rows);
    created.push(name);
  }

  revalidateTag(tags.products, "max");
  revalidateTag(tags.featured, "max");

  return Response.json({ ok: true, created: created.length, names: created, failed });
}

/** Lists products with their category, for cleanup passes. */
export async function GET() {
  const actor = await getActor();
  if (actor.kind !== "admin" && actor.kind !== "store") {
    return Response.json({ error: "Sign in as a store or admin." }, { status: 401 });
  }

  const rows = await getDb()
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      store: stores.name,
      slug: products.slug,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .where(actor.kind === "store" ? eq(products.storeId, actor.store.id) : undefined)
    .orderBy(products.name);

  return Response.json({ ok: true, count: rows.length, products: rows });
}

/** Sets categories on existing products, matched by name. */
export async function PATCH(request: Request) {
  const actor = await getActor();
  if (actor.kind !== "admin" && actor.kind !== "store") {
    return Response.json({ error: "Sign in as a store or admin." }, { status: 401 });
  }

  let body: { updates?: { name?: string; category?: string }[] };
  try {
    body = (await request.json()) as { updates?: { name?: string; category?: string }[] };
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }

  const updates = body.updates ?? [];
  if (updates.length === 0) return Response.json({ error: "No updates." }, { status: 400 });
  if (updates.length > 200) return Response.json({ error: "Too many updates." }, { status: 400 });

  const db = getDb();
  const storeFilter = actor.kind === "store" ? eq(products.storeId, actor.store.id) : undefined;
  let updated = 0;
  const missing: string[] = [];

  for (const update of updates) {
    const name = (update.name ?? "").trim();
    const category = (update.category ?? "").trim();
    if (!name || !category) continue;
    const rows = await db
      .update(products)
      .set({ category })
      .where(storeFilter ? and(storeFilter, eq(products.name, name)) : eq(products.name, name))
      .returning({ id: products.id });
    updated += rows.length;
    if (rows.length === 0) missing.push(name);
  }

  revalidateTag(tags.products, "max");
  return Response.json({ ok: true, updated, missing });
}

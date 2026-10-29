import { inArray } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { products, stores } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth";

const SEED_STORES = [
  {
    slug: "northwind-supply",
    name: "Northwind Supply",
    email: "demo@swiftcart.dev",
    password: "demo1234",
    tagline: "Everyday goods for people who keep their tools sharp.",
  },
  {
    slug: "atlas-ceramics",
    name: "Atlas Ceramics",
    email: "atlas@swiftcart.dev",
    password: "demo1234",
    tagline: "Small-batch stoneware from a two-person studio.",
  },
];

const SEED_PRODUCTS: Record<string, Array<{ name: string; price: number; description: string }>> = {
  "northwind-supply": [
    {
      name: "Walnut Desk Tray",
      price: 48,
      description: "Solid walnut, felt base, holds a week of clutter.",
    },
    {
      name: "Brass Ruler 12in",
      price: 26,
      description: "Machined brass with etched markings that never wear off.",
    },
    {
      name: "Canvas Tool Roll",
      price: 62,
      description: "Waxed canvas, eight pockets, rolls to the size of a forearm.",
    },
    {
      name: "Cedar Sharpening Stone",
      price: 34,
      description: "Two grits, set in cedar, ready out of the box.",
    },
    {
      name: "Linen Shop Apron",
      price: 74,
      description: "Heavy linen, cross-back straps, breaks in after a week.",
    },
  ],
  "atlas-ceramics": [
    {
      name: "Stoneware Mug",
      price: 28,
      description: "Speckled clay, matte glaze, 12oz. Dishwasher safe.",
    },
    {
      name: "Wide Serving Bowl",
      price: 56,
      description: "Hand-thrown, 11 inches across, good for salad or fruit.",
    },
    { name: "Bud Vase Trio", price: 44, description: "Three heights, cut flowers or dry stems." },
    {
      name: "Espresso Cups (2)",
      price: 38,
      description: "Small cups with a thick lip that keeps heat in.",
    },
  ],
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const db = getDb();
  const slugs = SEED_STORES.map((store) => store.slug);
  const existing = await db
    .select({ id: stores.id })
    .from(stores)
    .where(inArray(stores.slug, slugs));
  const ids = existing.map((row) => row.id);

  if (ids.length > 0) await db.delete(products).where(inArray(products.storeId, ids));
  await db.delete(stores).where(inArray(stores.slug, slugs));

  for (const seed of SEED_STORES) {
    const inserted = await db
      .insert(stores)
      .values({
        slug: seed.slug,
        name: seed.name,
        email: seed.email,
        tagline: seed.tagline,
        passwordHash: await hashPassword(seed.password),
      })
      .returning({ id: stores.id });

    const store = inserted[0];
    if (!store) throw new Error(`Could not insert ${seed.slug}`);

    const items = SEED_PRODUCTS[seed.slug] ?? [];
    await db.insert(products).values(
      items.map((item) => ({
        storeId: store.id,
        slug: `${toSlug(item.name)}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        description: item.description,
        priceCents: Math.round(item.price * 100),
      })),
    );
  }

  console.log(`seeded ${SEED_STORES.length} stores`);
}

await main();
process.exit(0);

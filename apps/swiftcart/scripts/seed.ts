import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/index.js";
import { cartItems, products, profiles, stores } from "../src/lib/db/schema.js";

const ORIGIN = process.env.NEON_AUTH_TRUSTED_ORIGIN ?? "http://localhost:3000";
const PASSWORD = "demo1234";

type SeedStore = {
  slug: string;
  name: string;
  tagline: string;
  email: string;
  products: Array<{ name: string; price: number; description: string }>;
};

const STORES: SeedStore[] = [
  {
    slug: "northwind-supply",
    name: "Northwind Supply",
    tagline: "Everyday goods for people who keep their tools sharp.",
    email: "demo@swiftcart.dev",
    products: [
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
  },
  {
    slug: "atlas-ceramics",
    name: "Atlas Ceramics",
    tagline: "Small-batch stoneware from a two-person studio.",
    email: "atlas@swiftcart.dev",
    products: [
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
  },
];

const ADMIN = { email: "admin@swiftcart.dev", name: "Site Admin" };
const SHOPPER = { email: "shopper@swiftcart.dev", name: "Sam Shopper" };

function baseUrl(): string {
  const url = process.env.NEON_AUTH_BASE_URL;
  if (!url) throw new Error("NEON_AUTH_BASE_URL is not set.");
  return url;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Creates the hosted identity, or reuses the id of one we already seeded. */
async function ensureAuthUser(email: string, name: string): Promise<string> {
  const response = await fetch(baseUrl() + "/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD, name }),
  });
  const payload = (await response.json()) as {
    user?: { id: string };
    message?: string;
    code?: string;
  };

  if (response.ok && payload.user) return payload.user.id;

  const existing = await getDb()
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);
  if (existing[0]) return existing[0].id;

  throw new Error(
    "Could not create " + email + ": " + (payload.message ?? payload.code ?? response.status),
  );
}

async function main() {
  const db = getDb();

  await db.delete(cartItems);
  await db.delete(products);
  await db.delete(stores);
  await db.delete(profiles);

  const adminId = await ensureAuthUser(ADMIN.email, ADMIN.name);
  await db
    .insert(profiles)
    .values({ id: adminId, name: ADMIN.name, email: ADMIN.email, role: "admin" });

  for (const seed of STORES) {
    const ownerId = await ensureAuthUser(seed.email, seed.name);
    await db
      .insert(profiles)
      .values({ id: ownerId, name: seed.name, email: seed.email, role: "store" });

    const inserted = await db
      .insert(stores)
      .values({ ownerId, slug: seed.slug, name: seed.name, tagline: seed.tagline })
      .returning({ id: stores.id });

    const store = inserted[0];
    if (!store) throw new Error("Could not insert store " + seed.slug);

    await db.insert(products).values(
      seed.products.map((item) => ({
        storeId: store.id,
        slug: toSlug(item.name) + "-" + Math.random().toString(36).slice(2, 6),
        name: item.name,
        description: item.description,
        priceCents: Math.round(item.price * 100),
      })),
    );
  }

  const shopperId = await ensureAuthUser(SHOPPER.email, SHOPPER.name);
  await db
    .insert(profiles)
    .values({ id: shopperId, name: SHOPPER.name, email: SHOPPER.email, role: "user" });

  console.log("seeded 1 admin, 2 stores, 1 shopper");
  console.log("password for all: " + PASSWORD);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

import { getDb } from "../src/lib/db/index.js";
import { cartItems, products, profiles, stores } from "../src/lib/db/schema.js";

const ORIGIN = process.env.NEON_AUTH_TRUSTED_ORIGIN ?? "http://localhost:3000";
const PASSWORD = "demo1234";

type SeedStore = {
  slug: string;
  name: string;
  tagline: string;
  email: string;
  products: Array<{ name: string; price: number; description: string; stock: number }>;
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
        stock: 8,
      },
      {
        name: "Brass Ruler 12in",
        price: 26,
        description: "Machined brass with etched markings that never wear off.",
        stock: 8,
      },
      {
        name: "Canvas Tool Roll",
        price: 62,
        description: "Waxed canvas, eight pockets, rolls to the size of a forearm.",
        stock: 8,
      },
      {
        name: "Cedar Sharpening Stone",
        price: 34,
        description: "Two grits, set in cedar, ready out of the box.",
        stock: 8,
      },
      {
        name: "Linen Shop Apron",
        price: 74,
        description: "Heavy linen, cross-back straps, breaks in after a week.",
        stock: 8,
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

  // Re-seeding: the identity already exists, so sign in with the seeded password
  // to learn its id instead of creating a second account.
  const signIn = await fetch(baseUrl() + "/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const signed = (await signIn.json()) as { user?: { id: string } };
  if (signIn.ok && signed.user) return signed.user.id;

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
        stock: item.stock,
      })),
    );
  }

  const shopperId = await ensureAuthUser(SHOPPER.email, SHOPPER.name);
  await db
    .insert(profiles)
    .values({ id: shopperId, name: SHOPPER.name, email: SHOPPER.email, role: "user" });

  console.log("seeded 1 admin, 1 store, 1 shopper");
  console.log("password for all: " + PASSWORD);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

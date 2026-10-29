import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cartItems, products, profiles, stores } from "@/lib/db/schema";

export async function adminOverview() {
  const [counts] = await getDb()
    .select({
      users: sql<number>`(select count(*) from ${profiles})`.mapWith(Number),
      stores: sql<number>`(select count(*) from ${stores})`.mapWith(Number),
      products: sql<number>`(select count(*) from ${products})`.mapWith(Number),
      cartItems: sql<number>`(select count(*) from ${cartItems})`.mapWith(Number),
    })
    .from(sql`(select 1) as t`);

  return counts ?? { users: 0, stores: 0, products: 0, cartItems: 0 };
}

export async function listStoresWithCounts() {
  return getDb()
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      ownerId: stores.ownerId,
      ownerName: profiles.name,
      ownerEmail: profiles.email,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
    })
    .from(stores)
    .innerJoin(profiles, eq(stores.ownerId, profiles.id))
    .leftJoin(products, eq(products.storeId, stores.id))
    .groupBy(stores.id, stores.name, stores.slug, stores.ownerId, profiles.name, profiles.email)
    .orderBy(desc(stores.createdAt));
}

export async function listProfiles() {
  return getDb()
    .select({
      id: profiles.id,
      name: profiles.name,
      email: profiles.email,
      role: profiles.role,
      createdAt: profiles.createdAt,
      storeSlug: stores.slug,
    })
    .from(profiles)
    .leftJoin(stores, eq(stores.ownerId, profiles.id))
    .orderBy(desc(profiles.createdAt));
}

export async function listAllProducts() {
  return getDb()
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      category: products.category,
      priceCents: products.priceCents,
      storeId: products.storeId,
      storeName: stores.name,
      storeSlug: stores.slug,
    })
    .from(products)
    .innerJoin(stores, eq(products.storeId, stores.id))
    .orderBy(desc(products.createdAt));
}

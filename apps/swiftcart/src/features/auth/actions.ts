"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { profiles, stores } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth/session";
import { slugify } from "@/lib/slug";

export type ProvisionResult = { ok: true; role: string } | { ok: false; error: string };

/**
 * Called immediately after the hosted auth signup succeeds and the session
 * cookie exists. Identity belongs to Neon Auth; role and store belong to us.
 */
export async function provisionAccount(input: {
  mode: "user" | "store";
  storeName?: string;
}): Promise<ProvisionResult> {
  const authUser = await getAuthUser();
  if (!authUser) return { ok: false, error: "Signup did not produce a session." };

  const db = getDb();
  const existing = await db.select().from(profiles).where(eq(profiles.id, authUser.id)).limit(1);
  if (existing[0]) return { ok: true, role: existing[0].role };

  const role = input.mode === "store" ? "store" : "user";
  const storeName = (input.storeName ?? "").trim();
  if (role === "store" && storeName.length < 2) {
    return { ok: false, error: "Store name must be at least 2 characters." };
  }

  await db.insert(profiles).values({
    id: authUser.id,
    name: authUser.name || storeName || authUser.email,
    email: authUser.email,
    role,
  });

  if (role === "store") {
    const base = slugify(storeName) || "store";
    let slug = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const taken = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.slug, slug))
        .limit(1);
      if (taken.length === 0) break;
      slug = base + "-" + Math.random().toString(36).slice(2, 6);
    }

    try {
      await db.insert(stores).values({ ownerId: authUser.id, slug, name: storeName });
    } catch (error) {
      // Keep the account consistent: no store means no store role.
      await db.delete(profiles).where(eq(profiles.id, authUser.id));
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not create the store.",
      };
    }
  }

  return { ok: true, role };
}

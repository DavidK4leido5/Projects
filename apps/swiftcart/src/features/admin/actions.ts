"use server";

import { and, eq, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getDb } from "@/lib/db";
import { products, profiles, stores } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { slugify } from "@/lib/slug";
import { tags } from "@/lib/cache";

export type AdminFormState = { error?: string; warning?: string; ok?: boolean };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function uniqueSlug(base: string): Promise<string> {
  const db = getDb();
  let slug = slugify(base) || "store";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);
    if (taken.length === 0) return slug;
    slug = slugify(base) + "-" + Math.random().toString(36).slice(2, 6);
  }
  return slug;
}

/** Give an existing account a store, promoting it to the store role. */
export async function createStoreForUser(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const storeName = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  if (storeName.length < 2) return { error: "Store name must be at least 2 characters." };

  const db = getDb();
  const found = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
  const profile = found[0];
  if (!profile) return { error: "No account with that email. They must sign up first." };
  if (profile.role === "admin") return { error: "Admins cannot own stores." };

  const owned = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.ownerId, profile.id))
    .limit(1);
  if (owned[0]) return { error: "That account already owns a store." };

  const slug = await uniqueSlug(storeName);
  await db.insert(stores).values({ ownerId: profile.id, slug, name: storeName });
  await db.update(profiles).set({ role: "store" }).where(eq(profiles.id, profile.id));

  updateTag(tags.stores);
  updateTag(tags.products);
  return { ok: true };
}

export async function renameStore(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id) return { error: "Missing store." };
  if (name.length < 2) return { error: "Store name must be at least 2 characters." };

  await getDb().update(stores).set({ name }).where(eq(stores.id, id));
  updateTag(tags.stores);
  updateTag(tags.products);
  return { ok: true };
}

export async function deleteStore(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;

  const db = getDb();
  const found = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  const store = found[0];
  if (!store) return;

  await db.delete(stores).where(eq(stores.id, id));
  await db
    .update(profiles)
    .set({ role: "user" })
    .where(and(eq(profiles.id, store.ownerId), ne(profiles.role, "admin")));

  updateTag(tags.stores);
  updateTag(tags.products);
}

export async function setUserRole(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireAdmin();
  const userId = text(formData, "userId");
  const role = text(formData, "role");

  if (!userId) return { error: "Missing user." };
  if (role !== "user" && role !== "store" && role !== "admin") return { error: "Unknown role." };
  if (userId === actor.profile.id) return { error: "You cannot change your own role." };

  const db = getDb();
  const found = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  const profile = found[0];
  if (!profile) return { error: "User not found." };

  if (role !== "store") {
    const owned = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.ownerId, userId))
      .limit(1);
    if (owned[0]) await db.delete(stores).where(eq(stores.ownerId, userId));
  }

  await db.update(profiles).set({ role }).where(eq(profiles.id, userId));
  updateTag(tags.stores);
  updateTag(tags.products);
  return { ok: true };
}

export async function deleteUser(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireAdmin();
  const userId = text(formData, "userId");

  if (!userId) return { error: "Missing user." };
  if (userId === actor.profile.id) return { error: "You cannot delete your own account." };

  const db = getDb();
  // Local rows first: profiles cascades to stores, products, and cart items.
  await db.delete(profiles).where(eq(profiles.id, userId));

  // Then the identity, which lives in the hosted service. Only an admin session
  // there can remove it, so a failure is reported rather than hidden.
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) return { ok: true, warning: "Local account removed. Auth service not configured." };

  try {
    const headers = await import("next/headers").then((mod) => mod.headers());
    const response = await fetch(baseUrl + "/admin/remove-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.NEON_AUTH_TRUSTED_ORIGIN ?? "http://localhost:3000",
        Cookie: headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      return {
        ok: true,
        warning:
          "Local account removed. The auth identity remains: an admin session in Neon Auth is required to delete it.",
      };
    }
  } catch {
    return { ok: true, warning: "Local account removed. The auth identity could not be reached." };
  }

  updateTag(tags.stores);
  updateTag(tags.products);
  return { ok: true };
}

export async function deleteAnyProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;

  await getDb().delete(products).where(eq(products.id, id));
  updateTag(tags.products);
}

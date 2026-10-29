"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import type { FormState } from "@/lib/form";
import { slugify } from "@/lib/slug";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const storeName = text(formData, "storeName");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (!storeName) return { error: "Store name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = getDb();
  const existing = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.email, email))
    .limit(1);
  if (existing.length > 0) return { error: "That email already has a store." };

  const baseSlug = slugify(storeName) || "store";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);
    if (taken.length === 0) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const inserted = await db
    .insert(stores)
    .values({ name: storeName, slug, email, passwordHash: await hashPassword(password) })
    .returning({ id: stores.id });

  const store = inserted[0];
  if (!store) return { error: "Could not create the store. Try again." };

  await createSession(store.id);
  redirect("/dashboard");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  if (!email || !password) return { error: "Email and password are required." };

  const rows = await getDb().select().from(stores).where(eq(stores.email, email)).limit(1);
  const store = rows[0];
  if (!store || !(await verifyPassword(password, store.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }

  await createSession(store.id);
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

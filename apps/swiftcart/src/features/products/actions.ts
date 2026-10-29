"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreOwner } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import type { FormState } from "@/lib/form";
import { slugify } from "@/lib/slug";

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

type ProductInput = {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  imageKey: string | null;
};

function parseProductForm(formData: FormData): ProductInput | { error: string } {
  const name = text(formData, "name");
  const description = text(formData, "description");
  const priceCents = parsePriceCents(text(formData, "price"));
  const imageKey = text(formData, "imageKey") || null;
  const stockRaw = text(formData, "stock");
  const stock = stockRaw === "" ? 0 : Number(stockRaw);

  if (name.length < 2) return { error: "Product name must be at least 2 characters." };
  if (name.length > 80) return { error: "Product name is too long." };
  if (priceCents === null) return { error: "Enter a price greater than zero." };
  if (!Number.isInteger(stock) || stock < 0)
    return { error: "Stock must be a whole number, zero or more." };
  if (description.length > 2000) return { error: "Description is too long." };

  return { name, description, priceCents, stock, imageKey };
}

export async function createProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStoreOwner();
  const input = parseProductForm(formData);
  if ("error" in input) return input;

  const slug = `${slugify(input.name) || "product"}-${Math.random().toString(36).slice(2, 6)}`;

  await getDb()
    .insert(products)
    .values({ ...input, slug, storeId: actor.store.id });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireStoreOwner();
  const id = text(formData, "id");
  if (!id) return { error: "Missing product id." };

  const input = parseProductForm(formData);
  if ("error" in input) return input;

  await getDb()
    .update(products)
    .set(input)
    .where(and(eq(products.id, id), eq(products.storeId, actor.store.id)));

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const actor = await requireStoreOwner();
  const id = text(formData, "id");
  if (!id) return;

  await getDb()
    .delete(products)
    .where(and(eq(products.id, id), eq(products.storeId, actor.store.id)));

  revalidatePath("/");
  revalidatePath("/dashboard");
}

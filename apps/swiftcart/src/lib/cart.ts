import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cartItems, carts, productVariants } from "@/lib/db/schema";
import { getActor } from "@/lib/auth/guards";

const COOKIE = "swiftcart_cart";
const MAX_AGE = 60 * 60 * 24 * 30;

/** The cart for the current visitor, whoever that is. */
export async function getCartId(): Promise<string | null> {
  const db = getDb();
  const actor = await getActor();

  if (actor.kind !== "anonymous") {
    const rows = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, actor.profile.id))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const rows = await db.select({ id: carts.id }).from(carts).where(eq(carts.token, token)).limit(1);
  return rows[0]?.id ?? null;
}

/**
 * Finds or creates the cart. Only call this from a server action or route
 * handler, because it may set the guest cookie.
 */
export async function ensureCart(): Promise<string> {
  const db = getDb();
  const actor = await getActor();

  if (actor.kind !== "anonymous") {
    const existing = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, actor.profile.id))
      .limit(1);
    if (existing[0]) return existing[0].id;

    const inserted = await db
      .insert(carts)
      .values({ userId: actor.profile.id, token: randomUUID() })
      .returning({ id: carts.id });
    if (!inserted[0]) throw new Error("Could not create the cart.");
    return inserted[0].id;
  }

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (token) {
    const existing = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.token, token))
      .limit(1);
    if (existing[0]) return existing[0].id;
  }

  const fresh = token ?? randomUUID();
  const inserted = await db.insert(carts).values({ token: fresh }).returning({ id: carts.id });
  if (!inserted[0]) throw new Error("Could not create the cart.");

  jar.set(COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return inserted[0].id;
}

/**
 * Folds a guest cart into the signed-in one. Quantities add up, capped at the
 * variant stock, and the guest cart is removed.
 */
export async function mergeGuestCart(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return;

  const actor = await getActor();
  if (actor.kind === "anonymous") return;

  const db = getDb();
  const guestRows = await db.select().from(carts).where(eq(carts.token, token)).limit(1);
  const guest = guestRows[0];
  jar.delete(COOKIE);
  if (!guest || guest.userId) return;

  const mineRows = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, actor.profile.id))
    .limit(1);

  let mineId = mineRows[0]?.id;
  if (!mineId) {
    const created = await db
      .insert(carts)
      .values({ userId: actor.profile.id, token: randomUUID() })
      .returning({ id: carts.id });
    mineId = created[0]?.id;
  }
  if (!mineId) return;
  if (mineId === guest.id) return;

  const lines = await db.select().from(cartItems).where(eq(cartItems.cartId, guest.id));

  for (const line of lines) {
    const stock = await db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, line.variantId))
      .limit(1);

    const available = stock[0]?.stock ?? 0;
    if (available <= 0) continue;

    await db
      .insert(cartItems)
      .values({
        cartId: mineId,
        variantId: line.variantId,
        productId: line.productId,
        quantity: Math.min(line.quantity, available),
      })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId],
        set: {
          quantity: sql`least(${cartItems.quantity} + ${line.quantity}, ${available})`,
        },
      });
  }

  await db.delete(carts).where(and(eq(carts.id, guest.id), sql`${carts.userId} is null`));
}

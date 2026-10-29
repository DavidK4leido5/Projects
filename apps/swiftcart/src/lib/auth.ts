import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { sessions, stores, type Store } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";

export { hashPassword, verifyPassword };

const SESSION_COOKIE = "swiftcart_session";
const SESSION_DAYS = 30;

export async function createSession(storeId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await getDb().insert(sessions).values({ id: token, storeId, expiresAt });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentStore(): Promise<Store | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await getDb()
    .select({ store: stores })
    .from(sessions)
    .innerJoin(stores, eq(sessions.storeId, stores.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.store ?? null;
}

export async function requireStore(): Promise<Store> {
  const store = await getCurrentStore();
  if (!store) redirect("/login");
  return store;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, token));
  jar.delete(SESSION_COOKIE);
}

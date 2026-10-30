import "server-only";

import { NEON_AUTH_SESSION_DATA_COOKIE_NAME, validateSessionData } from "@neondatabase/auth/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/lib/env";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

/**
 * Verifies the signed session cookie locally. The proxy refreshes it, so this
 * costs no network call and works in every server component and action.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const raw = (await cookies()).get(NEON_AUTH_SESSION_DATA_COOKIE_NAME)?.value;
  if (!raw) return null;

  const result = await validateSessionData(raw, env.NEON_AUTH_COOKIE_SECRET);
  if (!result.valid) return null;

  const payload = "payload" in result ? result.payload : null;
  const user = payload?.user ?? null;
  if (!user) return null;

  return { id: user.id, name: user.name ?? "", email: user.email ?? "" };
});

/** Page and layout guard. Redirects signed-out visitors to the login page. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

/** Server Action and Route Handler guard. Returns null instead of redirecting. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  return getAuthUser();
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You need to sign in to do that.");
    this.name = "UnauthorizedError";
  }
}

export async function requireUserId(): Promise<string> {
  const user = await getAuthUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}

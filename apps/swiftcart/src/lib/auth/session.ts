import "server-only";

import { NEON_AUTH_SESSION_DATA_COOKIE_NAME, validateSessionData } from "@neondatabase/auth/server";
import { cookies } from "next/headers";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

/**
 * Reads the session the proxy minted. The cookie is a JWT signed with our own
 * secret, so this verifies locally instead of calling the auth service.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const raw = (await cookies()).get(NEON_AUTH_SESSION_DATA_COOKIE_NAME)?.value;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!raw || !secret) return null;

  const result = await validateSessionData(raw, secret);
  if (!result.valid) return null;

  const payload = "payload" in result ? result.payload : null;
  const user = payload?.user ?? null;
  if (!user) return null;

  return { id: user.id, name: user.name ?? "", email: user.email ?? "" };
}

import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing " + name + ". Run: neon env pull");
  }
  return value;
}

/** Hosted Better Auth instance. It owns identities, passwords, and sessions. */
export const auth = createNeonAuth({
  baseUrl: required("NEON_AUTH_BASE_URL"),
  cookies: { secret: required("NEON_AUTH_COOKIE_SECRET") },
});

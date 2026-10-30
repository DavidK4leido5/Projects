import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/lib/env";

/** Managed Better Auth. It owns identities, passwords, and sessions. */
export const auth = createNeonAuth({
  baseUrl: env.NEON_AUTH_BASE_URL,
  cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
});

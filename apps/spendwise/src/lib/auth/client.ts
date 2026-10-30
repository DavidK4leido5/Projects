"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/** Talks to /api/auth, which proxies Managed Better Auth. */
export const authClient = createAuthClient();

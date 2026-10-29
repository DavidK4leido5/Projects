"use client";

import { createAuthClient } from "@neondatabase/auth/next";

/** Talks to our /api/auth proxy, which talks to Neon Auth. */
export const authClient = createAuthClient();

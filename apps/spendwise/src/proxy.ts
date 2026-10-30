import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const protect = auth.middleware({ loginUrl: "/login" });

/**
 * Protected pages only. API routes validate their own session and must answer
 * with JSON 401, not an HTML login redirect. Cron authenticates with a secret.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/accounts/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/cash-flow/:path*",
    "/goals/:path*",
    "/recurring/:path*",
    "/reports/:path*",
    "/insights/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};

export default async function proxy(request: NextRequest) {
  return protect(request);
}

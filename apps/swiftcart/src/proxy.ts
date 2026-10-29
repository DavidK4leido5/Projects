import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const LOGIN_PATH = "/login";
const protect = auth.middleware({ loginUrl: LOGIN_PATH });

/** Routes a signed-out visitor may use: the guest cart and its checkout. */
const GUEST_ROUTES = ["/cart", "/checkout"];

/** /orders/<uuid> is a receipt anyone holding the link can read. */
const RECEIPT_PATH = /^\/orders\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;

function isGuestRoute(pathname: string): boolean {
  if (GUEST_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return true;
  }
  return RECEIPT_PATH.test(pathname);
}

function isLoginRedirect(response: NextResponse, request: NextRequest): boolean {
  if (response.status < 300 || response.status >= 400) return false;
  const location = response.headers.get("location");
  if (!location) return false;
  return new URL(location, request.url).pathname === LOGIN_PATH;
}

/**
 * Refreshes the signed session-data cookie and keeps anonymous visitors out of
 * the authenticated areas. The cart, checkout, and order receipts are public,
 * so a guest's login redirect is answered with the page instead; any cookies the
 * middleware refreshed (or cleared) still ride along.
 */
export default async function proxy(request: NextRequest) {
  const response = await protect(request);

  if (!isGuestRoute(request.nextUrl.pathname) || !isLoginRedirect(response, request)) {
    return response;
  }

  const passed = NextResponse.next();
  for (const cookie of response.headers.getSetCookie()) {
    passed.headers.append("set-cookie", cookie);
  }
  return passed;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/orders/:path*",
  ],
};

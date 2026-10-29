import { auth } from "@/lib/auth/server";

/**
 * Refreshes the signed session-data cookie and keeps anonymous visitors out of
 * the authenticated areas. Role checks still happen in the pages themselves.
 */
export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/cart/:path*"],
};

import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Cache Components: "use cache"/cacheLife/cacheTag plus Partial Prerendering.
  cacheComponents: true,
  // Links prefetch the static shell only, never per-user data.
  partialPrefetching: true,
  experimental: {
    // CSV import posts up to 2 MB of file text to a Server Action; default is 1 MB.
    serverActions: { bodySizeLimit: "3mb" },
    // Client router cache: per-user (dynamic) segments for 30s, static ones for 180s.
    staleTimes: { dynamic: 30, static: 180 },
  },
  transpilePackages: ["@repo/ui", "@repo/shared", "@repo/finance", "@repo/db"],
  // @react-pdf/renderer and the ws polyfill must stay outside the bundler.
  serverExternalPackages: ["@react-pdf/renderer", "ws"],
  typedRoutes: false,
  async redirects() {
    return [
      { source: "/sign-up", destination: "/signup", permanent: false },
      { source: "/log-in", destination: "/login", permanent: false },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default config;

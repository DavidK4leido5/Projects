import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/shared"],
  // Turns on "use cache", cacheLife, cacheTag, and partial prerendering.
  cacheComponents: true,
  // Links only prefetch the prerendered shell, never per-user data.
  partialPrefetching: true,
};

export default config;

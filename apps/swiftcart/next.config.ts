import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/shared"],
  // Turns on "use cache", cacheLife, cacheTag, and partial prerendering.
  cacheComponents: true,
  // Links only prefetch the prerendered shell, never per-user data.
  partialPrefetching: true,
  // A revisit inside these windows is served from the router cache instead of
  // refetching the RSC payload. Dynamic entries are short because they carry
  // per-visitor data; static shells can live longer.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    // Cloudinary does the resizing and format negotiation.
    loader: "custom" as const,
    loaderFile: "./src/lib/image-loader.ts",
  },
};

export default config;

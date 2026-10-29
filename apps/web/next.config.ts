import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/shared"],
};

export default config;

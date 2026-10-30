import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/transactions",
        "/accounts",
        "/categories",
        "/budgets",
        "/goals",
        "/recurring",
        "/reports",
        "/insights",
        "/settings",
        "/notifications",
        "/cash-flow",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpendWise",
    short_name: "SpendWise",
    description: "Track income, expenses, budgets, goals, and cash flow.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#0f6b5c",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

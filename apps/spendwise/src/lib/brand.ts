/**
 * Dalorro brand source of truth.
 *
 * Keep this module dependency-free: client components, metadata routes, and
 * the PDF renderer all import it.
 */
export const brand = {
  name: "Dalorro",
  shortName: "Dalorro",
  tagline: "Let your money flow. Keep what matters.",
  alternateTaglines: [
    "Where your money flows and savings grow.",
    "Daloy ng pera, ahorro ng bukas.",
  ],
  description:
    "See your cash flow, budgets, goals, and savings in one calm place, with clear reports when you need them. Email and password only.",
  domain: "dalorro.app",
  supportEmail: "support@dalorro.app",
  privacyEmail: "privacy@dalorro.app",
  colors: {
    light: {
      background: "#F8FAF9",
      foreground: "#0C1F1D",
      primary: "#0F766E",
      gold: "#C98A1B",
    },
    dark: {
      background: "#081615",
      foreground: "#E8F3F1",
      primary: "#2DD4BF",
      gold: "#F0B94A",
    },
  },
  pdf: {
    background: "#F8FAF9",
    paper: "#FFFFFF",
    ink: "#0C1F1D",
    muted: "#4F6663",
    border: "#D8E3E1",
    soft: "#EEF3F2",
    accent: "#0F766E",
    gold: "#C98A1B",
    income: "#15803D",
    expense: "#BE4B3B",
    charts: ["#0F766E", "#D9A02B", "#1E5A8A", "#7FA99B", "#D9694F"],
  },
} as const;

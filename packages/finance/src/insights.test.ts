import { describe, expect, it } from "vitest";
import { buildInsights } from "./insights";

const base = {
  currency: "PHP",
  current: { income: 500000, expense: 300000, net: 200000, savingsRate: 40 },
  previous: { income: 500000, expense: 200000, net: 300000, savingsRate: 60 },
  categories: [{ name: "Food", current: 150000, previous: 100000 }],
  budgets: [
    { name: "Food", spent: 150000, limit: 120000, state: "exceeded" as const, percent: 125 },
  ],
  subscriptions: [{ payee: "Netflix", amount: 54900, frequency: "monthly" }],
  largestExpense: { payee: "Rent", amount: 2500000 },
  projectedNet: 100000,
};

describe("buildInsights", () => {
  it("flags spending growth and category jumps", () => {
    const insights = buildInsights(base);
    expect(insights.some((insight) => insight.id === "spending-change")).toBe(true);
    expect(insights.some((insight) => insight.id === "category-Food")).toBe(true);
  });

  it("flags an exceeded budget", () => {
    const insights = buildInsights(base);
    expect(insights.some((insight) => insight.id === "budget-exceeded-Food")).toBe(true);
  });

  it("reports subscriptions with a monthly estimate", () => {
    const insight = buildInsights(base).find((item) => item.id === "subscriptions");
    expect(insight?.detail).toContain("549.00");
    expect(insight?.detail).toContain("PHP");
  });

  it("celebrates a healthy savings rate and warns on negative net", () => {
    expect(buildInsights(base).some((insight) => insight.id === "savings-rate")).toBe(true);
    const negative = buildInsights({
      ...base,
      current: { income: 100000, expense: 150000, net: -50000, savingsRate: -50 },
      previous: base.previous,
    });
    expect(negative.some((insight) => insight.id === "savings-negative")).toBe(true);
  });
});

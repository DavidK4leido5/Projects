import type { BudgetState } from "./calculations";

export type InsightTone = "positive" | "warning" | "info";

export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
};

export type InsightInput = {
  currency: string;
  current: { income: number; expense: number; net: number; savingsRate: number };
  previous: { income: number; expense: number; net: number; savingsRate: number };
  categories: { name: string; current: number; previous: number }[];
  budgets: { name: string; spent: number; limit: number; state: BudgetState; percent: number }[];
  largestExpense?: { payee: string; amount: number } | null;
  subscriptions: { payee: string; amount: number; frequency: string }[];
  projectedNet?: number;
};

function percent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Deterministic, rule-based observations. No model, no network: every sentence
 * comes from the numbers passed in, so the same period always reads the same.
 */
export function buildInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const { current, previous } = input;

  const spendingChange = percent(current.expense, previous.expense);
  if (spendingChange != null && Math.abs(spendingChange) >= 10) {
    insights.push({
      id: "spending-change",
      tone: spendingChange > 0 ? "warning" : "positive",
      title:
        "Spending is " + (spendingChange > 0 ? "up " : "down ") + Math.abs(spendingChange) + "%",
      detail:
        spendingChange > 0
          ? "You spent more than the previous period. Check the categories below before the month ends."
          : "You spent less than the previous period. Keep the pace if it is sustainable.",
    });
  }

  const categoryChanges = input.categories
    .filter((category) => category.previous > 0 && category.current > 0)
    .map((category) => ({ ...category, change: percent(category.current, category.previous) }))
    .filter(
      (category): category is typeof category & { change: number } =>
        category.change != null && category.change >= 20,
    )
    .sort((a, b) => b.change - a.change)
    .slice(0, 2);

  for (const category of categoryChanges) {
    insights.push({
      id: "category-" + category.name,
      tone: "warning",
      title: category.name + " is up " + category.change + "%",
      detail:
        "That is the fastest-growing category against the previous period. Check whether it is a one-off or a new habit.",
    });
  }

  const exceeded = input.budgets.filter((budget) => budget.state === "exceeded").slice(0, 2);
  for (const budget of exceeded) {
    insights.push({
      id: "budget-exceeded-" + budget.name,
      tone: "warning",
      title: budget.name + " budget exceeded",
      detail:
        "You are at " +
        budget.percent +
        "% of the limit. Review the transactions feeding this budget.",
    });
  }

  const near = input.budgets.filter((budget) => budget.state === "near_limit").slice(0, 1);
  for (const budget of near) {
    insights.push({
      id: "budget-near-" + budget.name,
      tone: "info",
      title: budget.name + " is close to its limit",
      detail:
        "You are at " + budget.percent + "% of the monthly limit with time left in the period.",
    });
  }

  if (current.savingsRate >= 20) {
    insights.push({
      id: "savings-rate",
      tone: "positive",
      title: "Savings rate is " + current.savingsRate + "%",
      detail: "Anything at or above 20% is a healthy buffer for most households.",
    });
  } else if (current.savingsRate < 0) {
    insights.push({
      id: "savings-negative",
      tone: "warning",
      title: "You spent more than you earned",
      detail:
        "The period ends with a negative net. Look for the largest expenses or a temporary income dip.",
    });
  }

  if (input.subscriptions.length > 0) {
    const monthly = input.subscriptions.reduce((total, item) => {
      if (item.frequency === "yearly") return total + Math.round(item.amount / 12);
      if (item.frequency === "weekly") return total + Math.round(item.amount * 4.33);
      if (item.frequency === "daily") return total + Math.round(item.amount * 30);
      return total + item.amount;
    }, 0);
    insights.push({
      id: "subscriptions",
      tone: "info",
      title: input.subscriptions.length + " likely subscriptions",
      detail:
        "Recurring charges add up to roughly " +
        (monthly / 100).toFixed(2) +
        " " +
        input.currency +
        " per month. Cancel anything you no longer use.",
    });
  }

  if (input.largestExpense && input.largestExpense.amount > 0) {
    insights.push({
      id: "largest-expense",
      tone: "info",
      title: "Largest expense: " + input.largestExpense.payee,
      detail:
        "One transaction accounted for " +
        (current.expense > 0
          ? Math.round((input.largestExpense.amount / current.expense) * 100)
          : 0) +
        "% of spending this period.",
    });
  }

  if (typeof input.projectedNet === "number" && input.projectedNet < 0) {
    insights.push({
      id: "forecast",
      tone: "warning",
      title: "Forecast points to a shortfall",
      detail:
        "If the current pace holds, the period closes negative. Trim discretionary categories first.",
    });
  }

  return insights;
}

import "server-only";

import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { categories, recurringRules, transactions } from "@repo/db/schema";
import {
  buildInsights,
  categoryBreakdown,
  detectRecurring,
  forecastCashFlow,
  summarize,
  topExpenses,
  type TxnLike,
} from "@repo/finance";
import { getDashboardData } from "@/features/dashboard/queries";
import { getDb } from "@/lib/db";

export async function getInsightsData(userId: string) {
  const db = getDb();
  const now = new Date();
  const monthFrom = startOfMonth(now);
  const monthTo = endOfMonth(now);
  const previousFrom = startOfMonth(subMonths(now, 1));
  const previousTo = endOfMonth(subMonths(now, 1));
  const historyFrom = startOfMonth(subMonths(now, 5));

  const [dashboard, historyRows, rules] = await Promise.all([
    getDashboardData(userId),
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        payee: transactions.payee,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          gte(transactions.date, historyFrom),
          lte(transactions.date, monthTo),
        ),
      )
      .orderBy(asc(transactions.date)),
    db
      .select({
        amount: recurringRules.amount,
        type: recurringRules.type,
        frequency: recurringRules.frequency,
        nextRunAt: recurringRules.nextRunAt,
      })
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.userId, userId),
          eq(recurringRules.active, true),
          isNull(recurringRules.deletedAt),
        ),
      ),
  ]);

  const all: TxnLike[] = historyRows.map((row) => ({
    type: row.type,
    amount: row.amount,
    date: row.date,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    payee: row.payee,
  }));

  const current = all.filter((txn) => {
    const date = new Date(txn.date);
    return date >= monthFrom && date <= monthTo;
  });
  const previous = all.filter((txn) => {
    const date = new Date(txn.date);
    return date >= previousFrom && date <= previousTo;
  });

  const currentSummary = summarize(current);
  const previousSummary = summarize(previous);

  const categoryTotals = (rows: TxnLike[]) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.type !== "expense") continue;
      const name = row.categoryName?.trim() || "Uncategorized";
      map.set(name, (map.get(name) ?? 0) + row.amount);
    }
    return map;
  };
  const currentCategories = categoryTotals(current);
  const previousCategories = categoryTotals(previous);
  const categoryChanges = [...currentCategories.entries()]
    .map(([name, amount]) => ({
      name,
      current: amount,
      previous: previousCategories.get(name) ?? 0,
    }))
    .sort((a, b) => b.current - a.current)
    .slice(0, 10);

  const subscriptions = detectRecurring(all, now)
    .filter((candidate) => candidate.frequency === "monthly")
    .slice(0, 6);

  const largest = topExpenses(current, 1)[0] ?? null;

  const forecast = (days: 30 | 60 | 90) =>
    forecastCashFlow({
      today: now,
      days,
      currentBalance: dashboard.totalBalance,
      recentIncome: currentSummary.income,
      recentExpense: currentSummary.expense,
      recurring: rules.map((rule) => ({
        amount: rule.amount,
        type: rule.type === "income" ? "income" : "expense",
        nextRunAt: rule.nextRunAt,
        frequency: rule.frequency,
      })),
    });

  const insights = buildInsights({
    currency: dashboard.settings.currency,
    current: currentSummary,
    previous: previousSummary,
    categories: categoryChanges,
    budgets: dashboard.budgets.map((budget) => {
      const percent =
        budget.amount > 0 ? Math.round((budget.spent / budget.amount) * 1000) / 10 : 0;
      return {
        name: budget.categoryName ?? "Overall",
        spent: budget.spent,
        limit: budget.amount,
        state: percent > 100 ? "exceeded" : percent >= 80 ? "near_limit" : "on_track",
        percent,
      };
    }),
    largestExpense: largest ? { payee: largest.payee ?? "Unknown", amount: largest.amount } : null,
    subscriptions: subscriptions.map((item) => ({
      payee: item.payee,
      amount: item.amount,
      frequency: item.frequency,
    })),
    projectedNet: forecast(90).projectedNet,
  });

  return {
    settings: dashboard.settings,
    insights,
    subscriptions,
    current: currentSummary,
    previous: previousSummary,
    forecast: { d30: forecast(30), d60: forecast(60), d90: forecast(90) },
    topCategories: categoryBreakdown(current, 6),
    nextBill:
      rules.slice().sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())[0]?.nextRunAt ??
      null,
    windowStart: historyFrom,
    windowEnd: monthTo,
  };
}

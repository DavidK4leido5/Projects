import "server-only";

import { addDays, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { and, asc, eq, gte, isNull, lte, sum } from "drizzle-orm";
import {
  budgets,
  categories,
  goalContributions,
  goals,
  recurringRules,
  transactions,
} from "@repo/db/schema";
import {
  cashFlowSeries,
  categoryBreakdown,
  eachMonth,
  monthKey,
  percentChange,
  summarize,
  type TxnLike,
} from "@repo/finance";
import { listAccountsWithBalances } from "@/features/accounts/queries";
import { getSettings } from "@/features/settings/queries";
import { listRecentTransactions } from "@/features/transactions/queries";
import { getDb } from "@/lib/db";

export async function getDashboardData(userId: string) {
  const db = getDb();
  const now = new Date();
  const monthFrom = startOfMonth(now);
  const monthTo = endOfMonth(now);
  const previousFrom = startOfMonth(subMonths(now, 1));
  const previousTo = endOfMonth(subMonths(now, 1));
  const trendFrom = startOfMonth(subMonths(now, 5));

  const [
    settings,
    accountRows,
    transactionRows,
    budgetRows,
    goalRows,
    contributionRows,
    billRows,
    recent,
  ] = await Promise.all([
    getSettings(userId),
    listAccountsWithBalances(userId),
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        categoryId: transactions.categoryId,
        categoryParentId: categories.parentId,
        categoryName: categories.name,
        payee: transactions.payee,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          gte(transactions.date, trendFrom),
          lte(transactions.date, monthTo),
        ),
      )
      .orderBy(asc(transactions.date)),
    db
      .select({
        id: budgets.id,
        amount: budgets.amount,
        rollover: budgets.rollover,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.periodMonth, monthKey(now) + "-01"))),
    db
      .select({
        id: goals.id,
        name: goals.name,
        targetAmount: goals.targetAmount,
        currency: goals.currency,
        targetDate: goals.targetDate,
        color: goals.color,
      })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, "active"), isNull(goals.deletedAt)))
      .orderBy(asc(goals.targetDate))
      .limit(4),
    db
      .select({ goalId: goalContributions.goalId, total: sum(goalContributions.amount) })
      .from(goalContributions)
      .where(eq(goalContributions.userId, userId))
      .groupBy(goalContributions.goalId),
    db
      .select({
        id: recurringRules.id,
        payee: recurringRules.payee,
        amount: recurringRules.amount,
        currency: recurringRules.currency,
        type: recurringRules.type,
        nextRunAt: recurringRules.nextRunAt,
      })
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.userId, userId),
          eq(recurringRules.active, true),
          isNull(recurringRules.deletedAt),
          gte(recurringRules.nextRunAt, now),
          lte(recurringRules.nextRunAt, addDays(now, 14)),
        ),
      )
      .orderBy(asc(recurringRules.nextRunAt))
      .limit(5),
    listRecentTransactions(userId, 6),
  ]);

  const txnLikes: TxnLike[] = transactionRows.map((row) => ({
    type: row.type,
    amount: row.amount,
    date: row.date,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
  }));

  const current = txnLikes.filter((txn) => {
    const date = new Date(txn.date);
    return date >= monthFrom && date <= monthTo;
  });
  const previous = txnLikes.filter((txn) => {
    const date = new Date(txn.date);
    return date >= previousFrom && date <= previousTo;
  });

  const currentSummary = summarize(current);
  const previousSummary = summarize(previous);
  const series = cashFlowSeries(txnLikes, eachMonth({ from: trendFrom, to: monthTo }));
  const spending = categoryBreakdown(current, 6);

  const contributedByGoal = new Map(
    contributionRows.map((row) => [row.goalId, Number(row.total ?? 0)]),
  );

  const parentOf = new Map<string, string | null>();
  for (const txn of transactionRows) {
    if (txn.categoryId) parentOf.set(txn.categoryId, txn.categoryParentId);
  }

  // A budget on a parent category owns spending in its subcategories too.
  const spendByCategory = new Map<string, number>();
  for (const txn of current) {
    if (txn.type !== "expense" || !txn.categoryId) continue;
    spendByCategory.set(txn.categoryId, (spendByCategory.get(txn.categoryId) ?? 0) + txn.amount);
    const parent = parentOf.get(txn.categoryId);
    if (parent) {
      spendByCategory.set(parent, (spendByCategory.get(parent) ?? 0) + txn.amount);
    }
  }

  const activeAccounts = accountRows.filter((account) => !account.archived);
  const totalBalance = activeAccounts.reduce((total, account) => total + account.balance, 0);

  return {
    settings,
    accounts: activeAccounts,
    totalBalance,
    current: currentSummary,
    previous: previousSummary,
    deltas: {
      income: percentChange(currentSummary.income, previousSummary.income),
      expense: percentChange(currentSummary.expense, previousSummary.expense),
      net: percentChange(currentSummary.net, previousSummary.net),
    },
    series,
    spending,
    budgets: budgetRows.map((budget) => ({
      ...budget,
      spent: budget.categoryId
        ? (spendByCategory.get(budget.categoryId) ?? 0)
        : currentSummary.expense,
    })),
    goals: goalRows.map((goal) => ({
      ...goal,
      contributed: contributedByGoal.get(goal.id) ?? 0,
    })),
    upcomingBills: billRows,
    recent,
  };
}

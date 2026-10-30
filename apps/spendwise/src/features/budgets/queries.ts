import "server-only";

import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { budgets, categories, transactions } from "@repo/db/schema";
import { budgetProgress, percentChange, type BudgetState } from "@repo/finance";
import { getDb } from "@/lib/db";
import { shiftMonth } from "@/features/budgets/month";

/** Local-time first and last instant of the month, matching how dates are stored. */
export function monthRange(month: string): { from: Date; to: Date } {
  const [year = "1970", monthNumber = "1"] = month.split("-");
  const y = Number(year);
  const m = Number(monthNumber);
  return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59, 999) };
}

export type BudgetRow = {
  id: string;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  amount: number;
  currency: string;
  rollover: boolean;
  /** Unused money carried from the immediately previous month. */
  carry: number;
  effectiveLimit: number;
  spent: number;
  /** Budget minus spent. Negative means over budget. */
  variance: number;
  percent: number;
  state: BudgetState;
  previousLimit: number;
  previousSpent: number;
};

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percent: number;
  state: BudgetState;
  /** True when an overall budget supplies the summary instead of the category rows. */
  hasOverall: boolean;
  previousSpent: number;
  delta: number;
};

export type BudgetCategory = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
};

type SpendTotals = { byCategory: Map<string, number>; total: number };

/**
 * Folds expenses into their own category and their parent, so a budget on a
 * parent category owns spending in its subcategories too.
 */
function spendTotals(
  rows: { categoryId: string | null; amount: number }[],
  parentOf: Map<string, string | null>,
): SpendTotals {
  const byCategory = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    total += row.amount;
    if (!row.categoryId) continue;
    byCategory.set(row.categoryId, (byCategory.get(row.categoryId) ?? 0) + row.amount);
    const parentId = parentOf.get(row.categoryId);
    if (parentId) {
      byCategory.set(parentId, (byCategory.get(parentId) ?? 0) + row.amount);
    }
  }

  return { byCategory, total };
}

/** Just enough of last month's budget to copy it into the current month. */
export type BudgetLimit = {
  id: string;
  categoryId: string | null;
  amount: number;
  currency: string;
  rollover: boolean;
};

export async function listBudgets(
  userId: string,
  month: string,
): Promise<{ rows: BudgetRow[]; previousRows: BudgetLimit[]; summary: BudgetSummary }> {
  const db = getDb();
  const previousMonth = shiftMonth(month, -1);
  const current = monthRange(month);
  const previous = monthRange(previousMonth);

  const [budgetRows, categoryRows, expenseRows] = await Promise.all([
    db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        amount: budgets.amount,
        currency: budgets.currency,
        rollover: budgets.rollover,
        periodMonth: budgets.periodMonth,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(
        and(
          eq(budgets.userId, userId),
          inArray(budgets.periodMonth, [month + "-01", previousMonth + "-01"]),
        ),
      )
      .orderBy(asc(budgets.categoryId)),
    db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.userId, userId), isNull(categories.deletedAt))),
    db
      .select({
        categoryId: transactions.categoryId,
        amount: transactions.amount,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          eq(transactions.type, "expense"),
          gte(transactions.date, previous.from),
          lte(transactions.date, current.to),
        ),
      ),
  ]);

  const parentOf = new Map<string, string | null>(
    categoryRows.map((category) => [category.id, category.parentId]),
  );

  const currentSpend = spendTotals(
    expenseRows.filter((row) => row.date >= current.from && row.date <= current.to),
    parentOf,
  );
  const previousSpend = spendTotals(
    expenseRows.filter((row) => row.date >= previous.from && row.date <= previous.to),
    parentOf,
  );

  const previousBudgets = new Map(
    budgetRows
      .filter((row) => row.periodMonth === previousMonth + "-01")
      .map((row) => [row.categoryId ?? "overall", row]),
  );

  const previousRows: BudgetLimit[] = budgetRows
    .filter((row) => row.periodMonth === previousMonth + "-01")
    .map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      amount: row.amount,
      currency: row.currency,
      rollover: row.rollover,
    }));

  const rows: BudgetRow[] = budgetRows
    .filter((row) => row.periodMonth === month + "-01")
    .map((row) => {
      // ponytail: carry stops at one previous month. Chaining it further needs
      // every earlier month; add when someone asks for a running rollover pot.
      const previousBudget = previousBudgets.get(row.categoryId ?? "overall");
      const previousLimit = previousBudget?.amount ?? 0;
      const previousSpent = row.categoryId
        ? (previousSpend.byCategory.get(row.categoryId) ?? 0)
        : previousSpend.total;
      const carry = row.rollover ? Math.max(0, previousLimit - previousSpent) : 0;
      const spent = row.categoryId
        ? (currentSpend.byCategory.get(row.categoryId) ?? 0)
        : currentSpend.total;
      const progress = budgetProgress(spent, row.amount, carry);

      return {
        id: row.id,
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? "Overall",
        categoryColor: row.categoryColor ?? "slate",
        amount: row.amount,
        currency: row.currency,
        rollover: row.rollover,
        carry,
        effectiveLimit: progress.effectiveLimit,
        spent: progress.spent,
        variance: progress.remaining,
        percent: progress.percent,
        state: progress.state,
        previousLimit,
        previousSpent,
      };
    });

  // Overall first, then category budgets alphabetically.
  rows.sort((a, b) => {
    if (a.categoryId === null) return -1;
    if (b.categoryId === null) return 1;
    return a.categoryName.localeCompare(b.categoryName);
  });

  const overall = rows.find((row) => row.categoryId === null);
  const basis = overall ? [overall] : rows;
  const totalBudget = basis.reduce((sum, row) => sum + row.effectiveLimit, 0);
  const totalSpent = basis.reduce((sum, row) => sum + row.spent, 0);
  const previousTotal = basis.reduce((sum, row) => sum + row.previousSpent, 0);
  const progress = budgetProgress(totalSpent, totalBudget);

  return {
    rows,
    previousRows,
    summary: {
      totalBudget,
      totalSpent,
      remaining: progress.remaining,
      percent: progress.percent,
      state: progress.state,
      hasOverall: Boolean(overall),
      previousSpent: previousTotal,
      delta: percentChange(totalSpent, previousTotal),
    },
  };
}

export async function listBudgetCategories(userId: string): Promise<BudgetCategory[]> {
  return getDb()
    .select({
      id: categories.id,
      name: categories.name,
      color: categories.color,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.kind, "expense"),
        eq(categories.archived, false),
        isNull(categories.deletedAt),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

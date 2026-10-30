import "server-only";

import { and, asc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import {
  accounts,
  budgets,
  categories,
  recurringRules,
  reports,
  transactions,
  userSettings,
  type ReportType,
  type TransactionType,
} from "@repo/db/schema";
import {
  budgetProgress,
  cashFlowSeries,
  categoryBreakdown,
  eachMonth,
  formatDate,
  monthKey,
  percentChange,
  previousRange,
  reportRequestSchema,
  summarize,
  topExpenses,
  type BudgetState,
  type ReportRequest,
  type TxnLike,
} from "@repo/finance";
import { REPORT_TYPE_META } from "@/features/reports/report-meta";
import { getDb } from "@/lib/db";

/** The shared request schema plus the one rule Zod cannot express declaratively. */
export const reportRequestInput = reportRequestSchema.refine(
  (value) => value.dateFrom <= value.dateTo,
  { message: "The end date must be on or after the start date.", path: ["dateTo"] },
);

export type ReportSummary = {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  count: number;
};

export type ReportTransaction = {
  id: string;
  date: Date;
  type: TransactionType;
  amount: number;
  payee: string;
  notes: string | null;
  accountName: string;
  categoryName: string | null;
};

export type ReportCategoryRow = {
  categoryId: string | null;
  name: string;
  amount: number;
  count: number;
  share: number;
};

export type ReportMonth = {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

export type ReportBudgetRow = {
  id: string;
  categoryName: string;
  monthLabel: string;
  budget: number;
  spent: number;
  remaining: number;
  percent: number;
  state: BudgetState;
};

export type ReportRecurringRow = {
  id: string;
  payee: string;
  amount: number;
  frequency: string;
  type: TransactionType;
  nextRunAt: Date;
};

export type ReportData = {
  request: ReportRequest;
  type: ReportType;
  title: string;
  userName: string;
  generatedAt: Date;
  settings: { currency: string; locale: string; logoUrl: string | null };
  range: { from: Date; to: Date; label: string };
  previous: { from: Date; to: Date; label: string };
  summary: ReportSummary;
  previousSummary: ReportSummary;
  change: { income: number; expense: number; net: number };
  months: ReportMonth[];
  categories: ReportCategoryRow[];
  budgets: ReportBudgetRow[];
  topExpenses: ReportTransaction[];
  transactions: ReportTransaction[];
  transactionCount: number;
  truncated: boolean;
  filterLabels: { accounts: string[]; categories: string[] };
  recurring: ReportRecurringRow[];
};

type ReportRow = {
  id: string;
  date: Date;
  type: TransactionType;
  amount: number;
  payee: string;
  notes: string | null;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
};

const DISPLAY_LIMIT = 2000;

function dayStart(value: string): Date {
  return new Date(value + "T00:00:00");
}

function dayEnd(value: string): Date {
  return new Date(value + "T23:59:59.999");
}

function toSummary(input: {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  count: number;
}): ReportSummary {
  return {
    income: input.income,
    expense: input.expense,
    net: input.net,
    savingsRate: input.savingsRate,
    count: input.count,
  };
}

function toReportTransaction(row: ReportRow): ReportTransaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: row.amount,
    payee: row.payee,
    notes: row.notes,
    accountName: row.accountName,
    categoryName: row.categoryName,
  };
}

/**
 * Everything the PDF, the CSV, and the preview need for one report request.
 *
 * Totals come from every filtered row; only the detailed transaction table is
 * capped. ponytail: one in-memory pass over a personal user's rows. Move the
 * category/month grouping into SQL when a single user passes ~50k rows.
 */
export async function fetchReportData(
  userId: string,
  request: ReportRequest,
  userName = "",
): Promise<ReportData> {
  const db = getDb();
  const from = dayStart(request.dateFrom);
  const to = dayEnd(request.dateTo);
  const previous = previousRange({ from, to });

  const [accountRows, categoryRows, settingsRows] = await Promise.all([
    db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .orderBy(asc(accounts.sortOrder), asc(accounts.name)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({
        currency: userSettings.currency,
        locale: userSettings.locale,
        reportLogoUrl: userSettings.reportLogoUrl,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1),
  ]);

  // Only ids this user actually owns can narrow the query. Unknown ids simply
  // match nothing rather than leaking another account's existence.
  const requestedAccountIds = request.accountIds ?? [];
  const ownedAccounts = requestedAccountIds.length
    ? accountRows.filter((account) => requestedAccountIds.includes(account.id))
    : accountRows;
  const requestedCategoryIds = request.categoryIds ?? [];
  const ownedCategories = requestedCategoryIds.length
    ? categoryRows.filter((category) => requestedCategoryIds.includes(category.id))
    : categoryRows;

  const accountFilter = requestedAccountIds.length > 0;
  const categoryFilter = requestedCategoryIds.length > 0;

  const scopeConditions: SQL[] = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];

  if (accountFilter) {
    if (ownedAccounts.length === 0) {
      scopeConditions.push(sql`false`);
    } else {
      const ids = ownedAccounts.map((account) => account.id);
      const match = or(
        inArray(transactions.accountId, ids),
        inArray(transactions.transferAccountId, ids),
      );
      if (match) scopeConditions.push(match);
    }
  }

  if (categoryFilter) {
    if (ownedCategories.length === 0) {
      scopeConditions.push(sql`false`);
    } else {
      scopeConditions.push(
        inArray(
          transactions.categoryId,
          ownedCategories.map((item) => item.id),
        ),
      );
    }
  }

  function loadRows(rangeFrom: Date, rangeTo: Date): Promise<ReportRow[]> {
    return db
      .select({
        id: transactions.id,
        date: transactions.date,
        type: transactions.type,
        amount: transactions.amount,
        payee: transactions.payee,
        notes: transactions.notes,
        accountName: accounts.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(...scopeConditions, gte(transactions.date, rangeFrom), lte(transactions.date, rangeTo)),
      )
      .orderBy(asc(transactions.date), asc(transactions.createdAt));
  }

  const [allRows, previousRows] = await Promise.all([
    loadRows(from, to),
    loadRows(previous.from, previous.to),
  ]);

  const txnLikes: TxnLike[] = allRows.map((row) => ({
    type: row.type,
    amount: row.amount,
    date: row.date,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    accountId: null,
    payee: row.payee,
  }));

  const summary = toSummary(summarize(txnLikes));
  const previousSummary = toSummary(
    summarize(
      previousRows.map((row) => ({
        type: row.type,
        amount: row.amount,
        date: row.date,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        accountId: null,
        payee: row.payee,
      })),
    ),
  );

  const months = eachMonth({ from, to });
  const series = cashFlowSeries(txnLikes, months);

  const spendingByCategory = categoryBreakdown(txnLikes, 100);

  const expenseRows = allRows.filter((row) => row.type === "expense");
  const topExpenseIds = new Set(
    topExpenses(expenseRows, 10).map((txn) => (txn as { id?: string }).id),
  );
  const topExpenseRows = expenseRows
    .filter((row) => topExpenseIds.has(row.id))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const monthLabels = new Map(months.map((month) => [month.key, month.label]));
  const parentOf = new Map(categoryRows.map((category) => [category.id, category.parentId]));
  const spendByMonthCategory = new Map<string, Map<string, number>>();
  const expenseByMonth = new Map<string, number>();

  for (const row of allRows) {
    if (row.type !== "expense") continue;
    const key = monthKey(row.date);
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + row.amount);
    if (!row.categoryId) continue;
    const bucket = spendByMonthCategory.get(key) ?? new Map<string, number>();
    bucket.set(row.categoryId, (bucket.get(row.categoryId) ?? 0) + row.amount);
    const parent = parentOf.get(row.categoryId);
    if (parent) bucket.set(parent, (bucket.get(parent) ?? 0) + row.amount);
    spendByMonthCategory.set(key, bucket);
  }

  const monthKeys = months.map((month) => month.key + "-01");
  const budgetRows = monthKeys.length
    ? await db
        .select({
          id: budgets.id,
          categoryId: budgets.categoryId,
          periodMonth: budgets.periodMonth,
          amount: budgets.amount,
          categoryName: categories.name,
        })
        .from(budgets)
        .leftJoin(categories, eq(budgets.categoryId, categories.id))
        .where(
          and(
            eq(budgets.userId, userId),
            inArray(budgets.periodMonth, monthKeys),
            or(isNull(budgets.categoryId), isNull(categories.deletedAt)),
          ),
        )
        .orderBy(asc(budgets.periodMonth), asc(categories.name))
    : [];

  const ownedCategoryIds = new Set(ownedCategories.map((category) => category.id));
  const visibleBudgets = categoryFilter
    ? budgetRows.filter(
        (budget) => budget.categoryId === null || ownedCategoryIds.has(budget.categoryId),
      )
    : budgetRows;

  const budgetsData: ReportBudgetRow[] = visibleBudgets.map((budget) => {
    const key = budget.periodMonth.slice(0, 7);
    const spent = budget.categoryId
      ? (spendByMonthCategory.get(key)?.get(budget.categoryId) ?? 0)
      : (expenseByMonth.get(key) ?? 0);
    const progress = budgetProgress(spent, budget.amount, 0);
    return {
      id: budget.id,
      categoryName: budget.categoryName ?? "Overall",
      monthLabel: monthLabels.get(key) ?? key,
      budget: budget.amount,
      spent: progress.spent,
      remaining: progress.remaining,
      percent: progress.percent,
      state: progress.state,
    };
  });

  const recurringRows = await db
    .select({
      id: recurringRules.id,
      payee: recurringRules.payee,
      amount: recurringRules.amount,
      frequency: recurringRules.frequency,
      type: recurringRules.type,
      nextRunAt: recurringRules.nextRunAt,
    })
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        isNull(recurringRules.deletedAt),
        lte(recurringRules.startDate, request.dateTo),
        or(isNull(recurringRules.endDate), gte(recurringRules.endDate, request.dateFrom)),
      ),
    )
    .orderBy(asc(recurringRules.nextRunAt));

  const settingsRow = settingsRows[0];
  const currency = settingsRow?.currency ?? "PHP";
  const locale = settingsRow?.locale ?? "en-PH";
  const rangeLabel =
    formatDate(from, locale, "MMM d, yyyy") + " to " + formatDate(to, locale, "MMM d, yyyy");
  const previousLabel =
    formatDate(previous.from, locale, "MMM d, yyyy") +
    " to " +
    formatDate(previous.to, locale, "MMM d, yyyy");

  return {
    request,
    type: request.type,
    title: REPORT_TYPE_META[request.type].label + " - " + rangeLabel,
    userName: userName.trim(),
    generatedAt: new Date(),
    settings: {
      currency,
      locale,
      logoUrl: settingsRow?.reportLogoUrl ?? null,
    },
    range: { from, to, label: rangeLabel },
    previous: { ...previous, label: previousLabel },
    summary,
    previousSummary,
    change: {
      income: percentChange(summary.income, previousSummary.income),
      expense: percentChange(summary.expense, previousSummary.expense),
      net: percentChange(summary.net, previousSummary.net),
    },
    months: series,
    categories: spendingByCategory.map((category) => ({
      categoryId: category.categoryId,
      name: category.name,
      amount: category.amount,
      count: category.count,
      share: category.share,
    })),
    budgets: budgetsData,
    topExpenses: topExpenseRows.map(toReportTransaction),
    transactions: allRows.slice(0, DISPLAY_LIMIT).map(toReportTransaction),
    transactionCount: allRows.length,
    truncated: allRows.length > DISPLAY_LIMIT,
    filterLabels: {
      accounts: accountFilter ? ownedAccounts.map((account) => account.name) : [],
      categories: categoryFilter ? ownedCategories.map((category) => category.name) : [],
    },
    recurring: recurringRows,
  };
}

/** History is best-effort: a failed insert must never cost the user their PDF. */
export async function recordReport(
  userId: string,
  request: ReportRequest,
  title: string,
): Promise<void> {
  await getDb()
    .insert(reports)
    .values({
      userId,
      type: request.type,
      title: title.slice(0, 120),
      dateFrom: request.dateFrom,
      dateTo: request.dateTo,
      options: {
        accountIds: request.accountIds,
        categoryIds: request.categoryIds,
        includeTransactions: request.includeTransactions,
        includeCharts: request.includeCharts,
        paperSize: request.paperSize,
      },
    });
}

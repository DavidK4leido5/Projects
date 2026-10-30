import "server-only";

import { addDays, endOfDay, endOfMonth, startOfMonth } from "date-fns";
import { and, eq, gte, isNull, lte, or, sql, sum } from "drizzle-orm";
import {
  budgets,
  categories,
  notifications,
  recurringRules,
  transactions,
  type NotificationType,
} from "@repo/db/schema";
import { formatDate, formatMoney, monthKey, toDateInput } from "@repo/finance";
import { getDbPool } from "@/lib/db";

type Tx = Parameters<Parameters<ReturnType<typeof getDbPool>["transaction"]>[0]>[0];

/**
 * Refreshes reminders for one user when they open the app. There is no
 * scheduler: a record book should only show reminders while the owner is using
 * it, and nothing posts a transaction without an explicit action.
 *
 * An advisory lock per user keeps two concurrent layouts from inserting the
 * same unread reminder twice.
 */
export async function syncReminders(userId: string): Promise<void> {
  const now = new Date();

  await getDbPool().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    await syncBillReminders(tx, userId, now);
    await syncBudgetAlerts(tx, userId, now);
  });
}

/**
 * Recently created reminders with these titles already exist, read or unread.
 * Without the read check, marking all read immediately re-inserted the same
 * alerts on the next refresh. Seven days lets a monthly bill alert again.
 */
async function recentTitles(
  tx: Tx,
  userId: string,
  type: NotificationType,
  now: Date,
): Promise<Set<string>> {
  const rows = await tx
    .select({ title: notifications.title })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, type),
        gte(notifications.createdAt, addDays(now, -7)),
      ),
    );

  return new Set(rows.map((row) => row.title));
}

async function syncBillReminders(tx: Tx, userId: string, now: Date): Promise<void> {
  const rules = await tx
    .select({
      id: recurringRules.id,
      payee: recurringRules.payee,
      amount: recurringRules.amount,
      currency: recurringRules.currency,
      nextRunAt: recurringRules.nextRunAt,
    })
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        isNull(recurringRules.deletedAt),
        gte(recurringRules.nextRunAt, now),
        lte(recurringRules.nextRunAt, endOfDay(addDays(now, 3))),
        or(isNull(recurringRules.endDate), gte(recurringRules.endDate, toDateInput(now))),
      ),
    )
    .limit(20);

  if (rules.length === 0) return;

  const seen = await recentTitles(tx, userId, "bill_due", now);
  const rows = rules
    .map((rule) => ({
      userId,
      type: "bill_due" as const,
      title: ("Bill due: " + rule.payee).slice(0, 120),
      body:
        rule.payee +
        " is due " +
        formatDate(rule.nextRunAt) +
        " · " +
        formatMoney(rule.amount, rule.currency),
      metadata: { ruleId: rule.id },
    }))
    .filter((row) => !seen.has(row.title));

  if (rows.length > 0) await tx.insert(notifications).values(rows);
}

async function syncBudgetAlerts(tx: Tx, userId: string, now: Date): Promise<void> {
  const periodMonth = monthKey(now) + "-01";

  const [budgetRows, spendRows] = await Promise.all([
    tx
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        amount: budgets.amount,
        currency: budgets.currency,
        categoryName: categories.name,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.periodMonth, periodMonth)))
      .limit(50),
    tx
      .select({ categoryId: transactions.categoryId, total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          isNull(transactions.deletedAt),
          gte(transactions.date, startOfMonth(now)),
          lte(transactions.date, endOfMonth(now)),
        ),
      )
      .groupBy(transactions.categoryId),
  ]);

  if (budgetRows.length === 0) return;

  const byCategory = new Map<string, number>();
  let totalSpent = 0;
  for (const row of spendRows) {
    const total = Number(row.total ?? 0);
    totalSpent += total;
    if (row.categoryId) byCategory.set(row.categoryId, total);
  }

  const exceeded = budgetRows
    .map((budget) => ({
      budget,
      spent: budget.categoryId ? (byCategory.get(budget.categoryId) ?? 0) : totalSpent,
    }))
    .filter(({ budget, spent }) => spent > budget.amount);

  if (exceeded.length === 0) return;

  const seen = await recentTitles(tx, userId, "budget_alert", now);
  const rows = exceeded
    .map(({ budget, spent }) => ({
      userId,
      type: "budget_alert" as const,
      title: budget.categoryName
        ? ("Budget exceeded: " + budget.categoryName).slice(0, 120)
        : "Monthly budget exceeded",
      body:
        formatMoney(spent, budget.currency) +
        " spent of " +
        formatMoney(budget.amount, budget.currency) +
        " this month.",
      metadata: { budgetId: budget.id },
    }))
    .filter((row) => !seen.has(row.title));

  if (rows.length > 0) await tx.insert(notifications).values(rows);
}

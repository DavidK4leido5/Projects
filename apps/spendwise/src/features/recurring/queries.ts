import "server-only";

import { addDays, endOfDay, startOfDay } from "date-fns";
import { and, asc, desc, eq, gte, isNull, isNotNull, lte, or } from "drizzle-orm";
import {
  accounts,
  categories,
  recurringRules,
  transactions,
  type TransactionType,
} from "@repo/db/schema";
import { toDateInput } from "@repo/finance";
import { monthlyAmount, type RuleFormSource } from "@/features/recurring/rule-meta";
import { getDb } from "@/lib/db";

export type RecurringRuleRow = RuleFormSource & {
  notes: string | null;
  endDate: string | null;
  nextRunAt: Date;
  lastRunAt: Date | null;
  active: boolean;
  accountName: string;
  categoryName: string | null;
  categoryColor: string | null;
};

export type UpcomingBill = {
  id: string;
  payee: string;
  type: TransactionType;
  amount: number;
  currency: string;
  nextRunAt: Date;
  frequency: RecurringRuleRow["frequency"];
  interval: number;
  dayOfMonth: number | null;
  weekday: number | null;
  accountName: string;
};

const ruleSelection = {
  id: recurringRules.id,
  type: recurringRules.type,
  amount: recurringRules.amount,
  currency: recurringRules.currency,
  payee: recurringRules.payee,
  accountId: recurringRules.accountId,
  categoryId: recurringRules.categoryId,
  paymentMethod: recurringRules.paymentMethod,
  frequency: recurringRules.frequency,
  interval: recurringRules.interval,
  dayOfMonth: recurringRules.dayOfMonth,
  weekday: recurringRules.weekday,
  startDate: recurringRules.startDate,
  notes: recurringRules.notes,
  endDate: recurringRules.endDate,
  nextRunAt: recurringRules.nextRunAt,
  lastRunAt: recurringRules.lastRunAt,
  active: recurringRules.active,
  accountName: accounts.name,
  categoryName: categories.name,
  categoryColor: categories.color,
};

export async function listRules(userId: string): Promise<RecurringRuleRow[]> {
  const rows = await getDb()
    .select(ruleSelection)
    .from(recurringRules)
    .innerJoin(accounts, eq(recurringRules.accountId, accounts.id))
    .leftJoin(categories, eq(recurringRules.categoryId, categories.id))
    .where(and(eq(recurringRules.userId, userId), isNull(recurringRules.deletedAt)))
    .orderBy(desc(recurringRules.active), asc(recurringRules.nextRunAt), asc(recurringRules.payee));

  // Rules can never be transfers; the schema still types the column wide.
  return rows.map((row) => ({ ...row, type: row.type === "income" ? "income" : "expense" }));
}

/**
 * Active bills due in the window, plus anything overdue. Ordered oldest first
 * so the most overdue bill is the first thing on the page.
 */
export async function listUpcomingBills(
  userId: string,
  days: number = 30,
): Promise<UpcomingBill[]> {
  const now = new Date();
  return getDb()
    .select({
      id: recurringRules.id,
      payee: recurringRules.payee,
      type: recurringRules.type,
      amount: recurringRules.amount,
      currency: recurringRules.currency,
      nextRunAt: recurringRules.nextRunAt,
      frequency: recurringRules.frequency,
      interval: recurringRules.interval,
      dayOfMonth: recurringRules.dayOfMonth,
      weekday: recurringRules.weekday,
      accountName: accounts.name,
    })
    .from(recurringRules)
    .innerJoin(accounts, eq(recurringRules.accountId, accounts.id))
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        isNull(recurringRules.deletedAt),
        lte(recurringRules.nextRunAt, endOfDay(addDays(now, days))),
        or(isNull(recurringRules.endDate), gte(recurringRules.endDate, toDateInput(now))),
      ),
    )
    .orderBy(asc(recurringRules.nextRunAt))
    .limit(20);
}

export type RecurringStats = {
  activeCount: number;
  dueThisWeek: number;
  overdueCount: number;
  monthlyCost: number;
};

export async function getRecurringStats(userId: string): Promise<RecurringStats> {
  const now = new Date();
  const today = startOfDay(now);
  const weekEnd = endOfDay(addDays(now, 7));

  const rows = await getDb()
    .select({
      type: recurringRules.type,
      amount: recurringRules.amount,
      frequency: recurringRules.frequency,
      interval: recurringRules.interval,
      nextRunAt: recurringRules.nextRunAt,
    })
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        isNull(recurringRules.deletedAt),
      ),
    );

  let dueThisWeek = 0;
  let overdueCount = 0;
  let monthlyCost = 0;

  for (const row of rows) {
    if (row.nextRunAt <= weekEnd) dueThisWeek += 1;
    if (row.nextRunAt < today) overdueCount += 1;
    if (row.type === "expense") monthlyCost += monthlyAmount(row);
  }

  return { activeCount: rows.length, dueThisWeek, overdueCount, monthlyCost };
}

/** Most recent transaction posted by a rule, for the "last posted" hint. */
export async function getLastPosted(userId: string) {
  const [row] = await getDb()
    .select({
      id: transactions.id,
      payee: transactions.payee,
      amount: transactions.amount,
      currency: transactions.currency,
      date: transactions.date,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        isNotNull(transactions.recurringRuleId),
      ),
    )
    .orderBy(desc(transactions.date))
    .limit(1);

  return row ?? null;
}

import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  subDays,
} from "date-fns";
import { monthKey } from "./period";

export type TxnLike = {
  type: "income" | "expense" | "transfer";
  amount: number;
  date: Date | string;
  currency?: string;
  accountId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  payee?: string | null;
};

type Summary = { income: number; expense: number; net: number; savingsRate: number; count: number };
type MonthSeries = { key: string; label: string; income: number; expense: number; net: number };
type CategoryRow = {
  categoryId: string | null;
  name: string;
  amount: number;
  count: number;
  share: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Income, expense and net for the period. Transfers never count as flow. */
export function summarize(txns: TxnLike[]): Summary {
  let income = 0;
  let expense = 0;
  let count = 0;

  for (const txn of txns) {
    if (txn.type === "transfer") continue;
    count += 1;
    if (txn.type === "income") income += txn.amount;
    else expense += txn.amount;
  }

  const net = income - expense;
  return {
    income,
    expense,
    net,
    savingsRate: income === 0 ? 0 : round1((net / income) * 100),
    count,
  };
}

/** Income/expense per month bucket, aligned to the supplied months. */
export function cashFlowSeries(
  txns: TxnLike[],
  months: { key: string; label: string; from: Date; to: Date }[],
): MonthSeries[] {
  const buckets = new Map<string, { income: number; expense: number }>();
  for (const month of months) buckets.set(month.key, { income: 0, expense: 0 });

  for (const txn of txns) {
    if (txn.type === "transfer") continue;
    const bucket = buckets.get(monthKey(toDate(txn.date)));
    if (!bucket) continue;
    if (txn.type === "income") bucket.income += txn.amount;
    else bucket.expense += txn.amount;
  }

  return months.map((month) => {
    const bucket = buckets.get(month.key) ?? { income: 0, expense: 0 };
    return {
      key: month.key,
      label: month.label,
      income: bucket.income,
      expense: bucket.expense,
      net: bucket.income - bucket.expense,
    };
  });
}

/** Expense totals by category, largest first, with percent share of all expenses. */
export function categoryBreakdown(txns: TxnLike[], limit: number = 8): CategoryRow[] {
  const groups = new Map<
    string,
    { categoryId: string | null; name: string; amount: number; count: number }
  >();
  let total = 0;

  for (const txn of txns) {
    if (txn.type !== "expense") continue;
    const categoryId = txn.categoryId ?? null;
    const name = categoryId ? txn.categoryName?.trim() || "Uncategorized" : "Uncategorized";
    const key = categoryId ?? "uncategorized";
    const group = groups.get(key);

    if (group) {
      group.amount += txn.amount;
      group.count += 1;
    } else {
      groups.set(key, { categoryId, name, amount: txn.amount, count: 1 });
    }
    total += txn.amount;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      share: total > 0 ? round1((group.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, Math.max(0, limit));
}

/** Largest expenses first. */
export function topExpenses(txns: TxnLike[], limit: number = 10): TxnLike[] {
  return txns
    .filter((txn) => txn.type === "expense")
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, Math.max(0, limit));
}

/**
 * Balance after each transaction, oldest first. Transfers leave the balance
 * untouched, which is correct for a single-account view.
 */
export function runningBalance(
  startingBalance: number,
  txns: TxnLike[],
): { date: Date; balance: number }[] {
  const sorted = txns
    .map((txn) => ({ txn, date: toDate(txn.date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = startingBalance;
  return sorted.map(({ txn, date }) => {
    if (txn.type === "income") balance += txn.amount;
    else if (txn.type === "expense") balance -= txn.amount;
    return { date, balance };
  });
}

export type BudgetState = "on_track" | "near_limit" | "exceeded";

export function budgetProgress(
  spent: number,
  limit: number,
  rolloverCarry: number = 0,
): {
  spent: number;
  limit: number;
  effectiveLimit: number;
  remaining: number;
  percent: number;
  state: BudgetState;
} {
  const effectiveLimit = limit + rolloverCarry;
  const percent = effectiveLimit > 0 ? round1((spent / effectiveLimit) * 100) : spent > 0 ? 100 : 0;
  const state: BudgetState = percent > 100 ? "exceeded" : percent >= 80 ? "near_limit" : "on_track";

  return { spent, limit, effectiveLimit, remaining: effectiveLimit - spent, percent, state };
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return current > 0 ? 100 : -100;
  }
  return round1(((current - previous) / Math.abs(previous)) * 100);
}

/** Credit card balances are liabilities; every other account is an asset. */
export function netWorth(accounts: { type: string; balance: number }[]): {
  assets: number;
  liabilities: number;
  net: number;
} {
  let assets = 0;
  let liabilities = 0;

  for (const account of accounts) {
    if (account.type === "credit_card") liabilities += Math.abs(account.balance);
    else assets += account.balance;
  }

  return { assets, liabilities, net: assets - liabilities };
}

export type RecurringCandidate = {
  payee: string;
  amount: number;
  frequency: "weekly" | "monthly";
  occurrences: number;
  lastDate: Date;
  nextDate: Date;
  confidence: number;
};

type DatedTxn = { txn: TxnLike; date: Date };

function normalizePayee(payee: string | null | undefined): string {
  return (payee ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function amountsWithin(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * 0.05;
}

function clusterByAmount(entries: DatedTxn[]): DatedTxn[][] {
  const clusters: { amount: number; entries: DatedTxn[] }[] = [];

  for (const entry of entries) {
    const amount = Math.abs(entry.txn.amount);
    const match = clusters.find((cluster) => amountsWithin(cluster.amount, amount));
    if (match) match.entries.push(entry);
    else clusters.push({ amount, entries: [entry] });
  }

  return clusters.map((cluster) => cluster.entries);
}

/**
 * Finds repeating expenses. Requires 3+ occurrences on a normalized payee with
 * amounts within 5% of each other, and a median gap of 5-9 (weekly) or 25-35
 * (monthly) days.
 */
export function detectRecurring(txns: TxnLike[], now: Date = new Date()): RecurringCandidate[] {
  const groups = new Map<string, DatedTxn[]>();

  for (const txn of txns) {
    if (txn.type !== "expense") continue;
    const payee = normalizePayee(txn.payee);
    if (!payee) continue;
    const date = toDate(txn.date);
    if (Number.isNaN(date.getTime()) || date > now) continue;
    const entries = groups.get(payee) ?? [];
    entries.push({ txn, date });
    groups.set(payee, entries);
  }

  const candidates: RecurringCandidate[] = [];

  for (const [payee, entries] of groups) {
    for (const cluster of clusterByAmount(entries)) {
      if (cluster.length < 3) continue;

      const sorted = [...cluster].sort((a, b) => a.date.getTime() - b.date.getTime());
      const gaps: number[] = [];
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        if (!previous || !current) continue;
        gaps.push(differenceInCalendarDays(current.date, previous.date));
      }

      const gap = median(gaps);
      const frequency: "weekly" | "monthly" | null =
        gap >= 5 && gap <= 9 ? "weekly" : gap >= 25 && gap <= 35 ? "monthly" : null;
      if (!frequency) continue;

      const last = sorted[sorted.length - 1];
      if (!last) continue;

      const mean = average(gaps);
      const deviation = average(gaps.map((value) => Math.abs(value - mean)));
      const regularity = mean > 0 ? Math.max(0, 1 - deviation / mean) : 0;
      const confidence = round2(
        Math.min(1, 0.4 + 0.4 * regularity + Math.min(0.2, (sorted.length - 3) * 0.05)),
      );

      candidates.push({
        payee: last.txn.payee ?? payee,
        amount: Math.round(average(cluster.map((entry) => entry.txn.amount))),
        frequency,
        occurrences: sorted.length,
        lastDate: last.date,
        nextDate: frequency === "weekly" ? addWeeks(last.date, 1) : addMonths(last.date, 1),
        confidence,
      });
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

export function goalProjection(
  contributions: { date: Date | string; amount: number }[],
  target: number,
  now: Date = new Date(),
): { contributed: number; monthlyPace: number; projectedDate: Date | null; percent: number } {
  const windowStart = subDays(now, 90);
  let contributed = 0;
  let recent = 0;

  for (const contribution of contributions) {
    contributed += contribution.amount;
    const date = toDate(contribution.date);
    if (date >= windowStart && date <= now) recent += contribution.amount;
  }

  const monthlyPace = Math.round(recent / 3);
  const percent = target > 0 ? round1((contributed / target) * 100) : 0;

  if (target <= 0 || monthlyPace <= 0) {
    return { contributed, monthlyPace, projectedDate: null, percent };
  }

  const remaining = target - contributed;
  if (remaining <= 0) return { contributed, monthlyPace, projectedDate: new Date(now), percent };

  return {
    contributed,
    monthlyPace,
    projectedDate: addMonths(now, Math.ceil(remaining / monthlyPace)),
    percent,
  };
}

function advanceRun(date: Date, frequency: string): Date {
  switch (frequency) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addWeeks(date, 1);
    case "biweekly":
      return addWeeks(date, 2);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addMonths(date, 3);
    case "yearly":
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
}

function dueRuns(nextRunAt: Date, frequency: string, from: Date, to: Date): Date[] {
  const runs: Date[] = [];
  let runAt = nextRunAt;

  // ponytail: 366-step guard; a daily rule older than a year is rare here.
  for (let step = 0; step < 366 && runAt <= to; step += 1) {
    if (runAt >= from) runs.push(runAt);
    const next = advanceRun(runAt, frequency);
    if (next.getTime() === runAt.getTime()) break;
    runAt = next;
  }

  return runs;
}

/**
 * Projects the next 30/60/90 days from average recent daily flow plus any
 * recurring runs due in the window. Rounded to whole minor units.
 */
export function forecastCashFlow(args: {
  today: Date;
  days: 30 | 60 | 90;
  currentBalance: number;
  recentIncome: number;
  recentExpense: number;
  recurring: { amount: number; type: "income" | "expense"; nextRunAt: Date; frequency: string }[];
}): {
  projectedIncome: number;
  projectedExpense: number;
  projectedNet: number;
  endingBalance: number;
} {
  const windowEnd = addDays(args.today, args.days);
  let income = (args.recentIncome / 30) * args.days;
  let expense = (args.recentExpense / 30) * args.days;

  for (const rule of args.recurring) {
    for (const _runAt of dueRuns(rule.nextRunAt, rule.frequency, args.today, windowEnd)) {
      if (rule.type === "income") income += rule.amount;
      else expense += rule.amount;
    }
  }

  const projectedIncome = Math.round(income);
  const projectedExpense = Math.round(expense);
  const projectedNet = projectedIncome - projectedExpense;

  return {
    projectedIncome,
    projectedExpense,
    projectedNet,
    endingBalance: args.currentBalance + projectedNet,
  };
}

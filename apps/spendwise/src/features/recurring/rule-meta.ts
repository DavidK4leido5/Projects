import type { PaymentMethod, RecurringFrequency, TransactionType } from "@repo/db/schema";

export const RULE_FREQUENCIES: RecurringFrequency[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

export const FREQUENCY_UNITS: Record<RecurringFrequency, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
  custom: "day",
};

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function ordinal(day: number): string {
  const tens = day % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][day % 10] ?? "th");
  return day + suffix;
}

/** "Every 2 weeks on Monday", "Monthly on the 15th". */
export function scheduleLabel(rule: {
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth: number | null;
  weekday: number | null;
}): string {
  const base =
    rule.interval > 1
      ? "Every " + rule.interval + " " + FREQUENCY_UNITS[rule.frequency] + "s"
      : FREQUENCY_LABELS[rule.frequency];

  if (rule.frequency === "weekly" && rule.weekday != null) {
    return base + " on " + (WEEKDAY_LABELS[rule.weekday] ?? "that day");
  }
  if (rule.frequency === "monthly" && rule.dayOfMonth != null) {
    return base + " on the " + ordinal(rule.dayOfMonth);
  }
  return base;
}

/**
 * Normalized monthly figure for stat cards. Division is display-only, like
 * formatMoney: nothing stored or posted is ever fractional.
 *
 * ponytail: averages 365/12 days per month; good enough for a headline number.
 */
export function monthlyAmount(rule: {
  amount: number;
  frequency: RecurringFrequency;
  interval: number;
}): number {
  const interval = Math.max(1, rule.interval);
  switch (rule.frequency) {
    case "daily":
      return Math.round((rule.amount / interval) * (365 / 12));
    case "weekly":
      return Math.round((rule.amount / interval) * (52 / 12));
    case "yearly":
      return Math.round(rule.amount / interval / 12);
    case "custom":
      return Math.round((rule.amount / interval) * 30);
    default:
      return Math.round(rule.amount / interval);
  }
}

/** What the edit dialog needs from a stored rule. */
export type RuleFormSource = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  payee: string;
  accountId: string;
  categoryId: string | null;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth: number | null;
  weekday: number | null;
  startDate: string;
};

/** Rules can never be transfers, so anything else reads as an expense here. */
export function toFormSource(rule: {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  payee: string;
  accountId: string;
  categoryId: string | null;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth: number | null;
  weekday: number | null;
  startDate: string;
}): RuleFormSource {
  return {
    id: rule.id,
    type: rule.type === "income" ? "income" : "expense",
    amount: rule.amount,
    currency: rule.currency,
    payee: rule.payee,
    accountId: rule.accountId,
    categoryId: rule.categoryId,
    paymentMethod: rule.paymentMethod,
    frequency: rule.frequency,
    interval: rule.interval,
    dayOfMonth: rule.dayOfMonth,
    weekday: rule.weekday,
    startDate: rule.startDate,
  };
}

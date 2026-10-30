import { addMonths } from "date-fns";
import { monthKey } from "@repo/finance";

/** Budgets are keyed by the first day of the month in the database. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** The month key shifted by whole months, in local time. */
export function shiftMonth(month: string, delta: number): string {
  const [year = "1970", monthNumber = "1"] = month.split("-");
  return monthKey(addMonths(new Date(Number(year), Number(monthNumber) - 1, 1), delta));
}

export function monthAnchor(month: string): Date {
  const [year = "1970", monthNumber = "1"] = month.split("-");
  return new Date(Number(year), Number(monthNumber) - 1, 1);
}

import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isSameDay as isSameDayDate,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { enGB, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

export { startOfMonth, endOfMonth };

export type PeriodPreset =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "ytd"
  | "last_12_months"
  | "all_time";

export type DateRange = { from: Date; to: Date };

function monthRange(anchor: Date): DateRange {
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

/**
 * Resolves a preset to whole local days: from 00:00:00.000 to 23:59:59.999.
 */
export function resolvePreset(preset: PeriodPreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case "this_month":
      return monthRange(now);
    case "last_month":
      return monthRange(subMonths(now, 1));
    case "last_3_months":
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    case "last_6_months":
      return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) };
    case "last_12_months":
      return { from: startOfMonth(subMonths(now, 11)), to: endOfMonth(now) };
    case "ytd":
      return { from: startOfYear(now), to: endOfDay(now) };
    case "all_time":
      return { from: new Date(1970, 0, 1), to: endOfDay(now) };
  }
}

/** Inclusive day count, e.g. Mar 1 - Mar 31 is 31. */
export function rangeDays(range: DateRange): number {
  return Math.max(0, differenceInCalendarDays(range.to, range.from) + 1);
}

/** The same number of whole days immediately before the given range. */
export function previousRange(range: DateRange): DateRange {
  const days = Math.max(1, rangeDays(range));
  return { from: startOfDay(subDays(range.from, days)), to: endOfDay(subDays(range.from, 1)) };
}

/** "2026-10" */
export function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

/** One bucket per calendar month touched by the range, labelled "MMM yyyy". */
export function eachMonth(
  range: DateRange,
): { key: string; label: string; from: Date; to: Date }[] {
  if (rangeDays(range) <= 0) return [];
  return eachMonthOfInterval({ start: range.from, end: range.to }).map((month) => ({
    key: monthKey(month),
    label: format(month, "MMM yyyy"),
    from: startOfMonth(month),
    to: endOfMonth(month),
  }));
}

const DATE_LOCALES: Record<string, Locale> = {
  "en-ph": enUS,
  "en-us": enUS,
  "en-gb": enGB,
};

export function formatDate(
  value: Date | string,
  locale: string = "en-PH",
  pattern: string = "MMM d, yyyy",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, pattern, { locale: DATE_LOCALES[locale.toLowerCase()] ?? enUS });
}

/** "2026-10-30" for <input type="date">. */
export function toDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isSameDay(a: Date, b: Date): boolean {
  return isSameDayDate(a, b);
}

export function clampToRange(date: Date, range: DateRange): Date {
  if (date < range.from) return range.from;
  if (date > range.to) return range.to;
  return date;
}

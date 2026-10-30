import { addDays, addMonths, addWeeks, addYears, getDaysInMonth, setDate, setDay } from "date-fns";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type RecurrenceOptions = {
  /** Every N units. Custom means every N days. */
  interval?: number;
  /** Monthly anchor, 1-31. Clamped to shorter months. */
  dayOfMonth?: number | null;
  /** 0 = Sunday. Applied after advancing a week. */
  weekday?: number | null;
};

/** The next run strictly after `from`. */
export function nextOccurrence(
  from: Date,
  frequency: RecurrenceFrequency,
  options: RecurrenceOptions = {},
): Date {
  const interval = Math.max(1, Math.floor(options.interval ?? 1));

  switch (frequency) {
    case "daily":
      return addDays(from, interval);
    case "weekly": {
      const advanced = addWeeks(from, interval);
      return options.weekday == null
        ? advanced
        : setDay(advanced, options.weekday, { weekStartsOn: 0 });
    }
    case "monthly": {
      const advanced = addMonths(from, interval);
      if (options.dayOfMonth == null) return advanced;
      return setDate(advanced, Math.min(options.dayOfMonth, getDaysInMonth(advanced)));
    }
    case "yearly":
      return addYears(from, interval);
    case "custom":
      return addDays(from, interval);
  }
}

/**
 * Runs due between `from` and `to`, starting at `nextRunAt`. Capped so a
 * misconfigured rule cannot loop forever.
 */
export function occurrencesBetween(
  nextRunAt: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  from: Date,
  to: Date,
  max = 120,
): Date[] {
  const runs: Date[] = [];
  let cursor = nextRunAt;

  while (cursor < from && runs.length < max) {
    cursor = nextOccurrence(cursor, frequency, { interval });
  }

  while (cursor <= to && runs.length < max) {
    runs.push(cursor);
    cursor = nextOccurrence(cursor, frequency, { interval });
  }

  return runs;
}

/** Advances a rule's cursor past `now`, including any missed runs. */
export function advanceCursor(
  nextRunAt: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  now: Date,
): Date {
  let cursor = nextRunAt;
  let guard = 0;
  while (cursor <= now && guard < 1000) {
    cursor = nextOccurrence(cursor, frequency, { interval });
    guard += 1;
  }
  return cursor;
}

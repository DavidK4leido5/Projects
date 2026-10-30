import { addDays, addMonths, getDaysInMonth, setDate, startOfDay } from "date-fns";
import { nextOccurrence, type RecurrenceFrequency } from "@repo/finance";

export type Schedule = {
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfMonth?: number | null;
  weekday?: number | null;
};

/** Rules post at 09:00 local, so a due date reads as a day rather than an instant. */
function atRunTime(date: Date): Date {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return next;
}

function anchoredToDay(date: Date, dayOfMonth: number): Date {
  return atRunTime(setDate(date, Math.min(dayOfMonth, getDaysInMonth(date))));
}

/** The first scheduled run on or after the rule's start date. */
export function firstOccurrence(startDate: string, schedule: Schedule): Date {
  const start = atRunTime(new Date(startDate + "T00:00:00"));
  if (Number.isNaN(start.getTime())) throw new Error("That start date is not valid.");

  if (schedule.frequency === "weekly" && schedule.weekday != null) {
    let candidate = start;
    for (let step = 0; step < 7 && candidate.getDay() !== schedule.weekday; step += 1) {
      candidate = atRunTime(addDays(candidate, 1));
    }
    return candidate;
  }

  if (schedule.frequency === "monthly" && schedule.dayOfMonth != null) {
    const thisMonth = anchoredToDay(start, schedule.dayOfMonth);
    return thisMonth.getTime() >= start.getTime()
      ? thisMonth
      : anchoredToDay(addMonths(start, 1), schedule.dayOfMonth);
  }

  return start;
}

/** One step forward. Monthly anchors stay on their day instead of drifting. */
export function advanceRun(from: Date, schedule: Schedule): Date {
  const next = nextOccurrence(from, schedule.frequency, {
    interval: schedule.interval,
    dayOfMonth: schedule.dayOfMonth ?? null,
    weekday: schedule.weekday ?? null,
  });

  // nextOccurrence also clamps to the source month, so a 31st rule would stick
  // to the 28th after February. Re-anchor inside the month it landed on.
  if (schedule.frequency === "monthly" && schedule.dayOfMonth != null) {
    return anchoredToDay(next, schedule.dayOfMonth);
  }
  return atRunTime(next);
}

/** The rule's next run on or after today, skipping occurrences already past. */
export function nextRunFrom(startDate: string, schedule: Schedule, now: Date): Date {
  const floor = atRunTime(startOfDay(now));
  let cursor = firstOccurrence(startDate, schedule);

  // ponytail: 4000 steps covers roughly ten years of daily rules.
  for (let step = 0; step < 4000 && cursor.getTime() < floor.getTime(); step += 1) {
    cursor = advanceRun(cursor, schedule);
  }
  return cursor;
}

/** Skips occurrences that came due while the rule was paused. */
export function advancePast(nextRunAt: Date, schedule: Schedule, now: Date): Date {
  const floor = atRunTime(startOfDay(now));
  let cursor = nextRunAt;

  for (let step = 0; step < 4000 && cursor.getTime() < floor.getTime(); step += 1) {
    cursor = advanceRun(cursor, schedule);
  }
  return cursor;
}

export function scheduleOf(rule: {
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfMonth: number | null;
  weekday: number | null;
}): Schedule {
  return {
    frequency: rule.frequency,
    interval: rule.interval,
    dayOfMonth: rule.dayOfMonth,
    weekday: rule.weekday,
  };
}

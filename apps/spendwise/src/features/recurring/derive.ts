import { addDays, endOfDay, startOfDay } from "date-fns";
import { toDateInput } from "@repo/finance";
import { monthlyAmount } from "@/features/recurring/rule-meta";
import type { RecurringRuleRow, RecurringStats, UpcomingBill } from "@/features/recurring/queries";

/**
 * Stats and upcoming bills derived from the full rule list, so the optimistic
 * rows and the headline numbers cannot drift apart.
 */
export function deriveStats(rules: RecurringRuleRow[], now: Date = new Date()): RecurringStats {
  const today = startOfDay(now);
  const weekEnd = endOfDay(addDays(now, 7));

  let activeCount = 0;
  let dueThisWeek = 0;
  let overdueCount = 0;
  let monthlyCost = 0;

  for (const rule of rules) {
    if (!rule.active) continue;
    activeCount += 1;
    if (rule.nextRunAt <= weekEnd) dueThisWeek += 1;
    if (rule.nextRunAt < today) overdueCount += 1;
    if (rule.type === "expense") monthlyCost += monthlyAmount(rule);
  }

  return { activeCount, dueThisWeek, overdueCount, monthlyCost };
}

/** Active bills due in the window plus anything overdue, oldest first. */
export function deriveBills(
  rules: RecurringRuleRow[],
  days: number = 30,
  now: Date = new Date(),
): UpcomingBill[] {
  const until = endOfDay(addDays(now, days));
  const today = toDateInput(now);

  return rules
    .filter(
      (rule) =>
        rule.active && rule.nextRunAt <= until && (rule.endDate == null || rule.endDate >= today),
    )
    .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
    .slice(0, 20)
    .map((rule) => ({
      id: rule.id,
      payee: rule.payee,
      type: rule.type,
      amount: rule.amount,
      currency: rule.currency,
      nextRunAt: rule.nextRunAt,
      frequency: rule.frequency,
      interval: rule.interval,
      dayOfMonth: rule.dayOfMonth,
      weekday: rule.weekday,
      accountName: rule.accountName,
    }));
}

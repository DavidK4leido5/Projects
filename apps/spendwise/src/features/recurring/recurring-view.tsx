"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startOfDay } from "date-fns";
import { CalendarClock, Check, PiggyBank, Plus, Repeat } from "lucide-react";
import { toast } from "sonner";
import {
  AmountText,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  StatCard,
} from "@repo/ui";
import { formatDate, formatMoney, toDateInput } from "@repo/finance";
import { cn } from "@repo/shared";
import {
  createRule,
  deleteRule,
  markPaid,
  toggleRule,
  updateRule,
} from "@/features/recurring/actions";
import { deriveBills, deriveStats } from "@/features/recurring/derive";
import { RuleActions } from "@/features/recurring/rule-actions";
import { RuleDialog, type RuleFormValues } from "@/features/recurring/rule-dialog";
import { scheduleLabel } from "@/features/recurring/rule-meta";
import { advancePast, advanceRun, nextRunFrom, scheduleOf } from "@/features/recurring/schedule";
import type { RecurringRuleRow } from "@/features/recurring/queries";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

type RuleMutation =
  | { type: "save"; row: RecurringRuleRow }
  | { type: "delete"; id: string }
  | { type: "toggle"; id: string; active: boolean; nextRunAt: Date }
  | { type: "paid"; id: string; nextRunAt: Date; lastRunAt: Date; active: boolean };

/** Matches the query order: active first, then the soonest run. */
function sortRules(rules: RecurringRuleRow[]): RecurringRuleRow[] {
  return [...rules].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      a.nextRunAt.getTime() - b.nextRunAt.getTime() ||
      a.payee.localeCompare(b.payee),
  );
}

function reduce(rules: RecurringRuleRow[], action: RuleMutation): RecurringRuleRow[] {
  switch (action.type) {
    case "save": {
      const exists = rules.some((rule) => rule.id === action.row.id);
      return sortRules(
        exists
          ? rules.map((rule) => (rule.id === action.row.id ? action.row : rule))
          : [...rules, action.row],
      );
    }
    case "delete":
      return rules.filter((rule) => rule.id !== action.id);
    case "toggle":
      return sortRules(
        rules.map((rule) =>
          rule.id === action.id
            ? { ...rule, active: action.active, nextRunAt: action.nextRunAt }
            : rule,
        ),
      );
    case "paid":
      return sortRules(
        rules.map((rule) =>
          rule.id === action.id
            ? {
                ...rule,
                nextRunAt: action.nextRunAt,
                lastRunAt: action.lastRunAt,
                active: action.active,
              }
            : rule,
        ),
      );
  }
}

export function RecurringView({
  rules,
  accounts,
  categories,
  currency,
  locale,
}: {
  rules: RecurringRuleRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [optimisticRules, apply] = useOptimistic(rules, reduce);
  const [, startMutation] = useTransition();

  const stats = deriveStats(optimisticRules);
  const bills = deriveBills(optimisticRules);
  const today = startOfDay(new Date());
  const lastPosted = [...optimisticRules]
    .filter((rule) => rule.lastRunAt != null)
    .sort((a, b) => b.lastRunAt!.getTime() - a.lastRunAt!.getTime())[0];

  const newRuleDialog = (
    <RuleDialog
      accounts={accounts}
      categories={categories}
      currency={currency}
      locale={locale}
      onSave={(values) => saveRule(values)}
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden />
          New rule
        </Button>
      }
    />
  );

  function draftRule(values: RuleFormValues, existing?: RecurringRuleRow): RecurringRuleRow {
    const schedule = {
      frequency: values.frequency,
      interval: values.interval,
      dayOfMonth: values.dayOfMonth,
      weekday: values.weekday,
    };
    const scheduleChanged =
      !existing ||
      existing.frequency !== values.frequency ||
      existing.interval !== values.interval ||
      existing.dayOfMonth !== values.dayOfMonth ||
      existing.weekday !== values.weekday ||
      existing.startDate !== values.startDate;
    const account = accounts.find((entry) => entry.id === values.accountId);
    const category = categories.find((entry) => entry.id === values.categoryId);

    return {
      id: existing?.id ?? "optimistic-" + crypto.randomUUID(),
      type: values.type,
      amount: values.amount,
      currency: values.currency,
      payee: values.payee,
      accountId: values.accountId,
      categoryId: values.categoryId,
      paymentMethod: values.paymentMethod,
      frequency: values.frequency,
      interval: values.interval,
      dayOfMonth: values.dayOfMonth,
      weekday: values.weekday,
      startDate: values.startDate,
      notes: values.notes,
      endDate: values.endDate,
      nextRunAt: scheduleChanged
        ? nextRunFrom(values.startDate, schedule, new Date())
        : existing.nextRunAt,
      lastRunAt: existing?.lastRunAt ?? null,
      active: existing?.active ?? true,
      accountName: account?.name ?? existing?.accountName ?? "Account",
      categoryName: values.categoryId ? (category?.name ?? null) : null,
      categoryColor: existing?.categoryColor ?? null,
    };
  }

  function saveRule(values: RuleFormValues, existing?: RecurringRuleRow): void {
    const row = draftRule(values, existing);

    startMutation(async () => {
      apply({ type: "save", row });
      const result = existing ? await updateRule(existing.id, values) : await createRule(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(existing ? "Rule updated" : "Rule created");
      router.refresh();
    });
  }

  function toggleActive(rule: RecurringRuleRow): void {
    const active = !rule.active;
    const nextRunAt = active
      ? advancePast(rule.nextRunAt, scheduleOf(rule), new Date())
      : rule.nextRunAt;

    startMutation(async () => {
      apply({ type: "toggle", id: rule.id, active, nextRunAt });
      const result = await toggleRule(rule.id, active);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success((rule.active ? "Paused " : "Resumed ") + rule.payee);
      router.refresh();
    });
  }

  function removeRule(rule: RecurringRuleRow): void {
    startMutation(async () => {
      apply({ type: "delete", id: rule.id });
      const result = await deleteRule(rule.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted " + rule.payee);
      router.refresh();
    });
  }

  function payBill(rule: RecurringRuleRow): void {
    const now = new Date();
    const nextRunAt = advanceRun(rule.nextRunAt, scheduleOf(rule));
    const ended = rule.endDate != null && toDateInput(nextRunAt) > rule.endDate;

    startMutation(async () => {
      apply({
        type: "paid",
        id: rule.id,
        nextRunAt,
        lastRunAt: now,
        active: !ended,
      });
      const result = await markPaid(rule.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked " + rule.payee + " as paid");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recurring"
        description="Bills, subscriptions, and paychecks on a schedule."
        actions={newRuleDialog}
      />

      <section aria-label="Recurring summary" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Active rules"
          value={String(stats.activeCount)}
          hint={stats.overdueCount > 0 ? stats.overdueCount + " overdue" : "Everything on track"}
          icon={Repeat}
          emphasis
        />
        <StatCard
          title="Due this week"
          value={String(stats.dueThisWeek)}
          hint="Next 7 days, overdue included"
          icon={CalendarClock}
        />
        <StatCard
          title="Monthly recurring cost"
          value={formatMoney(stats.monthlyCost, currency, locale)}
          hint={
            lastPosted?.lastRunAt
              ? "Last posted " +
                lastPosted.payee +
                " · " +
                formatDate(lastPosted.lastRunAt, locale, "MMM d")
              : "From active expense rules"
          }
          icon={PiggyBank}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming bills</CardTitle>
          <CardDescription>
            Next 30 days, oldest first. Overdue bills stay at the top.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {bills.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing scheduled"
              description="Create a rule and the next due date shows up here."
              action={newRuleDialog}
            />
          ) : (
            bills.map((bill) => {
              const overdue = bill.nextRunAt < today;
              const rule = optimisticRules.find((entry) => entry.id === bill.id);
              return (
                <div
                  key={bill.id}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Repeat className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{bill.payee}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn(overdue && "font-medium text-negative")}>
                          {overdue ? "Overdue · " : ""}
                          {formatDate(bill.nextRunAt, locale)}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{bill.accountName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <AmountText
                      amount={bill.amount}
                      currency={bill.currency}
                      locale={locale}
                      type={bill.type === "income" ? "income" : "expense"}
                      className="whitespace-nowrap text-sm font-medium"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!rule}
                      onClick={() => rule && payBill(rule)}
                    >
                      <Check className="size-4" aria-hidden />
                      Mark as paid
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>Pause one to stop it from showing in bills.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {optimisticRules.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No recurring rules yet"
              description="Add rent, a subscription, or your salary once and it repeats."
              action={newRuleDialog}
            />
          ) : (
            optimisticRules.map((rule) => {
              const overdue = rule.active && rule.nextRunAt < today;
              return (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{rule.payee}</p>
                      <Badge variant={rule.active ? "secondary" : "outline"}>
                        {rule.active ? "Active" : "Paused"}
                      </Badge>
                      {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {scheduleLabel(rule)} · {rule.accountName}
                      {rule.categoryName ? " · " + rule.categoryName : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="sm:text-right">
                      <AmountText
                        amount={rule.amount}
                        currency={rule.currency}
                        locale={locale}
                        type={rule.type}
                        className="whitespace-nowrap text-sm font-medium"
                      />
                      <p className="text-xs text-muted-foreground">
                        Next {formatDate(rule.nextRunAt, locale, "MMM d, yyyy")}
                      </p>
                    </div>
                    <RuleActions
                      rule={rule}
                      accounts={accounts}
                      categories={categories}
                      currency={currency}
                      locale={locale}
                      onSave={(values) => saveRule(values, rule)}
                      onToggle={() => toggleActive(rule)}
                      onDelete={() => removeRule(rule)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

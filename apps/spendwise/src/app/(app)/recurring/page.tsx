import type { Metadata } from "next";
import { startOfDay } from "date-fns";
import { CalendarClock, PiggyBank, Plus, Repeat } from "lucide-react";
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
import { formatDate, formatMoney } from "@repo/finance";
import { cn } from "@repo/shared";
import { MarkPaidButton } from "@/features/recurring/mark-paid-button";
import {
  getLastPosted,
  getRecurringStats,
  listRules,
  listUpcomingBills,
} from "@/features/recurring/queries";
import { RuleActions } from "@/features/recurring/rule-actions";
import { RuleDialog } from "@/features/recurring/rule-dialog";
import { scheduleLabel } from "@/features/recurring/rule-meta";
import { getSettings } from "@/features/settings/queries";
import { listTransactionOptions } from "@/features/transactions/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Recurring" };

export default async function RecurringPage() {
  const user = await requireUser();
  const [rules, bills, stats, lastPosted, options, settings] = await Promise.all([
    listRules(user.id),
    listUpcomingBills(user.id, 30),
    getRecurringStats(user.id),
    getLastPosted(user.id),
    listTransactionOptions(user.id),
    getSettings(user.id),
  ]);

  const today = startOfDay(new Date());
  const currency = settings.currency;
  const locale = settings.locale;
  const dialog = (
    <RuleDialog
      accounts={options.accounts}
      categories={options.categories}
      currency={currency}
      locale={locale}
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden />
          New rule
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recurring"
        description="Bills, subscriptions, and paychecks on a schedule."
        actions={dialog}
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
            lastPosted
              ? "Last posted " +
                lastPosted.payee +
                " · " +
                formatDate(lastPosted.date, locale, "MMM d")
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
              action={dialog}
            />
          ) : (
            bills.map((bill) => {
              const overdue = bill.nextRunAt < today;
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
                    <MarkPaidButton ruleId={bill.id} payee={bill.payee} />
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
          {rules.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No recurring rules yet"
              description="Add rent, a subscription, or your salary once and it repeats."
              action={dialog}
            />
          ) : (
            rules.map((rule) => {
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
                      accounts={options.accounts}
                      categories={options.categories}
                      currency={currency}
                      locale={locale}
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

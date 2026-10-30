import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, PiggyBank, Target, TrendingUp, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Progress,
  ProgressRing,
  StatCard,
} from "@repo/ui";
import { formatDate, formatMoney } from "@repo/finance";
import { ContributionDialog } from "@/features/goals/contribution-dialog";
import { ContributionDelete, GoalActions } from "@/features/goals/goal-actions";
import { GoalDialog } from "@/features/goals/goal-dialog";
import {
  listGoalContributions,
  listGoalOptions,
  listGoals,
  type GoalRow,
} from "@/features/goals/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@repo/shared";

export const metadata: Metadata = { title: "Goals" };

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDay(value: string | null, locale: string): string {
  if (!value) return "";
  return formatDate(value + "T00:00:00", locale);
}

function GoalCard({
  goal,
  locale,
  accounts,
}: {
  goal: GoalRow;
  locale: string;
  accounts: { id: string; name: string }[];
}) {
  const remaining = Math.max(0, goal.targetAmount - goal.contributed);
  const latest = goal.recentContributions[0];

  return (
    <Card className={cn(goal.status !== "active" && "opacity-80")}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <ProgressRing
            value={goal.percent}
            size={56}
            strokeWidth={6}
            label={Math.round(goal.percent) + "%"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="truncate text-sm font-medium">{goal.name}</p>
              <GoalActions id={goal.id} name={goal.name} status={goal.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {goal.linkedAccountName ?? "No linked account"}
            </p>
            {goal.status !== "active" ? (
              <Badge variant="secondary" className="mt-1">
                {goal.status === "completed" ? "Completed" : "Archived"}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold tabular-nums">
              {formatMoney(goal.contributed, goal.currency, locale)}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              of {formatMoney(goal.targetAmount, goal.currency, locale)}
            </span>
          </div>
          <Progress value={Math.min(goal.percent, 100)} aria-label={goal.name + " progress"} />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Target date</dt>
            <dd className="truncate tabular-nums">
              {goal.targetDate ? formatDay(goal.targetDate, locale) : "No date"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Projected</dt>
            <dd className="truncate tabular-nums">
              {goal.projectedDate ? formatDate(goal.projectedDate, locale) : "Need a pace"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Monthly pace</dt>
            <dd className="truncate tabular-nums">
              {formatMoney(goal.monthlyPace, goal.currency, locale)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="truncate tabular-nums">
              {formatMoney(remaining, goal.currency, locale)}
            </dd>
          </div>
        </dl>

        <p className="truncate text-xs text-muted-foreground">
          {latest
            ? "Last added " +
              formatMoney(latest.amount, goal.currency, locale) +
              " on " +
              formatDate(latest.date, locale)
            : "No contributions yet"}
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {goal.status === "active" ? (
            <ContributionDialog
              goalId={goal.id}
              goalName={goal.name}
              currency={goal.currency}
              accounts={accounts}
            />
          ) : null}
          <GoalDialog
            currency={goal.currency}
            accounts={accounts}
            goal={{
              id: goal.id,
              name: goal.name,
              targetAmount: goal.targetAmount,
              currency: goal.currency,
              targetDate: goal.targetDate,
              linkedAccountId: goal.linkedAccountId,
              note: goal.note,
              color: goal.color,
            }}
            trigger={
              <Button variant="outline" size="sm">
                Edit
              </Button>
            }
          />
          <Button asChild variant="ghost" size="sm">
            <Link href={"/goals?goal=" + goal.id + "#history"}>
              History
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [goals, settings, accounts] = await Promise.all([
    listGoals(user.id),
    getSettings(user.id),
    listGoalOptions(user.id),
  ]);

  const requested = first(params.goal);
  const selected = goals.find((goal) => goal.id === requested) ?? goals[0];
  const history = selected ? await listGoalContributions(user.id, selected.id) : [];

  const { locale, currency } = settings;
  const active = goals.filter((goal) => goal.status === "active");
  const totalSaved = active.reduce((sum, goal) => sum + goal.contributed, 0);
  const totalTarget = active.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const monthlyPace = active.reduce((sum, goal) => sum + goal.monthlyPace, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Goals"
        description="Save toward a target date and watch the pace."
        actions={
          <GoalDialog currency={currency} accounts={accounts} trigger={<Button>New goal</Button>} />
        }
      />

      <section aria-label="Goal summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Saved so far"
          value={formatMoney(totalSaved, currency, locale)}
          hint={
            "Across " + active.length + (active.length === 1 ? " active goal" : " active goals")
          }
          icon={PiggyBank}
          emphasis
        />
        <StatCard
          title="Active targets"
          value={formatMoney(totalTarget, currency, locale)}
          hint={formatMoney(Math.max(0, totalTarget - totalSaved), currency, locale) + " to go"}
          icon={Target}
        />
        <StatCard
          title="Monthly pace"
          value={formatMoney(monthlyPace, currency, locale)}
          hint="Average of the last 90 days"
          icon={TrendingUp}
        />
        <StatCard
          title="Goals"
          value={String(goals.length)}
          hint={active.length + " active · " + (goals.length - active.length) + " finished"}
          icon={CalendarClock}
        />
      </section>

      {goals.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No savings goals yet"
          description="Give the money a direction: an emergency fund, a trip, or a new laptop."
          action={
            <GoalDialog
              currency={currency}
              accounts={accounts}
              trigger={<Button>Create a goal</Button>}
            />
          }
        />
      ) : (
        <>
          <section aria-label="Goal cards" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} locale={locale} accounts={accounts} />
            ))}
          </section>

          <Card id="history">
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <CardTitle>Contribution history</CardTitle>
                <CardDescription>
                  {selected
                    ? "Every contribution to " + selected.name + "."
                    : "Pick a goal to see its contributions."}
                </CardDescription>
              </div>
              {selected ? (
                <ContributionDialog
                  goalId={selected.id}
                  goalName={selected.name}
                  currency={selected.currency}
                  accounts={accounts}
                  trigger={
                    <Button size="sm" variant="outline">
                      Add money
                    </Button>
                  }
                />
              ) : null}
            </CardHeader>
            <CardContent>
              {!selected ? null : history.length === 0 ? (
                <EmptyState
                  icon={PiggyBank}
                  title="No contributions yet"
                  description={
                    "Add money to " + selected.name + " and the projection starts moving."
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {history.map((contribution) => (
                    <li
                      key={contribution.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium tabular-nums">
                          {formatMoney(contribution.amount, selected.currency, locale)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(contribution.date, locale)}
                          {contribution.accountName ? " · " + contribution.accountName : ""}
                          {contribution.note ? " · " + contribution.note : ""}
                        </p>
                      </div>
                      <ContributionDelete id={contribution.id} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

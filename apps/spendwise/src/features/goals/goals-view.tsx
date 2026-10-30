"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarClock, PiggyBank, Target, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@repo/shared";
import {
  addContribution,
  archiveGoal,
  completeGoal,
  createGoal,
  deleteContribution,
  deleteGoal,
  updateGoal,
} from "@/features/goals/actions";
import {
  ContributionDialog,
  type ContributionFormValues,
} from "@/features/goals/contribution-dialog";
import { ContributionDelete, GoalActions } from "@/features/goals/goal-actions";
import { GoalDialog, type GoalFormValues } from "@/features/goals/goal-dialog";
import type { ContributionRow, GoalRow, GoalStatus } from "@/features/goals/queries";

type AccountOption = { id: string; name: string };

type GoalMutation =
  | { type: "save"; goal: GoalRow }
  | { type: "status"; id: string; status: GoalStatus }
  | { type: "delete"; id: string }
  | {
      type: "contribution";
      goalId: string;
      amount: number;
      row?: ContributionRow;
      removeId?: string;
    };

type HistoryMutation = { type: "add"; row: ContributionRow } | { type: "remove"; id: string };

const STATUS_RANK: Record<GoalStatus, number> = { active: 0, completed: 1, archived: 2 };

function sortGoals(goals: GoalRow[]): GoalRow[] {
  return [...goals].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      (a.targetDate ?? "9999-12-31").localeCompare(b.targetDate ?? "9999-12-31") ||
      a.name.localeCompare(b.name),
  );
}

function percentOf(contributed: number, target: number): number {
  return target > 0 ? Math.round((contributed / target) * 1000) / 10 : 0;
}

function reduce(goals: GoalRow[], action: GoalMutation): GoalRow[] {
  switch (action.type) {
    case "save": {
      const exists = goals.some((goal) => goal.id === action.goal.id);
      return sortGoals(
        exists
          ? goals.map((goal) => (goal.id === action.goal.id ? action.goal : goal))
          : [...goals, action.goal],
      );
    }
    case "status":
      return sortGoals(
        goals.map((goal) => (goal.id === action.id ? { ...goal, status: action.status } : goal)),
      );
    case "delete":
      return goals.filter((goal) => goal.id !== action.id);
    case "contribution":
      return goals.map((goal) => {
        if (goal.id !== action.goalId) return goal;
        const contributed = goal.contributed + action.amount;
        const recent = action.removeId
          ? goal.recentContributions.filter((entry) => entry.id !== action.removeId)
          : action.row
            ? [action.row, ...goal.recentContributions].slice(0, 3)
            : goal.recentContributions;

        return {
          ...goal,
          contributed,
          percent: percentOf(contributed, goal.targetAmount),
          recentContributions: recent,
        };
      });
  }
}

function reduceHistory(rows: ContributionRow[], action: HistoryMutation): ContributionRow[] {
  if (action.type === "remove") return rows.filter((row) => row.id !== action.id);
  return [action.row, ...rows.filter((row) => row.id !== action.row.id)];
}

function formatDay(value: string | null, locale: string): string {
  if (!value) return "";
  return formatDate(value + "T00:00:00", locale);
}

function GoalCard({
  goal,
  locale,
  accounts,
  onSave,
  onStatus,
  onDelete,
  onContribute,
}: {
  goal: GoalRow;
  locale: string;
  accounts: AccountOption[];
  onSave: (values: GoalFormValues) => void;
  onStatus: (status: GoalStatus) => void;
  onDelete: () => void;
  onContribute: (values: ContributionFormValues) => void;
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
              <GoalActions
                name={goal.name}
                status={goal.status}
                onComplete={() => onStatus("completed")}
                onArchive={() => onStatus("archived")}
                onDelete={onDelete}
              />
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
              goalName={goal.name}
              currency={goal.currency}
              accounts={accounts}
              onSave={onContribute}
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
            onSave={onSave}
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

export function GoalsView({
  goals,
  selectedId,
  history,
  accounts,
  currency,
  locale,
}: {
  goals: GoalRow[];
  selectedId: string | null;
  history: ContributionRow[];
  accounts: AccountOption[];
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [optimisticGoals, apply] = useOptimistic(goals, reduce);
  const [optimisticHistory, applyHistory] = useOptimistic(history, reduceHistory);
  const [, startMutation] = useTransition();

  const selected =
    optimisticGoals.find((goal) => goal.id === selectedId) ?? optimisticGoals[0] ?? null;
  const active = optimisticGoals.filter((goal) => goal.status === "active");
  const totalSaved = active.reduce((sum, goal) => sum + goal.contributed, 0);
  const totalTarget = active.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const monthlyPace = active.reduce((sum, goal) => sum + goal.monthlyPace, 0);

  function saveGoal(values: GoalFormValues, goal?: GoalRow): void {
    const targetDate = values.targetDate || null;
    const linkedAccountId = values.linkedAccountId || null;
    const linkedAccountName =
      accounts.find((account) => account.id === linkedAccountId)?.name ?? null;
    const next: GoalRow = goal
      ? {
          ...goal,
          name: values.name,
          targetAmount: values.targetAmount,
          targetDate,
          linkedAccountId,
          linkedAccountName,
          note: values.note,
          percent: percentOf(goal.contributed, values.targetAmount),
        }
      : {
          id: "optimistic-" + crypto.randomUUID(),
          name: values.name,
          targetAmount: values.targetAmount,
          currency,
          targetDate,
          note: values.note,
          color: "emerald",
          status: "active",
          linkedAccountId,
          linkedAccountName,
          contributed: 0,
          percent: 0,
          monthlyPace: 0,
          projectedDate: null,
          recentContributions: [],
        };

    startMutation(async () => {
      apply({ type: "save", goal: next });
      const result = goal
        ? await updateGoal(goal.id, {
            name: values.name,
            targetAmount: values.targetAmount,
            currency: goal.currency,
            targetDate,
            linkedAccountId,
            note: values.note,
            color: goal.color,
          })
        : await createGoal({
            name: values.name,
            targetAmount: values.targetAmount,
            currency,
            targetDate,
            linkedAccountId,
            note: values.note,
            color: "emerald",
          });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(goal ? "Goal updated" : "Goal created");
      router.refresh();
    });
  }

  function setStatus(goal: GoalRow, status: GoalStatus): void {
    startMutation(async () => {
      apply({ type: "status", id: goal.id, status });
      const result =
        status === "completed" ? await completeGoal(goal.id) : await archiveGoal(goal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        status === "completed" ? "Marked " + goal.name + " complete" : "Archived " + goal.name,
      );
      router.refresh();
    });
  }

  function removeGoal(goal: GoalRow): void {
    startMutation(async () => {
      apply({ type: "delete", id: goal.id });
      const result = await deleteGoal(goal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted " + goal.name);
      router.refresh();
    });
  }

  function addMoney(values: ContributionFormValues, goal: GoalRow): void {
    const row: ContributionRow = {
      id: "optimistic-" + crypto.randomUUID(),
      goalId: goal.id,
      amount: values.amount,
      date: values.date,
      note: values.note,
      accountId: values.accountId,
      accountName: accounts.find((account) => account.id === values.accountId)?.name ?? null,
    };

    startMutation(async () => {
      apply({ type: "contribution", goalId: goal.id, amount: values.amount, row });
      if (selected?.id === goal.id) applyHistory({ type: "add", row });

      const result = await addContribution({
        goalId: goal.id,
        amount: values.amount,
        date: values.date,
        accountId: values.accountId,
        note: values.note,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Added to " + goal.name);
      router.refresh();
    });
  }

  function removeContribution(row: ContributionRow): void {
    startMutation(async () => {
      applyHistory({ type: "remove", id: row.id });
      apply({
        type: "contribution",
        goalId: row.goalId,
        amount: -row.amount,
        removeId: row.id,
      });

      const result = await deleteContribution(row.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Contribution removed");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Goals"
        description="Save toward a target date and watch the pace."
        actions={
          <GoalDialog
            currency={currency}
            accounts={accounts}
            onSave={(values) => saveGoal(values)}
            trigger={<Button>New goal</Button>}
          />
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
          value={String(optimisticGoals.length)}
          hint={
            active.length + " active · " + (optimisticGoals.length - active.length) + " finished"
          }
          icon={CalendarClock}
        />
      </section>

      {optimisticGoals.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No savings goals yet"
          description="Give the money a direction: an emergency fund, a trip, or a new laptop."
          action={
            <GoalDialog
              currency={currency}
              accounts={accounts}
              onSave={(values) => saveGoal(values)}
              trigger={<Button>Create a goal</Button>}
            />
          }
        />
      ) : (
        <>
          <section aria-label="Goal cards" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {optimisticGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                locale={locale}
                accounts={accounts}
                onSave={(values) => saveGoal(values, goal)}
                onStatus={(status) => setStatus(goal, status)}
                onDelete={() => removeGoal(goal)}
                onContribute={(values) => addMoney(values, goal)}
              />
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
                  goalName={selected.name}
                  currency={selected.currency}
                  accounts={accounts}
                  onSave={(values) => addMoney(values, selected)}
                  trigger={
                    <Button size="sm" variant="outline">
                      Add money
                    </Button>
                  }
                />
              ) : null}
            </CardHeader>
            <CardContent>
              {!selected ? null : optimisticHistory.length === 0 ? (
                <EmptyState
                  icon={PiggyBank}
                  title="No contributions yet"
                  description={
                    "Add money to " + selected.name + " and the projection starts moving."
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {optimisticHistory.map((contribution) => (
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
                      <ContributionDelete onDelete={() => removeContribution(contribution)} />
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

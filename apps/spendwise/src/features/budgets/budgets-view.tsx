"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  PiggyBank,
  Trash2,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryBadge,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Progress,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import {
  budgetProgress,
  formatDate,
  formatMoney,
  percentChange,
  type BudgetState,
} from "@repo/finance";
import { cn } from "@repo/shared";
import {
  copyBudgetsFromPreviousMonth,
  deleteBudget,
  upsertBudget,
} from "@/features/budgets/actions";
import { BudgetDialog, type BudgetFormValues } from "@/features/budgets/budget-dialog";
import { monthAnchor, shiftMonth } from "@/features/budgets/month";
import type { BudgetCategory, BudgetLimit, BudgetRow } from "@/features/budgets/queries";

const STATE_META: Record<BudgetState, { label: string; icon: LucideIcon; tone: string }> = {
  on_track: { label: "On track", icon: CheckCircle2, tone: "text-positive" },
  near_limit: { label: "Near limit", icon: AlertTriangle, tone: "text-muted-foreground" },
  exceeded: { label: "Exceeded", icon: AlertOctagon, tone: "text-negative" },
};

type BudgetMutation =
  | { type: "upsert"; row: BudgetRow }
  | { type: "add"; rows: BudgetRow[] }
  | { type: "remove"; id: string };

function keyOf(row: { categoryId: string | null }): string {
  return row.categoryId ?? "overall";
}

function sortRows(rows: BudgetRow[]): BudgetRow[] {
  return [...rows].sort((a, b) => {
    if (a.categoryId === null) return -1;
    if (b.categoryId === null) return 1;
    return a.categoryName.localeCompare(b.categoryName);
  });
}

function reduce(rows: BudgetRow[], action: BudgetMutation): BudgetRow[] {
  if (action.type === "remove") return rows.filter((row) => row.id !== action.id);
  if (action.type === "add") {
    const taken = new Set(rows.map(keyOf));
    return sortRows([...rows, ...action.rows.filter((row) => !taken.has(keyOf(row)))]);
  }
  return sortRows([...rows.filter((row) => keyOf(row) !== keyOf(action.row)), action.row]);
}

/** Same maths as the query, so totals track the optimistic rows. */
function summarize(rows: BudgetRow[]) {
  const overall = rows.find((row) => row.categoryId === null);
  const basis = overall ? [overall] : rows;
  const totalBudget = basis.reduce((sum, row) => sum + row.effectiveLimit, 0);
  const totalSpent = basis.reduce((sum, row) => sum + row.spent, 0);
  const previousSpent = basis.reduce((sum, row) => sum + row.previousSpent, 0);
  const progress = budgetProgress(totalSpent, totalBudget);

  return {
    totalBudget,
    totalSpent,
    remaining: progress.remaining,
    percent: progress.percent,
    hasOverall: Boolean(overall),
    delta: percentChange(totalSpent, previousSpent),
    categoryCount: rows.filter((row) => row.categoryId !== null).length,
  };
}

function Variance({ row, locale }: { row: BudgetRow; locale: string }) {
  return (
    <span className={cn("tabular-nums", row.variance < 0 ? "text-negative" : "text-positive")}>
      {formatMoney(row.variance, row.currency, locale)}
    </span>
  );
}

function DeleteBudget({ name, onDelete }: { name: string; onDelete: () => void }) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label={"Delete the " + name + " budget"}
          className="text-muted-foreground hover:text-negative"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      }
      title={"Delete the " + name + " budget?"}
      description="Spending and transactions stay. Only the monthly limit is removed."
      confirmLabel="Delete budget"
      onConfirm={onDelete}
    />
  );
}

export function BudgetsView({
  month,
  currentMonth,
  rows,
  previousRows,
  categories,
  currency,
  locale,
}: {
  month: string;
  currentMonth: string;
  rows: BudgetRow[];
  previousRows: BudgetLimit[];
  categories: BudgetCategory[];
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [optimisticRows, apply] = useOptimistic(rows, reduce);
  const [, startMutation] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const [targetMonth, setTargetMonth] = useState<string | null>(null);
  // The label follows the click, the list keeps the settled rows until they load.
  const shownMonth = isNavigating && targetMonth ? targetMonth : month;

  const summary = summarize(optimisticRows);
  const label = formatDate(monthAnchor(shownMonth), locale, "MMMM yyyy");

  function draftRow(values: BudgetFormValues, existing?: BudgetRow): BudgetRow {
    const category = categories.find((entry) => entry.id === values.categoryId);
    const previous = previousRows.find(
      (limit) => (limit.categoryId ?? "overall") === (values.categoryId ?? "overall"),
    );
    const previousLimit = existing?.previousLimit ?? previous?.amount ?? 0;
    const previousSpent = existing?.previousSpent ?? 0;
    const carry = values.rollover ? Math.max(0, previousLimit - previousSpent) : 0;
    const spent = existing?.spent ?? 0;
    const progress = budgetProgress(spent, values.amount, carry);

    return {
      id: existing?.id ?? "optimistic-" + crypto.randomUUID(),
      categoryId: values.categoryId,
      categoryName:
        values.categoryId === null
          ? "Overall"
          : (category?.name ?? existing?.categoryName ?? "Category"),
      categoryColor:
        values.categoryId === null
          ? "slate"
          : (category?.color ?? existing?.categoryColor ?? "slate"),
      amount: values.amount,
      currency: existing?.currency ?? currency,
      rollover: values.rollover,
      carry,
      effectiveLimit: progress.effectiveLimit,
      spent: progress.spent,
      variance: progress.remaining,
      percent: progress.percent,
      state: progress.state,
      previousLimit,
      previousSpent,
    };
  }

  function saveBudget(values: BudgetFormValues): void {
    const existing = optimisticRows.find((row) => row.categoryId === values.categoryId);
    const row = draftRow(values, existing);

    startMutation(async () => {
      apply({ type: "upsert", row });
      const result = await upsertBudget({
        categoryId: values.categoryId,
        periodMonth: shownMonth,
        amount: values.amount,
        currency: row.currency,
        rollover: values.rollover,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(existing ? "Budget updated" : "Budget added");
      router.refresh();
    });
  }

  function removeBudget(row: BudgetRow): void {
    startMutation(async () => {
      apply({ type: "remove", id: row.id });
      const result = await deleteBudget(row.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted the " + row.categoryName + " budget");
      router.refresh();
    });
  }

  function copyLastMonth(): void {
    const taken = new Set(optimisticRows.map(keyOf));
    const missing = previousRows.filter((limit) => !taken.has(keyOf(limit)));
    if (missing.length === 0) {
      toast.info("Nothing left to copy from last month.");
      return;
    }

    startMutation(async () => {
      apply({
        type: "add",
        rows: missing.map((limit) => {
          const category = categories.find((entry) => entry.id === limit.categoryId);
          const progress = budgetProgress(0, limit.amount, 0);
          return {
            id: "optimistic-" + crypto.randomUUID(),
            categoryId: limit.categoryId,
            categoryName: limit.categoryId === null ? "Overall" : (category?.name ?? "Category"),
            categoryColor: limit.categoryId === null ? "slate" : (category?.color ?? "slate"),
            amount: limit.amount,
            currency: limit.currency,
            rollover: limit.rollover,
            carry: 0,
            effectiveLimit: progress.effectiveLimit,
            spent: 0,
            variance: progress.remaining,
            percent: progress.percent,
            state: progress.state,
            previousLimit: limit.amount,
            previousSpent: 0,
          };
        }),
      });

      const result = await copyBudgetsFromPreviousMonth(shownMonth);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        "Copied " + result.data.count + (result.data.count === 1 ? " budget" : " budgets"),
      );
      router.refresh();
    });
  }

  function goToMonth(next: string): void {
    if (next === shownMonth) return;
    setTargetMonth(next);
    startNavigation(() => {
      router.push("/budgets?month=" + next, { scroll: false });
    });
  }

  const previousMonth = shiftMonth(shownMonth, -1);
  const nextMonth = shiftMonth(shownMonth, 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Budgets"
        description="Monthly limits by category, with rollover and a budget-versus-actual view."
        actions={
          <>
            <Button type="button" variant="outline" onClick={copyLastMonth}>
              <Copy className="size-4" aria-hidden />
              Copy last month
            </Button>
            <BudgetDialog currency={currency} categories={categories} onSave={saveBudget} />
          </>
        }
      />

      <nav
        aria-label="Choose month"
        aria-busy={isNavigating}
        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-1.5"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          onClick={() => goToMonth(previousMonth)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{label}</span>
          {shownMonth !== currentMonth ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs text-muted-foreground"
              onClick={() => goToMonth(currentMonth)}
            >
              This month
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next month"
          onClick={() => goToMonth(nextMonth)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </nav>

      <div
        aria-busy={isNavigating}
        className={cn(
          "flex flex-col gap-6 transition-opacity",
          isNavigating && "pointer-events-none opacity-60",
        )}
      >
        <section aria-label="Budget summary" className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total budget"
            value={formatMoney(summary.totalBudget, currency, locale)}
            hint={
              summary.hasOverall
                ? "Overall limit for " + label
                : summary.categoryCount +
                  (summary.categoryCount === 1 ? " category budget" : " category budgets")
            }
            icon={Wallet}
            emphasis
          />
          <StatCard
            title="Total spent"
            value={formatMoney(summary.totalSpent, currency, locale)}
            delta={summary.delta}
            deltaLabel="vs last month"
            invertDelta
            icon={TrendingDown}
          />
          <StatCard
            title="Remaining"
            value={formatMoney(summary.remaining, currency, locale)}
            hint={summary.percent + "% of the budget used"}
            icon={PiggyBank}
          />
        </section>

        {optimisticRows.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title={"No budgets for " + label}
            description="Set a limit per category, or one overall limit, and this page compares it with real spending."
            action={
              <BudgetDialog
                currency={currency}
                categories={categories}
                onSave={saveBudget}
                trigger={<Button>Create a budget</Button>}
              />
            }
          />
        ) : (
          <>
            <section aria-label="Budget cards" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {optimisticRows.map((row) => {
                const meta = STATE_META[row.state];
                const Icon = meta.icon;
                return (
                  <Card key={row.id}>
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <CategoryBadge name={row.categoryName} color={row.categoryColor} />
                          <p className="text-xs text-muted-foreground">
                            {row.rollover ? "Rollover on" : "No rollover"}
                            {row.carry > 0
                              ? " · +" + formatMoney(row.carry, row.currency, locale) + " carried"
                              : ""}
                          </p>
                        </div>
                        <DeleteBudget name={row.categoryName} onDelete={() => removeBudget(row)} />
                      </div>

                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-lg font-semibold tabular-nums">
                          {formatMoney(row.spent, row.currency, locale)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          of {formatMoney(row.effectiveLimit, row.currency, locale)}
                        </span>
                      </div>

                      <Progress
                        value={Math.min(row.percent, 100)}
                        aria-label={row.categoryName + " budget used"}
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span
                          className={cn("inline-flex items-center gap-1 font-medium", meta.tone)}
                        >
                          <Icon className="size-3.5" aria-hidden />
                          {meta.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.percent}% used
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          Last month: {formatMoney(row.previousSpent, row.currency, locale)}
                        </span>
                        <BudgetDialog
                          currency={row.currency}
                          categories={categories}
                          budget={{
                            categoryId: row.categoryId,
                            amount: row.amount,
                            rollover: row.rollover,
                            currency: row.currency,
                          }}
                          onSave={saveBudget}
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Budget vs actual</CardTitle>
                <CardDescription>
                  Variance is the limit minus what was spent, including any rollover.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Last month</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">% used</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimisticRows.map((row) => {
                      const meta = STATE_META[row.state];
                      const Icon = meta.icon;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="max-w-40 truncate font-medium">
                            {row.categoryName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(row.effectiveLimit, row.currency, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(row.spent, row.currency, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatMoney(row.previousSpent, row.currency, locale)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Variance row={row} locale={locale} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.percent}%</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium",
                                meta.tone,
                              )}
                            >
                              <Icon className="size-3.5" aria-hidden />
                              {meta.label}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

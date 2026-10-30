import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryBadge,
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
import { formatDate, formatMoney, monthKey, type BudgetState } from "@repo/finance";
import { BudgetDelete, CopyBudgetsButton } from "@/features/budgets/budget-actions";
import { BudgetDialog } from "@/features/budgets/budget-dialog";
import {
  isMonthKey,
  listBudgetCategories,
  listBudgets,
  monthAnchor,
  shiftMonth,
  type BudgetRow,
} from "@/features/budgets/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@repo/shared";

export const metadata: Metadata = { title: "Budgets" };

const STATE_META: Record<BudgetState, { label: string; icon: LucideIcon; tone: string }> = {
  on_track: { label: "On track", icon: CheckCircle2, tone: "text-positive" },
  near_limit: { label: "Near limit", icon: AlertTriangle, tone: "text-muted-foreground" },
  exceeded: { label: "Exceeded", icon: AlertOctagon, tone: "text-negative" },
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function hrefFor(month: string): string {
  return "/budgets?month=" + month;
}

function Variance({ row, locale }: { row: BudgetRow; locale: string }) {
  return (
    <span className={cn("tabular-nums", row.variance < 0 ? "text-negative" : "text-positive")}>
      {formatMoney(row.variance, row.currency, locale)}
    </span>
  );
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const requestedMonth = first(params.month);
  const currentMonth = monthKey(new Date());
  const month = isMonthKey(requestedMonth) ? requestedMonth : currentMonth;

  const [data, categories, settings] = await Promise.all([
    listBudgets(user.id, month),
    listBudgetCategories(user.id),
    getSettings(user.id),
  ]);

  const { rows, summary } = data;
  const { currency, locale } = settings;
  const label = formatDate(monthAnchor(month), locale, "MMMM yyyy");
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const categoryCount = rows.filter((row) => row.categoryId !== null).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Budgets"
        description="Monthly limits by category, with rollover and a budget-versus-actual view."
        actions={
          <>
            <CopyBudgetsButton month={month} />
            <BudgetDialog month={month} currency={currency} categories={categories} />
          </>
        }
      />

      <nav
        aria-label="Choose month"
        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-1.5"
      >
        <Button asChild variant="ghost" size="icon">
          <Link href={hrefFor(previousMonth)} aria-label="Previous month" rel="prev">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{label}</span>
          {month !== currentMonth ? (
            <Link
              href="/budgets"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              This month
            </Link>
          ) : null}
        </div>
        <Button asChild variant="ghost" size="icon">
          <Link href={hrefFor(nextMonth)} aria-label="Next month" rel="next">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </nav>

      <section aria-label="Budget summary" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total budget"
          value={formatMoney(summary.totalBudget, currency, locale)}
          hint={
            summary.hasOverall
              ? "Overall limit for " + label
              : categoryCount + (categoryCount === 1 ? " category budget" : " category budgets")
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

      {rows.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={"No budgets for " + label}
          description="Set a limit per category, or one overall limit, and this page compares it with real spending."
          action={
            <BudgetDialog
              month={month}
              currency={currency}
              categories={categories}
              trigger={<Button>Create a budget</Button>}
            />
          }
        />
      ) : (
        <>
          <section aria-label="Budget cards" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
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
                      <BudgetDelete id={row.id} name={row.categoryName} />
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
                      <span className={cn("inline-flex items-center gap-1 font-medium", meta.tone)}>
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
                        month={month}
                        currency={row.currency}
                        categories={categories}
                        budget={{
                          categoryId: row.categoryId,
                          amount: row.amount,
                          rollover: row.rollover,
                          currency: row.currency,
                        }}
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
                  {rows.map((row) => {
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
  );
}

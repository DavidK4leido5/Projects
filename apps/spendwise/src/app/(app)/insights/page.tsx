import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Lightbulb,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
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
import { PageSkeleton } from "@/components/page-skeleton";
import { getInsightsData } from "@/features/insights/queries";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@repo/shared";

export const metadata: Metadata = { title: "Insights" };

const TONE = {
  positive: {
    icon: CheckCircle2,
    className: "border-positive/30 bg-positive/5",
    iconClass: "text-positive",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-negative/30 bg-negative/5",
    iconClass: "text-negative",
  },
  info: { icon: Info, className: "border-border bg-card", iconClass: "text-muted-foreground" },
} as const;

function percent(value: number): string {
  return (value > 0 ? "+" : "") + value + "%";
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InsightsBody />
    </Suspense>
  );
}

async function InsightsBody() {
  const user = await requireUser();
  const data = await getInsightsData(user.id);
  const { settings } = data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        description={
          "Rules, not guesses. Built from " +
          formatDate(data.windowStart, settings.locale, "MMM yyyy") +
          " – " +
          formatDate(data.windowEnd, settings.locale, "MMM yyyy") +
          "."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/recurring">
              <Lightbulb className="size-4" aria-hidden />
              Review recurring
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Income this month"
          value={formatMoney(data.current.income, settings.currency, settings.locale)}
          delta={
            data.previous.income === 0
              ? undefined
              : Math.round(
                  ((data.current.income - data.previous.income) / data.previous.income) * 1000,
                ) / 10
          }
          deltaLabel="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          title="Expenses this month"
          value={formatMoney(data.current.expense, settings.currency, settings.locale)}
          delta={
            data.previous.expense === 0
              ? undefined
              : Math.round(
                  ((data.current.expense - data.previous.expense) / data.previous.expense) * 1000,
                ) / 10
          }
          deltaLabel="vs last month"
          invertDelta
          icon={TrendingDown}
        />
        <StatCard
          title="Net"
          value={formatMoney(data.current.net, settings.currency, settings.locale)}
          hint={data.current.savingsRate + "% savings rate"}
          icon={ArrowUpRight}
          emphasis
        />
        <StatCard
          title="90-day forecast"
          value={formatMoney(data.forecast.d90.projectedNet, settings.currency, settings.locale)}
          hint={
            "Ending balance " +
            formatMoney(data.forecast.d90.endingBalance, settings.currency, settings.locale)
          }
        />
      </section>

      {data.insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Not enough history yet"
          description="Add a few weeks of transactions and insights will appear here automatically."
          action={
            <Button asChild size="sm">
              <Link href="/transactions">Add a transaction</Link>
            </Button>
          }
        />
      ) : (
        <section aria-label="Insights" className="grid gap-3 md:grid-cols-2">
          {data.insights.map((insight) => {
            const tone = TONE[insight.tone];
            const Icon = tone.icon;
            return (
              <div
                key={insight.id}
                className={cn("flex gap-3 rounded-lg border p-4", tone.className)}
                role="status"
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", tone.iconClass)} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {insight.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Forecast</CardTitle>
            <CardDescription>
              Based on the current month&apos;s pace and scheduled recurring rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              {(
                [
                  ["30 days", data.forecast.d30],
                  ["60 days", data.forecast.d60],
                  ["90 days", data.forecast.d90],
                ] as const
              ).map(([label, forecast]) => (
                <div
                  key={label}
                  className="grid grid-cols-4 gap-2 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <dt className="font-medium">{label}</dt>
                  <dd className="text-right tabular-nums text-positive">
                    +{formatMoney(forecast.projectedIncome, settings.currency, settings.locale)}
                  </dd>
                  <dd className="text-right tabular-nums text-negative">
                    -{formatMoney(forecast.projectedExpense, settings.currency, settings.locale)}
                  </dd>
                  <dd
                    className={cn(
                      "text-right font-medium tabular-nums",
                      forecast.projectedNet >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatMoney(forecast.projectedNet, settings.currency, settings.locale)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              A projection, not a promise. One large purchase or a missed bill moves it quickly.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Likely subscriptions</CardTitle>
            <CardDescription>Repeated charges detected from the last six months.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.subscriptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No repeated monthly charges found yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.subscriptions.map((item) => (
                  <li
                    key={item.payee}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.payee}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.occurrences} charges · next{" "}
                        {formatDate(item.nextDate, settings.locale)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {formatMoney(item.amount, settings.currency, settings.locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(item.confidence * 100)}% match
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top categories</CardTitle>
          <CardDescription>This month, largest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.topCategories.map((category) => (
                <li
                  key={category.categoryId ?? "uncategorized"}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span className="truncate text-sm">{category.name}</span>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {formatMoney(category.amount, settings.currency, settings.locale)} ·{" "}
                    {category.share}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Comparison window:{" "}
        {percent(
          data.previous.expense === 0
            ? 0
            : Math.round(
                ((data.current.expense - data.previous.expense) / data.previous.expense) * 1000,
              ) / 10,
        )}{" "}
        spending change against {formatDate(data.windowEnd, settings.locale, "MMMM")}.
      </p>
    </div>
  );
}

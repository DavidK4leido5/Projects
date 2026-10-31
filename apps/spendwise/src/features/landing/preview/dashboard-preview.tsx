import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  AmountText,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  ProgressRing,
} from "@repo/ui";
import { budgetProgress, formatDate, formatMoney, percentChange } from "@repo/finance";
import { brand } from "@/lib/brand";
import { CashFlowChart } from "@/features/dashboard/cash-flow-chart";
import { CategoryDonut } from "@/features/dashboard/category-donut";
import {
  DEMO_CURRENCY,
  DEMO_LOCALE,
  DEMO_MONTH,
  accounts,
  bills,
  budgets,
  cashFlow,
  goals,
  recentTransactions,
  spendingByCategory,
  summary,
} from "@/features/landing/mock-data";

const BUDGET_STATE = {
  on_track: { label: "On track", tone: "text-positive", icon: CheckCircle2 },
  near_limit: { label: "Close", tone: "text-warning", icon: AlertTriangle },
  exceeded: { label: "Over", tone: "text-negative", icon: AlertOctagon },
} as const;

const INDICATOR_TONE = {
  on_track: "[&_[data-slot=progress-indicator]]:bg-positive",
  near_limit: "[&_[data-slot=progress-indicator]]:bg-warning",
  exceeded: "[&_[data-slot=progress-indicator]]:bg-negative",
} as const;

function SummaryTile({
  label,
  amount,
  hint,
  delta,
  invert = false,
}: {
  label: string;
  amount: number;
  hint?: string;
  delta?: number;
  invert?: boolean;
}) {
  const change = delta ?? 0;
  const good = invert ? change < 0 : change > 0;
  const tone = change === 0 ? "text-muted-foreground" : good ? "text-positive" : "text-negative";
  const DeltaIcon = change < 0 ? TrendingDown : TrendingUp;

  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-lg leading-tight font-semibold">
        <AmountText amount={amount} currency={DEMO_CURRENCY} locale={DEMO_LOCALE} />
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
        {typeof delta === "number" ? (
          <span className={"inline-flex items-center gap-0.5 font-medium tabular-nums " + tone}>
            <DeltaIcon className="size-3" aria-hidden="true" />
            {(change > 0 ? "+" : "") + change + "%"}
          </span>
        ) : null}
        {hint ? <span className="truncate">{hint}</span> : null}
      </div>
    </Card>
  );
}

export function DashboardPreview() {
  const previousNet = summary.previousIncome - summary.previousExpenses;
  const categoryBudgets = budgets.filter((budget) => budget.id !== "overall").slice(0, 4);

  return (
    <section
      aria-label={brand.name + " dashboard preview"}
      className="w-full bg-background p-3 text-foreground sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Dashboard</p>
          <p className="truncate text-xs text-muted-foreground">{DEMO_MONTH} · Demo data</p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {accounts.length} accounts
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-4">
        <SummaryTile
          label="Total balance"
          amount={summary.totalBalance}
          hint="Across all accounts"
        />
        <SummaryTile
          label="Income"
          amount={summary.income}
          delta={percentChange(summary.income, summary.previousIncome)}
          hint="vs last month"
        />
        <SummaryTile
          label="Expenses"
          amount={summary.expenses}
          delta={percentChange(summary.expenses, summary.previousExpenses)}
          hint="vs last month"
          invert
        />
        <SummaryTile
          label="Net cash flow"
          amount={summary.net}
          delta={percentChange(summary.net, previousNet)}
          hint={summary.savingsRate + "% savings rate"}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:mt-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="p-3 pb-0 sm:p-4 sm:pb-0">
            <CardTitle className="text-sm">Cash flow</CardTitle>
            <p className="text-xs text-muted-foreground">Income and expenses, last six months</p>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <CashFlowChart
              data={cashFlow}
              currency={DEMO_CURRENCY}
              locale={DEMO_LOCALE}
              animated={false}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="p-3 pb-0 sm:p-4 sm:pb-0">
            <CardTitle className="text-sm">Where it went</CardTitle>
            <p className="text-xs text-muted-foreground">Spending by category</p>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="lg:[&>div]:flex-col lg:[&_dl]:grid lg:[&_dl]:grid-cols-2 lg:[&_dl]:gap-x-6">
              <CategoryDonut
                data={spendingByCategory}
                currency={DEMO_CURRENCY}
                locale={DEMO_LOCALE}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="min-w-0">
          <CardHeader className="p-3 pb-0 sm:p-4 sm:pb-0">
            <CardTitle className="text-sm">Budgets</CardTitle>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
            {categoryBudgets.map((budget) => {
              const progress = budgetProgress(budget.spent, budget.limit);
              const meta = BUDGET_STATE[progress.state];
              const StateIcon = meta.icon;
              return (
                <div key={budget.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{budget.name}</span>
                    <span
                      className={"inline-flex shrink-0 items-center gap-1 text-[11px] " + meta.tone}
                    >
                      <StateIcon className="size-3" aria-hidden="true" />
                      {meta.label}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(progress.percent, 100)}
                    className={"h-1.5 " + INDICATOR_TONE[progress.state]}
                  />
                  <div className="flex justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
                    <span className="truncate">
                      {formatMoney(budget.spent, DEMO_CURRENCY, DEMO_LOCALE)}
                    </span>
                    <span className="shrink-0">
                      {formatMoney(budget.limit, DEMO_CURRENCY, DEMO_LOCALE)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="p-3 pb-0 sm:p-4 sm:pb-0">
            <CardTitle className="text-sm">Goals</CardTitle>
            <p className="text-xs text-muted-foreground">Progress toward what matters</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
            {goals.map((goal) => {
              const percent = Math.min(100, Math.round((goal.contributed / goal.target) * 100));
              return (
                <div key={goal.id} className="flex items-center gap-2.5">
                  <ProgressRing value={percent} size={40} strokeWidth={5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{goal.name}</p>
                    <p className="truncate text-[11px] tabular-nums text-muted-foreground">
                      {formatMoney(goal.contributed, DEMO_CURRENCY, DEMO_LOCALE)} of{" "}
                      {formatMoney(goal.target, DEMO_CURRENCY, DEMO_LOCALE)}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="p-3 pb-0 sm:p-4 sm:pb-0">
            <CardTitle className="text-sm">Upcoming bills</CardTitle>
            <p className="text-xs text-muted-foreground">Next two weeks</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 p-3 sm:p-4">
            {bills.slice(0, 4).map((bill) => (
              <div key={bill.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <Receipt className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{bill.payee}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {bill.dueDate} · {bill.account}
                    </p>
                  </div>
                </div>
                <AmountText
                  amount={bill.amount}
                  currency={DEMO_CURRENCY}
                  locale={DEMO_LOCALE}
                  type="expense"
                  className="shrink-0 text-xs font-medium"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="p-3 pb-0 sm:p-4 sm:pb-0">
            <CardTitle className="text-sm">Recent activity</CardTitle>
            <p className="text-xs text-muted-foreground">Latest transactions</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 p-3 sm:p-4">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    {transaction.type === "income" ? (
                      <TrendingUp className="size-3.5" aria-hidden="true" />
                    ) : transaction.type === "transfer" ? (
                      <ArrowLeftRight className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Receipt className="size-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{transaction.payee}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatDate(transaction.date, DEMO_LOCALE, "MMM d")} ·{" "}
                      {transaction.category ?? "Transfer"}
                    </p>
                  </div>
                </div>
                <AmountText
                  amount={transaction.amount}
                  currency={DEMO_CURRENCY}
                  locale={DEMO_LOCALE}
                  type={transaction.type}
                  signed={transaction.type !== "transfer"}
                  className="shrink-0 text-xs font-medium"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

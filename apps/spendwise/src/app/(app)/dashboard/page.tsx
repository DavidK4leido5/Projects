import type { Metadata } from "next";
import { endOfMonth, startOfMonth } from "date-fns";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  AmountText,
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
  ProgressRing,
  StatCard,
} from "@repo/ui";
import { budgetProgress, formatDate, formatMoney } from "@repo/finance";
import { CategoryDonut } from "@/features/dashboard/category-donut";
import { CashFlowChart } from "@/features/dashboard/cash-flow-chart";
import { getDashboardData } from "@/features/dashboard/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

const STATE_ICON = {
  on_track: CheckCircle2,
  near_limit: AlertTriangle,
  exceeded: AlertOctagon,
} as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const { settings } = data;
  const currency = settings.currency;
  const locale = settings.locale;
  const monthFrom = startOfMonth(new Date());
  const monthTo = endOfMonth(new Date());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={
          formatDate(monthFrom, locale, "MMMM yyyy") +
          " · " +
          formatDate(monthFrom, locale, "MMM d") +
          " – " +
          formatDate(monthTo, locale, "MMM d")
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/transactions">
                <ArrowLeftRight className="size-4" aria-hidden />
                View transactions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports">
                <FileText className="size-4" aria-hidden />
                Report
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/transactions?new=1">
                <Plus className="size-4" aria-hidden />
                Add transaction
              </Link>
            </Button>
          </div>
        }
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total balance"
          value={formatMoney(data.totalBalance, currency, locale)}
          hint={data.accounts.length + (data.accounts.length === 1 ? " account" : " accounts")}
          icon={Wallet}
          emphasis
        />
        <StatCard
          title="Income this month"
          value={formatMoney(data.current.income, currency, locale)}
          delta={data.deltas.income}
          deltaLabel="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          title="Expenses this month"
          value={formatMoney(data.current.expense, currency, locale)}
          delta={data.deltas.expense}
          deltaLabel="vs last month"
          invertDelta
          icon={TrendingDown}
        />
        <StatCard
          title="Net cash flow"
          value={formatMoney(data.current.net, currency, locale)}
          delta={data.deltas.net}
          deltaLabel="vs last month"
          hint={data.current.savingsRate + "% savings rate"}
          icon={CreditCard}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Cash flow</CardTitle>
            <CardDescription>Income and expenses over the last six months.</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={data.series} currency={currency} locale={locale} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Where it went</CardTitle>
            <CardDescription>Spending by category this month.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.spending.length > 0 ? (
              <CategoryDonut data={data.spending} currency={currency} locale={locale} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing spent this month yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Budgets</CardTitle>
              <CardDescription>This month</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/budgets">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.budgets.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No budgets yet"
                description="Set a monthly limit and watch it here."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/budgets">Create a budget</Link>
                  </Button>
                }
              />
            ) : (
              data.budgets.slice(0, 4).map((budget) => {
                const progress = budgetProgress(budget.spent, budget.amount, 0);
                const Icon = STATE_ICON[progress.state];
                return (
                  <div key={budget.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryBadge
                          name={budget.categoryName ?? "Overall"}
                          color={budget.categoryColor ?? "slate"}
                        />
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="size-3.5" aria-hidden />
                        {progress.percent}%
                      </span>
                    </div>
                    <Progress value={Math.min(progress.percent, 100)} className="h-1.5" />
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                      <span>{formatMoney(budget.spent, currency, locale)} spent</span>
                      <span>{formatMoney(budget.amount, currency, locale)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Goals</CardTitle>
              <CardDescription>Progress toward what matters</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/goals">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.goals.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No savings goals"
                description="Create one to give your savings a direction."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/goals">Create a goal</Link>
                  </Button>
                }
              />
            ) : (
              data.goals.slice(0, 3).map((goal) => {
                const percent = Math.min(
                  100,
                  Math.round((goal.contributed / goal.targetAmount) * 100),
                );
                return (
                  <div key={goal.id} className="flex items-center gap-3">
                    <ProgressRing value={percent} size={44} strokeWidth={5} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{goal.name}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatMoney(goal.contributed, goal.currency, locale)} of{" "}
                        {formatMoney(goal.targetAmount, goal.currency, locale)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Upcoming bills</CardTitle>
              <CardDescription>Next 14 days</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/recurring">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.upcomingBills.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing due in the next two weeks.
              </p>
            ) : (
              data.upcomingBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
                      <Receipt className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{bill.payee}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(bill.nextRunAt, locale)}
                      </p>
                    </div>
                  </div>
                  <AmountText
                    amount={bill.amount}
                    currency={bill.currency}
                    locale={locale}
                    type={bill.type === "income" ? "income" : "expense"}
                    className="whitespace-nowrap text-sm font-medium"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No transactions yet"
              description="Add your first income or expense to see the dashboard come to life."
              action={
                <Button asChild size="sm">
                  <Link href="/transactions">Add a transaction</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.recent.map((txn) => (
                <li
                  key={txn.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                      {txn.type === "income" ? (
                        <TrendingUp className="size-4" aria-hidden />
                      ) : txn.type === "transfer" ? (
                        <ArrowLeftRight className="size-4" aria-hidden />
                      ) : (
                        <Receipt className="size-4" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{txn.payee}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(txn.date, locale)} · {txn.accountName}
                        {txn.categoryName ? " · " + txn.categoryName : ""}
                      </p>
                    </div>
                  </div>
                  <AmountText
                    amount={txn.amount}
                    currency={txn.currency}
                    locale={locale}
                    type={txn.type}
                    signed={txn.type !== "transfer"}
                    className="whitespace-nowrap text-sm font-medium"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

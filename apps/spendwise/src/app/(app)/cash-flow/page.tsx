import type { Metadata } from "next";
import { Suspense } from "react";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { ArrowLeftRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@repo/ui";
import { formatDate, formatMoney, percentChange } from "@repo/finance";
import { PageSkeleton } from "@/components/page-skeleton";
import { CategoryDonut } from "@/features/dashboard/category-donut";
import { CashFlowChart } from "@/features/dashboard/cash-flow-chart";
import { getDashboardData } from "@/features/dashboard/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cash flow" };

export default function CashFlowPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CashFlowBody />
    </Suspense>
  );
}

async function CashFlowBody() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const { settings } = data;
  const from = startOfMonth(subMonths(new Date(), 5));
  const to = endOfMonth(new Date());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cash flow"
        description={
          formatDate(from, settings.locale, "MMM yyyy") +
          " – " +
          formatDate(to, settings.locale, "MMM yyyy") +
          " · transfers excluded"
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/transactions">
              <ArrowLeftRight className="size-4" aria-hidden />
              Transactions
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Income"
          value={formatMoney(data.current.income, settings.currency, settings.locale)}
          delta={data.deltas.income}
          deltaLabel="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          title="Expenses"
          value={formatMoney(data.current.expense, settings.currency, settings.locale)}
          delta={data.deltas.expense}
          deltaLabel="vs last month"
          invertDelta
          icon={TrendingDown}
        />
        <StatCard
          title="Net"
          value={formatMoney(data.current.net, settings.currency, settings.locale)}
          delta={data.deltas.net}
          deltaLabel="vs last month"
          icon={Wallet}
          emphasis
        />
        <StatCard
          title="Savings rate"
          value={data.current.savingsRate + "%"}
          hint={
            data.previous.savingsRate === 0
              ? "No prior income to compare"
              : percentChange(data.current.savingsRate, data.previous.savingsRate) +
                "% vs last month"
          }
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Income vs expenses</CardTitle>
          <CardDescription>Six-month view. Transfers never appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={data.series} currency={settings.currency} locale={settings.locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spending by category</CardTitle>
          <CardDescription>Where the money went this month.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.spending.length > 0 ? (
            <CategoryDonut
              data={data.spending}
              currency={settings.currency}
              locale={settings.locale}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No expenses recorded this month.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

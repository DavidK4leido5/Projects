import type { Metadata } from "next";
import { Suspense } from "react";
import { monthKey } from "@repo/finance";
import { PageSkeleton } from "@/components/page-skeleton";
import { BudgetsView } from "@/features/budgets/budgets-view";
import { isMonthKey } from "@/features/budgets/month";
import { listBudgetCategories, listBudgets } from "@/features/budgets/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Budgets" };

export default function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BudgetsBody searchParams={searchParams} />
    </Suspense>
  );
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function BudgetsBody({
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

  return (
    <BudgetsView
      month={month}
      currentMonth={currentMonth}
      rows={data.rows}
      previousRows={data.previousRows}
      categories={categories}
      currency={settings.currency}
      locale={settings.locale}
    />
  );
}

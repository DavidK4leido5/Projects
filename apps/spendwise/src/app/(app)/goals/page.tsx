import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { GoalsView } from "@/features/goals/goals-view";
import { listGoalContributions, listGoalOptions, listGoals } from "@/features/goals/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GoalsBody searchParams={searchParams} />
    </Suspense>
  );
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function GoalsBody({
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

  return (
    <GoalsView
      goals={goals}
      selectedId={selected?.id ?? null}
      history={history}
      accounts={accounts}
      currency={settings.currency}
      locale={settings.locale}
    />
  );
}

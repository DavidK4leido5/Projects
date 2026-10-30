import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { listRules } from "@/features/recurring/queries";
import { RecurringView } from "@/features/recurring/recurring-view";
import { getSettings } from "@/features/settings/queries";
import { listTransactionOptions } from "@/features/transactions/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Recurring" };

export default function RecurringPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RecurringBody />
    </Suspense>
  );
}

async function RecurringBody() {
  const user = await requireUser();
  const [rules, options, settings] = await Promise.all([
    listRules(user.id),
    listTransactionOptions(user.id),
    getSettings(user.id),
  ]);

  return (
    <RecurringView
      rules={rules}
      accounts={options.accounts}
      categories={options.categories}
      currency={settings.currency}
      locale={settings.locale}
    />
  );
}

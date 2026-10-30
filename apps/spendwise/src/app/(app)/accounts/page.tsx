import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { AccountsView } from "@/features/accounts/accounts-view";
import { listAccountsWithBalances } from "@/features/accounts/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountsBody />
    </Suspense>
  );
}

async function AccountsBody() {
  const user = await requireUser();
  const [accounts, settings] = await Promise.all([
    listAccountsWithBalances(user.id),
    getSettings(user.id),
  ]);

  return <AccountsView accounts={accounts} currency={settings.currency} locale={settings.locale} />;
}

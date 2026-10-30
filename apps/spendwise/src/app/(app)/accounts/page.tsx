import type { Metadata } from "next";
import { Landmark, Wallet } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@repo/ui";
import { formatMoney, netWorth } from "@repo/finance";
import { AccountActions } from "@/features/accounts/account-actions";
import { AccountDialog } from "@/features/accounts/account-dialog";
import { ACCOUNT_ICONS, ACCOUNT_TYPE_META } from "@/features/accounts/account-meta";
import { listAccountsWithBalances } from "@/features/accounts/queries";
import { getSettings } from "@/features/settings/queries";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@repo/shared";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const user = await requireUser();
  const [accounts, settings] = await Promise.all([
    listAccountsWithBalances(user.id),
    getSettings(user.id),
  ]);

  const active = accounts.filter((account) => !account.archived);
  const archived = accounts.filter((account) => account.archived);
  const worth = netWorth(
    active.map((account) => ({ type: account.type, balance: account.balance })),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accounts"
        description="Everything you hold, and everything you owe."
        actions={<AccountDialog currency={settings.currency} />}
      />

      <section aria-label="Net worth" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Net worth"
          value={formatMoney(worth.net, settings.currency, settings.locale)}
          hint={active.length + " active accounts"}
          icon={Wallet}
          emphasis
        />
        <StatCard
          title="Assets"
          value={formatMoney(worth.assets, settings.currency, settings.locale)}
          icon={Landmark}
        />
        <StatCard
          title="Liabilities"
          value={formatMoney(worth.liabilities, settings.currency, settings.locale)}
          hint="Credit card balances"
        />
      </section>

      <section aria-label="Your accounts" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((account) => {
          const meta = ACCOUNT_TYPE_META[account.type];
          const Icon = ACCOUNT_ICONS[account.icon] ?? meta.icon;
          return (
            <Card key={account.id} className={cn(account.balance < 0 && "border-negative/30")}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <AccountActions id={account.id} name={account.name} archived={account.archived} />
                </div>
                <div>
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {meta.label} · {account.currency}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-xl font-semibold tabular-nums",
                    account.balance < 0 ? "text-negative" : "text-foreground",
                  )}
                >
                  {formatMoney(account.balance, account.currency, settings.locale)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {archived.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archived</CardTitle>
            <CardDescription>
              Kept for history. Restore one to add transactions again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {archived.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm">{account.name}</span>
                  <Badge variant="secondary">Archived</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatMoney(account.balance, account.currency, settings.locale)}
                  </span>
                  <AccountActions id={account.id} name={account.name} archived={account.archived} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { Landmark, Plus, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from "@repo/ui";
import { formatMoney, netWorth } from "@repo/finance";
import { cn } from "@repo/shared";
import { AccountActions } from "@/features/accounts/account-actions";
import { AccountDialog, type AccountFormValues } from "@/features/accounts/account-dialog";
import { ACCOUNT_ICONS, ACCOUNT_TYPE_META } from "@/features/accounts/account-meta";
import { createAccount, setAccountArchived, updateAccount } from "@/features/accounts/actions";
import type { AccountWithBalance } from "@/features/accounts/queries";

type OptimisticAction =
  | { type: "create"; account: AccountWithBalance }
  | { type: "update"; id: string; values: AccountFormValues }
  | { type: "archived"; id: string; archived: boolean };

function reduceAccounts(
  accounts: AccountWithBalance[],
  action: OptimisticAction,
): AccountWithBalance[] {
  switch (action.type) {
    case "create":
      return [...accounts, action.account];
    case "update":
      return accounts.map((account) => {
        if (account.id !== action.id) return account;
        return {
          ...account,
          name: action.values.name,
          type: action.values.type,
          currency: action.values.currency.toUpperCase(),
          startingBalance: action.values.startingBalance,
          balance: account.balance - account.startingBalance + action.values.startingBalance,
        };
      });
    case "archived":
      return accounts.map((account) =>
        account.id === action.id ? { ...account, archived: action.archived } : account,
      );
  }
}

export function AccountsView({
  accounts: initialAccounts,
  currency,
  locale,
}: {
  accounts: AccountWithBalance[];
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [accounts, apply] = useOptimistic(initialAccounts, reduceAccounts);
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);

  const active = accounts.filter((account) => !account.archived);
  const archived = accounts.filter((account) => account.archived);
  const worth = netWorth(active);

  function handleCreate(values: AccountFormValues) {
    const accountCurrency = values.currency.toUpperCase();
    const optimistic: AccountWithBalance = {
      id: "optimistic-" + crypto.randomUUID(),
      name: values.name,
      type: values.type,
      currency: accountCurrency,
      color: "slate",
      icon: "wallet",
      startingBalance: values.startingBalance,
      archived: false,
      sortOrder: accounts.reduce((max, account) => Math.max(max, account.sortOrder), -1) + 1,
      balance: values.startingBalance,
    };

    startTransition(async () => {
      apply({ type: "create", account: optimistic });
      const result = await createAccount({
        name: values.name,
        type: values.type,
        startingBalance: values.startingBalance,
        currency: accountCurrency,
        color: "slate",
        icon: "wallet",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Account added");
      router.refresh();
    });
  }

  function handleUpdate(account: AccountWithBalance, values: AccountFormValues) {
    setEditing(null);
    startTransition(async () => {
      apply({ type: "update", id: account.id, values });
      const result = await updateAccount({
        id: account.id,
        name: values.name,
        type: values.type,
        startingBalance: values.startingBalance,
        currency: values.currency.toUpperCase(),
        color: account.color,
        icon: account.icon,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Account updated");
      router.refresh();
    });
  }

  function handleToggleArchived(account: AccountWithBalance) {
    const nextArchived = !account.archived;
    startTransition(async () => {
      apply({ type: "archived", id: account.id, archived: nextArchived });
      const result = await setAccountArchived(account.id, nextArchived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success((nextArchived ? "Archived " : "Restored ") + account.name);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accounts"
        description="Everything you hold, and everything you owe."
        actions={
          <AccountDialog
            currency={currency}
            onSubmit={handleCreate}
            trigger={
              <Button>
                <Plus className="size-4" aria-hidden />
                Add account
              </Button>
            }
          />
        }
      />

      <section aria-label="Net worth" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Net worth"
          value={formatMoney(worth.net, currency, locale)}
          hint={active.length + " active accounts"}
          icon={Wallet}
          emphasis
        />
        <StatCard
          title="Assets"
          value={formatMoney(worth.assets, currency, locale)}
          icon={Landmark}
        />
        <StatCard
          title="Liabilities"
          value={formatMoney(worth.liabilities, currency, locale)}
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
                  <AccountActions
                    name={account.name}
                    archived={account.archived}
                    onEdit={() => setEditing(account)}
                    onToggleArchived={() => handleToggleArchived(account)}
                  />
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
                  {formatMoney(account.balance, account.currency, locale)}
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
                    {formatMoney(account.balance, account.currency, locale)}
                  </span>
                  <AccountActions
                    name={account.name}
                    archived={account.archived}
                    onEdit={() => setEditing(account)}
                    onToggleArchived={() => handleToggleArchived(account)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <AccountDialog
          account={editing}
          currency={currency}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          onSubmit={(values) => handleUpdate(editing, values)}
        />
      ) : null}
    </div>
  );
}

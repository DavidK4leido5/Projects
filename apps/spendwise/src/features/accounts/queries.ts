import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { accounts, transactions, type AccountType } from "@repo/db/schema";
import { getDb } from "@/lib/db";

export type AccountWithBalance = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  color: string;
  icon: string;
  startingBalance: number;
  archived: boolean;
  sortOrder: number;
  balance: number;
};

/**
 * Balances are folded in memory from the user's transactions.
 *
 * ponytail: one pass over all of a user's rows. Fine for personal volumes;
 * move the CASE SUM into SQL when a single user reaches six figures of rows.
 */
export async function listAccountsWithBalances(userId: string): Promise<AccountWithBalance[]> {
  const db = getDb();
  const [accountRows, transactionRows] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)))
      .orderBy(asc(accounts.archived), asc(accounts.sortOrder), asc(accounts.name)),
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        accountId: transactions.accountId,
        transferAccountId: transactions.transferAccountId,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt))),
  ]);

  const balances = new Map<string, number>(
    accountRows.map((account) => [account.id, account.startingBalance]),
  );

  for (const txn of transactionRows) {
    if (txn.type === "income") {
      balances.set(txn.accountId, (balances.get(txn.accountId) ?? 0) + txn.amount);
    } else if (txn.type === "expense") {
      balances.set(txn.accountId, (balances.get(txn.accountId) ?? 0) - txn.amount);
    } else {
      balances.set(txn.accountId, (balances.get(txn.accountId) ?? 0) - txn.amount);
      if (txn.transferAccountId) {
        balances.set(
          txn.transferAccountId,
          (balances.get(txn.transferAccountId) ?? 0) + txn.amount,
        );
      }
    }
  }

  return accountRows.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    color: account.color,
    icon: account.icon,
    startingBalance: account.startingBalance,
    archived: account.archived,
    sortOrder: account.sortOrder,
    balance: balances.get(account.id) ?? account.startingBalance,
  }));
}

export async function listActiveAccounts(userId: string) {
  return getDb()
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.archived, false), isNull(accounts.deletedAt)),
    )
    .orderBy(asc(accounts.sortOrder), asc(accounts.name));
}

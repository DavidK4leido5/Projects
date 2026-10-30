import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  accounts,
  categories,
  tags,
  transactionTags,
  transactions,
  type TransactionType,
} from "@repo/db/schema";
import { getDb } from "@/lib/db";

export type TransactionRow = {
  id: string;
  date: Date;
  type: TransactionType;
  amount: number;
  currency: string;
  payee: string;
  notes: string | null;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  paymentMethod: string;
  isRecurring: boolean;
  tags: { id: string; name: string }[];
};

export type TransactionSort = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export type TransactionFilters = {
  search?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  tagId?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  page: number;
  pageSize: number;
  sort: TransactionSort;
};

const transferAccounts = alias(accounts, "transfer_accounts");

export type TransactionFilterFields = Omit<TransactionFilters, "page" | "pageSize">;

function buildConditions(userId: string, filters: TransactionFilterFields) {
  const conditions = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];

  if (filters.search) {
    const term = "%" + filters.search.replace(/[%_]/g, "") + "%";
    const match = or(ilike(transactions.payee, term), ilike(transactions.notes, term));
    if (match) conditions.push(match);
  }
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.accountId) {
    const match = or(
      eq(transactions.accountId, filters.accountId),
      eq(transactions.transferAccountId, filters.accountId),
    );
    if (match) conditions.push(match);
  }
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.from) conditions.push(gte(transactions.date, new Date(filters.from + "T00:00:00")));
  if (filters.to) conditions.push(lte(transactions.date, new Date(filters.to + "T23:59:59.999")));
  if (typeof filters.minAmount === "number") {
    conditions.push(gte(transactions.amount, filters.minAmount));
  }
  if (typeof filters.maxAmount === "number") {
    conditions.push(lte(transactions.amount, filters.maxAmount));
  }

  return conditions;
}

function orderFor(sort: TransactionSort) {
  switch (sort) {
    case "date_asc":
      return [asc(transactions.date), asc(transactions.createdAt)];
    case "amount_desc":
      return [desc(transactions.amount), desc(transactions.date)];
    case "amount_asc":
      return [asc(transactions.amount), desc(transactions.date)];
    default:
      return [desc(transactions.date), desc(transactions.createdAt)];
  }
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<{ rows: TransactionRow[]; total: number; page: number; pageCount: number }> {
  const db = getDb();
  const conditions = buildConditions(userId, filters);
  const where = and(...conditions);
  const offset = (filters.page - 1) * filters.pageSize;

  const baseQuery = db
    .select({
      id: transactions.id,
      date: transactions.date,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      payee: transactions.payee,
      notes: transactions.notes,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      transferAccountId: transactions.transferAccountId,
      transferAccountName: transferAccounts.name,
      paymentMethod: transactions.paymentMethod,
      isRecurring: transactions.isRecurring,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(transferAccounts, eq(transactions.transferAccountId, transferAccounts.id))
    .where(where)
    .orderBy(...orderFor(filters.sort))
    .limit(filters.pageSize)
    .offset(offset);

  const [rows, totalRows] = await Promise.all([
    baseQuery,
    db.select({ value: count() }).from(transactions).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  const ids = rows.map((row) => row.id);

  const tagRows =
    ids.length > 0
      ? await db
          .select({
            transactionId: transactionTags.transactionId,
            id: tags.id,
            name: tags.name,
          })
          .from(transactionTags)
          .innerJoin(tags, eq(transactionTags.tagId, tags.id))
          .where(inArray(transactionTags.transactionId, ids))
      : [];

  const tagsByTransaction = new Map<string, { id: string; name: string }[]>();
  for (const tag of tagRows) {
    const list = tagsByTransaction.get(tag.transactionId) ?? [];
    list.push({ id: tag.id, name: tag.name });
    tagsByTransaction.set(tag.transactionId, list);
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      tags: tagsByTransaction.get(row.id) ?? [],
    })),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export type TransactionExportRow = {
  date: Date;
  type: TransactionType;
  payee: string;
  amount: number;
  currency: string;
  accountName: string;
  categoryName: string | null;
  notes: string | null;
  paymentMethod: string;
  tags: string;
};

/** Unpaginated rows for CSV export, with the same filters as the page. */
export async function listTransactionsForExport(
  userId: string,
  filters: TransactionFilterFields,
): Promise<TransactionExportRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      type: transactions.type,
      payee: transactions.payee,
      amount: transactions.amount,
      currency: transactions.currency,
      accountName: accounts.name,
      categoryName: categories.name,
      notes: transactions.notes,
      paymentMethod: transactions.paymentMethod,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...buildConditions(userId, filters)))
    .orderBy(...orderFor(filters.sort));

  const tagsByTransaction = new Map<string, string[]>();
  const chunkSize = 500;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const ids = rows.slice(index, index + chunkSize).map((row) => row.id);
    const tagRows = await db
      .select({ transactionId: transactionTags.transactionId, name: tags.name })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(inArray(transactionTags.transactionId, ids));
    for (const tag of tagRows) {
      const list = tagsByTransaction.get(tag.transactionId) ?? [];
      list.push(tag.name);
      tagsByTransaction.set(tag.transactionId, list);
    }
  }

  return rows.map((row) => ({
    date: row.date,
    type: row.type,
    payee: row.payee,
    amount: row.amount,
    currency: row.currency,
    accountName: row.accountName,
    categoryName: row.categoryName,
    notes: row.notes,
    paymentMethod: row.paymentMethod,
    tags: (tagsByTransaction.get(row.id) ?? []).sort().join("; "),
  }));
}

export async function listTransactionOptions(userId: string) {
  const db = getDb();
  const [accountRows, categoryRows, tagRows] = await Promise.all([
    db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        currency: accounts.currency,
      })
      .from(accounts)
      .where(
        and(eq(accounts.userId, userId), eq(accounts.archived, false), isNull(accounts.deletedAt)),
      )
      .orderBy(asc(accounts.sortOrder), asc(accounts.name)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        kind: categories.kind,
        color: categories.color,
        parentId: categories.parentId,
      })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.archived, false),
          isNull(categories.deletedAt),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(asc(tags.name)),
  ]);

  return { accounts: accountRows, categories: categoryRows, tags: tagRows };
}

export async function listRecentTransactions(userId: string, limit = 6) {
  const db = getDb();
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      payee: transactions.payee,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);
}

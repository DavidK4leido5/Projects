"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { transactionInputSchema, transactionUpdateSchema } from "@repo/finance";
import {
  accounts,
  attachments,
  categories,
  tags,
  transactionTags,
  transactions,
  type NewTransaction,
} from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { requireUserId } from "@/lib/auth/session";
import { getDb, getDbPool } from "@/lib/db";
import { MAX_RECEIPT_BYTES, RECEIPT_TYPES, receiptKey, uploadObject } from "@/lib/storage";
import {
  csvMappingSchema,
  duplicateKey,
  isBlankRow,
  normalizeCsvType,
  parseCsv,
  parseCsvAmount,
  parseCsvDate,
  readMappedRow,
  validateMappedRow,
  type ImportResult,
} from "@/features/transactions/csv";

export type CreateTransactionResult = { id: string };

export async function createTransaction(
  input: unknown,
): Promise<ActionResult<CreateTransactionResult>> {
  try {
    const userId = await requireUserId();
    const values = transactionInputSchema.parse(input);
    const db = getDb();

    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.id, values.accountId),
          eq(accounts.userId, userId),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);
    if (!account) throw new Error("That account is not available.");

    if (values.categoryId) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, values.categoryId),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .limit(1);
      if (!category) throw new Error("That category is not available.");
    }

    if (values.type === "transfer" && values.transferAccountId) {
      const [target] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.id, values.transferAccountId),
            eq(accounts.userId, userId),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1);
      if (!target) throw new Error("That destination account is not available.");
    }

    const id = await getDbPool().transaction(async (tx) => {
      const [row] = await tx
        .insert(transactions)
        .values({
          userId,
          accountId: values.accountId,
          categoryId: values.type === "transfer" ? null : values.categoryId,
          transferAccountId: values.type === "transfer" ? values.transferAccountId : null,
          type: values.type,
          amount: values.amount,
          currency: values.currency,
          exchangeRate: values.exchangeRate != null ? String(values.exchangeRate) : null,
          baseAmount: values.baseAmount ?? null,
          date: values.date,
          payee: values.payee,
          notes: values.notes ?? null,
          paymentMethod: values.paymentMethod,
          isRecurring: values.isRecurring ?? false,
        })
        .returning({ id: transactions.id });

      if (!row) throw new Error("The transaction could not be saved.");

      if (values.tagIds && values.tagIds.length > 0) {
        const owned = await tx
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.userId, userId), inArray(tags.id, values.tagIds)));
        if (owned.length > 0) {
          await tx
            .insert(transactionTags)
            .values(owned.map((tag) => ({ transactionId: row.id, tagId: tag.id })));
        }
      }

      return row.id;
    });

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/cash-flow");
    return { ok: true, data: { id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
        ),
      );

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/** Undo for the delete toast. */
export async function restoreTransaction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .update(transactions)
      .set({ deletedAt: null })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function uploadReceipt(
  transactionId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const db = getDb();

    const [transaction] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
        ),
      )
      .limit(1);
    if (!transaction) throw new Error("That transaction is not available.");

    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Choose a receipt file.");
    if (file.size === 0) throw new Error("That file is empty.");
    if (file.size > MAX_RECEIPT_BYTES) throw new Error("Receipts must be 5 MB or smaller.");
    if (!RECEIPT_TYPES.includes(file.type)) {
      throw new Error("Use a PNG, JPEG, WebP, or PDF receipt.");
    }

    const key = receiptKey(userId, file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadObject(key, bytes, file.type);

    const [row] = await db
      .insert(attachments)
      .values({
        userId,
        transactionId,
        fileName: file.name.slice(0, 200),
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey: key,
        provider: "neon",
      })
      .returning({ id: attachments.id });

    if (!row) throw new Error("The receipt could not be saved.");
    revalidatePath("/transactions");
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return actionError(error);
  }
}

function revalidateTransactions() {
  revalidatePath("/transactions");
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/cash-flow");
}

async function assertAccountsOwned(userId: string, ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return;
  const rows = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), inArray(accounts.id, unique), isNull(accounts.deletedAt)),
    );
  if (rows.length !== unique.length) throw new Error("That account is not available.");
}

export async function updateTransaction(input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const values = transactionUpdateSchema.parse(input);
    const db = getDb();

    const [existing] = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        transferAccountId: transactions.transferAccountId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, values.id),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("That transaction is not available.");

    const type = values.type ?? existing.type;
    const accountId = values.accountId ?? existing.accountId;
    const transferAccountId =
      values.transferAccountId !== undefined
        ? values.transferAccountId
        : existing.transferAccountId;
    const categoryId = values.categoryId !== undefined ? values.categoryId : existing.categoryId;

    if (values.accountId !== undefined || transferAccountId) {
      await assertAccountsOwned(userId, [
        accountId,
        ...(transferAccountId ? [transferAccountId] : []),
      ]);
    }

    if (type === "transfer") {
      if (!transferAccountId) throw new Error("Choose the account money moves to.");
      if (transferAccountId === accountId) {
        throw new Error("Transfer accounts must be different.");
      }
    }

    if (type !== "transfer" && categoryId) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, categoryId),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .limit(1);
      if (!category) throw new Error("That category is not available.");
    }

    const patch: Partial<NewTransaction> = {
      updatedAt: new Date(),
      categoryId: type === "transfer" ? null : categoryId,
      transferAccountId: type === "transfer" ? transferAccountId : null,
    };
    if (values.type !== undefined) patch.type = values.type;
    if (values.amount !== undefined) patch.amount = values.amount;
    if (values.currency !== undefined) patch.currency = values.currency;
    if (values.accountId !== undefined) patch.accountId = values.accountId;
    if (values.date !== undefined) patch.date = values.date;
    if (values.payee !== undefined) patch.payee = values.payee;
    if (values.notes !== undefined) patch.notes = values.notes;
    if (values.paymentMethod !== undefined) patch.paymentMethod = values.paymentMethod;
    if (values.isRecurring !== undefined) patch.isRecurring = values.isRecurring;
    if (values.exchangeRate !== undefined) {
      patch.exchangeRate = values.exchangeRate == null ? null : String(values.exchangeRate);
    }
    if (values.baseAmount !== undefined) patch.baseAmount = values.baseAmount;

    await getDbPool().transaction(async (tx) => {
      await tx
        .update(transactions)
        .set(patch)
        .where(and(eq(transactions.id, values.id), eq(transactions.userId, userId)));

      if (values.tagIds !== undefined) {
        await tx.delete(transactionTags).where(eq(transactionTags.transactionId, values.id));
        if (values.tagIds.length > 0) {
          const owned = await tx
            .select({ id: tags.id })
            .from(tags)
            .where(and(eq(tags.userId, userId), inArray(tags.id, values.tagIds)));
          if (owned.length > 0) {
            await tx
              .insert(transactionTags)
              .values(owned.map((tag) => ({ transactionId: values.id, tagId: tag.id })));
          }
        }
      }
    });

    revalidateTransactions();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

const idsSchema = z
  .array(z.uuid("transaction"), "Select transactions")
  .min(1, "Select at least one transaction")
  .max(500, "Select 500 transactions or fewer");

export async function bulkDeleteTransactions(
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();
    const { ids } = z.object({ ids: idsSchema }).parse(input);

    const rows = await getDb()
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.id, ids),
          isNull(transactions.deletedAt),
        ),
      )
      .returning({ id: transactions.id });

    revalidateTransactions();
    return { ok: true, data: { count: rows.length } };
  } catch (error) {
    return actionError(error);
  }
}

export async function bulkSetCategory(input: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();
    const { ids, categoryId } = z
      .object({ ids: idsSchema, categoryId: z.uuid("category").nullable() })
      .parse(input);

    if (categoryId) {
      const [category] = await getDb()
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, categoryId),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .limit(1);
      if (!category) throw new Error("That category is not available.");
    }

    const rows = await getDb()
      .update(transactions)
      .set({ categoryId, updatedAt: new Date() })
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.id, ids),
          ne(transactions.type, "transfer"),
          isNull(transactions.deletedAt),
        ),
      )
      .returning({ id: transactions.id });

    revalidateTransactions();
    return { ok: true, data: { count: rows.length } };
  } catch (error) {
    return actionError(error);
  }
}

export async function bulkAddTag(input: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();
    const { ids, name } = z
      .object({
        ids: idsSchema,
        name: z.string().trim().min(1, "Enter a tag name").max(40, "Keep tags under 40 characters"),
      })
      .parse(input);

    const count = await getDbPool().transaction(async (tx) => {
      const owned = await tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            inArray(transactions.id, ids),
            isNull(transactions.deletedAt),
          ),
        );
      if (owned.length === 0) throw new Error("Select at least one transaction.");

      const [existing] = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, userId), sql`lower(${tags.name}) = ${name.toLowerCase()}`))
        .limit(1);

      let tagId = existing?.id;
      if (!tagId) {
        const [created] = await tx.insert(tags).values({ userId, name }).returning({ id: tags.id });
        if (!created) throw new Error("The tag could not be created.");
        tagId = created.id;
      }

      await tx
        .insert(transactionTags)
        .values(owned.map((row) => ({ transactionId: row.id, tagId })))
        .onConflictDoNothing();

      return owned.length;
    });

    revalidateTransactions();
    return { ok: true, data: { count } };
  } catch (error) {
    return actionError(error);
  }
}

const MAX_IMPORT_ROWS = 2000;
const MAX_CSV_CHARS = 2 * 1024 * 1024;

/**
 * CSV import. Accounts and categories resolve by name (case-insensitive);
 * unknown ones are row errors rather than silent creations. Duplicates are
 * detected by account, day, amount, and normalized payee.
 *
 * ponytail: duplicate detection reads the user's non-deleted transactions once
 * into memory. Fine for personal volumes; move to a temp table when a user
 * reaches six figures.
 */
export async function importTransactions(input: unknown): Promise<ActionResult<ImportResult>> {
  try {
    const userId = await requireUserId();
    const { csvText, mapping } = z
      .object({
        csvText: z
          .string()
          .min(1, "Choose a CSV file.")
          .max(MAX_CSV_CHARS, "Keep the file under 2 MB."),
        mapping: csvMappingSchema,
      })
      .parse(input);

    const table = parseCsv(csvText);
    const header = table[0] ?? [];
    const dataRows = table.slice(1).filter((row) => !isBlankRow(row));
    if (header.length === 0) throw new Error("That file has no header row.");
    if (dataRows.length === 0) throw new Error("That file has no data rows.");
    if (dataRows.length > MAX_IMPORT_ROWS) {
      throw new Error("Import at most 2,000 rows at a time.");
    }

    const usedColumns = [mapping.date, mapping.payee, mapping.amount].concat(
      [mapping.type, mapping.category, mapping.account, mapping.notes].filter(
        (index): index is number => index !== null,
      ),
    );
    if (usedColumns.some((index) => index < 0 || index >= header.length)) {
      throw new Error("The column mapping does not match this file.");
    }

    const db = getDb();
    const [accountRows, categoryRows, existingRows] = await Promise.all([
      db
        .select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, userId),
            eq(accounts.archived, false),
            isNull(accounts.deletedAt),
          ),
        )
        .orderBy(asc(accounts.sortOrder), asc(accounts.name)),
      db
        .select({ id: categories.id, name: categories.name, kind: categories.kind })
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            eq(categories.archived, false),
            isNull(categories.deletedAt),
          ),
        ),
      db
        .select({
          accountId: transactions.accountId,
          date: transactions.date,
          amount: transactions.amount,
          payee: transactions.payee,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt))),
    ]);

    if (accountRows.length === 0) throw new Error("Add an account before importing.");

    const accountByName = new Map(accountRows.map((row) => [row.name.toLowerCase(), row]));
    const categoryByName = new Map(categoryRows.map((row) => [row.name.toLowerCase(), row]));
    const defaultAccount = accountRows[0];
    const seen = new Set(
      existingRows.map((row) => duplicateKey(row.accountId, row.date, row.amount, row.payee)),
    );

    const values: NewTransaction[] = [];
    const errors: { row: number; message: string }[] = [];
    let skipped = 0;

    for (const [index, cells] of dataRows.entries()) {
      const rowNumber = index + 2;
      const mapped = readMappedRow(cells, mapping);
      const rowErrors = validateMappedRow(mapped);
      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, message: rowErrors[0] ?? "Row is invalid." });
        continue;
      }
      if (mapped.payee.length > 120) {
        errors.push({ row: rowNumber, message: "Keep the payee under 120 characters." });
        continue;
      }

      const date = parseCsvDate(mapped.date);
      const minor = parseCsvAmount(mapped.amount);
      if (!date || minor === null) {
        errors.push({ row: rowNumber, message: "Date or amount is not valid." });
        continue;
      }

      const type = mapped.type ? normalizeCsvType(mapped.type) : minor < 0 ? "expense" : "income";
      if (!type) {
        errors.push({ row: rowNumber, message: "Unknown transaction type." });
        continue;
      }
      if (type === "transfer") {
        errors.push({ row: rowNumber, message: "Transfers cannot be imported from CSV." });
        continue;
      }

      const account = mapped.account
        ? accountByName.get(mapped.account.toLowerCase())
        : defaultAccount;
      if (!account) {
        errors.push({ row: rowNumber, message: 'Account "' + mapped.account + '" was not found.' });
        continue;
      }

      let categoryId: string | null = null;
      if (mapped.category) {
        const category = categoryByName.get(mapped.category.toLowerCase());
        if (!category) {
          errors.push({
            row: rowNumber,
            message: 'Category "' + mapped.category + '" was not found.',
          });
          continue;
        }
        if (category.kind !== type) {
          errors.push({
            row: rowNumber,
            message: 'Category "' + category.name + '" is for ' + category.kind + " transactions.",
          });
          continue;
        }
        categoryId = category.id;
      }

      const key = duplicateKey(account.id, date, minor, mapped.payee);
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);

      values.push({
        userId,
        accountId: account.id,
        categoryId,
        transferAccountId: null,
        type,
        amount: Math.abs(minor),
        currency: account.currency,
        date,
        payee: mapped.payee,
        notes: mapped.notes || null,
        paymentMethod: "other",
        isRecurring: false,
      });
    }

    if (values.length > 0) {
      await getDbPool().transaction(async (tx) => {
        const chunkSize = 500;
        for (let index = 0; index < values.length; index += chunkSize) {
          await tx.insert(transactions).values(values.slice(index, index + chunkSize));
        }
      });
      revalidateTransactions();
    }

    return {
      ok: true,
      data: {
        imported: values.length,
        skipped,
        errors: errors.slice(0, 50),
      },
    };
  } catch (error) {
    return actionError(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { budgetInputSchema } from "@repo/finance";
import { budgets, categories } from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { requireUserId } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { shiftMonth } from "@/features/budgets/month";

const idSchema = z.uuid("Choose a valid budget");
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a month like 2026-10");

function revalidateBudgetPaths() {
  revalidatePath("/budgets");
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

/** Upsert by user + category + month; the partial unique indexes enforce the same rule in SQL. */
export async function upsertBudget(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const values = budgetInputSchema.parse(input);
    const periodMonth = values.periodMonth + "-01";
    const db = getDb();

    if (values.categoryId) {
      const [category] = await db
        .select({ id: categories.id, kind: categories.kind })
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
      if (category.kind !== "expense") throw new Error("Budgets only apply to expense categories.");
    }

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.periodMonth, periodMonth),
          values.categoryId
            ? eq(budgets.categoryId, values.categoryId)
            : isNull(budgets.categoryId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(budgets)
        .set({
          amount: values.amount,
          currency: values.currency,
          rollover: values.rollover,
          updatedAt: new Date(),
        })
        .where(and(eq(budgets.id, existing.id), eq(budgets.userId, userId)));

      revalidateBudgetPaths();
      return { ok: true, data: { id: existing.id } };
    }

    const [row] = await db
      .insert(budgets)
      .values({
        userId,
        categoryId: values.categoryId ?? null,
        periodMonth,
        amount: values.amount,
        currency: values.currency,
        rollover: values.rollover,
      })
      .returning({ id: budgets.id });

    if (!row) throw new Error("The budget could not be saved.");

    revalidateBudgetPaths();
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const budgetId = idSchema.parse(id);

    await getDb()
      .delete(budgets)
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));

    revalidateBudgetPaths();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/** Copies last month's limits into the given month, skipping categories that already have one. */
export async function copyBudgetsFromPreviousMonth(
  month: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();
    const target = monthSchema.parse(month);
    const previous = shiftMonth(target, -1);
    const db = getDb();

    const [previousRows, existingRows] = await Promise.all([
      db
        .select({
          categoryId: budgets.categoryId,
          amount: budgets.amount,
          currency: budgets.currency,
          rollover: budgets.rollover,
        })
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.periodMonth, previous + "-01"))),
      db
        .select({ categoryId: budgets.categoryId })
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.periodMonth, target + "-01"))),
    ]);

    const existing = new Set(existingRows.map((row) => row.categoryId ?? "overall"));
    const toInsert = previousRows
      .filter((row) => !existing.has(row.categoryId ?? "overall"))
      .map((row) => ({
        userId,
        categoryId: row.categoryId,
        periodMonth: target + "-01",
        amount: row.amount,
        currency: row.currency,
        rollover: row.rollover,
      }));

    if (toInsert.length > 0) {
      await db.insert(budgets).values(toInsert);
    }

    revalidateBudgetPaths();
    return { ok: true, data: { count: toInsert.length } };
  } catch (error) {
    return actionError(error);
  }
}

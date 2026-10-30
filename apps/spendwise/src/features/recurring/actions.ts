"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { recurringRuleSchema, toDateInput, type RecurringRuleInput } from "@repo/finance";
import { accounts, categories, recurringRules, transactions } from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { requireUserId } from "@/lib/auth/session";
import { getDb, getDbPool } from "@/lib/db";
import { advancePast, advanceRun, nextRunFrom, scheduleOf } from "@/features/recurring/schedule";

function revalidateRecurring(): void {
  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

async function assertOwned(userId: string, values: RecurringRuleInput): Promise<void> {
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
}

function scheduleFor(values: RecurringRuleInput) {
  return {
    frequency: values.frequency,
    interval: values.interval,
    dayOfMonth: values.dayOfMonth ?? null,
    weekday: values.weekday ?? null,
  };
}

function parseRule(input: unknown): RecurringRuleInput {
  const values = recurringRuleSchema.parse(input);
  if (values.type === "transfer") {
    throw new Error("Recurring rules are income or expenses. Transfers are not supported.");
  }
  return values;
}

export async function createRule(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const values = parseRule(input);
    await assertOwned(userId, values);

    const [row] = await getDb()
      .insert(recurringRules)
      .values({
        userId,
        accountId: values.accountId,
        categoryId: values.categoryId ?? null,
        type: values.type,
        amount: values.amount,
        currency: values.currency,
        payee: values.payee,
        notes: values.notes ?? null,
        paymentMethod: values.paymentMethod,
        frequency: values.frequency,
        interval: values.interval,
        dayOfMonth: values.dayOfMonth ?? null,
        weekday: values.weekday ?? null,
        startDate: values.startDate,
        endDate: values.endDate ?? null,
        nextRunAt: nextRunFrom(values.startDate, scheduleFor(values), new Date()),
      })
      .returning({ id: recurringRules.id });

    if (!row) throw new Error("The recurring rule could not be created.");
    revalidateRecurring();
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateRule(id: string, input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const values = parseRule(input);
    await assertOwned(userId, values);

    const db = getDb();
    const [existing] = await db
      .select({
        id: recurringRules.id,
        frequency: recurringRules.frequency,
        interval: recurringRules.interval,
        dayOfMonth: recurringRules.dayOfMonth,
        weekday: recurringRules.weekday,
        startDate: recurringRules.startDate,
        nextRunAt: recurringRules.nextRunAt,
      })
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.id, id),
          eq(recurringRules.userId, userId),
          isNull(recurringRules.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("That recurring rule is not available.");

    // Editing a payee must not skip an overdue run.
    const scheduleChanged =
      existing.frequency !== values.frequency ||
      existing.interval !== values.interval ||
      existing.dayOfMonth !== (values.dayOfMonth ?? null) ||
      existing.weekday !== (values.weekday ?? null) ||
      existing.startDate !== values.startDate;
    const nextRunAt = scheduleChanged
      ? nextRunFrom(values.startDate, scheduleFor(values), new Date())
      : existing.nextRunAt;

    await db
      .update(recurringRules)
      .set({
        accountId: values.accountId,
        categoryId: values.categoryId ?? null,
        type: values.type,
        amount: values.amount,
        currency: values.currency,
        payee: values.payee,
        notes: values.notes ?? null,
        paymentMethod: values.paymentMethod,
        frequency: values.frequency,
        interval: values.interval,
        dayOfMonth: values.dayOfMonth ?? null,
        weekday: values.weekday ?? null,
        startDate: values.startDate,
        endDate: values.endDate ?? null,
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recurringRules.id, id),
          eq(recurringRules.userId, userId),
          isNull(recurringRules.deletedAt),
        ),
      );

    revalidateRecurring();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleRule(id: string, active: boolean): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = getDb();

    const [rule] = await db
      .select()
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.id, id),
          eq(recurringRules.userId, userId),
          isNull(recurringRules.deletedAt),
        ),
      )
      .limit(1);
    if (!rule) throw new Error("That recurring rule is not available.");

    const now = new Date();
    await db
      .update(recurringRules)
      .set({
        active,
        // Resuming skips the runs that passed while it was paused.
        nextRunAt: active ? advancePast(rule.nextRunAt, scheduleOf(rule), now) : rule.nextRunAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(recurringRules.id, id),
          eq(recurringRules.userId, userId),
          isNull(recurringRules.deletedAt),
        ),
      );

    revalidateRecurring();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/** Soft delete: the generated transactions stay and keep their link. */
export async function deleteRule(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await getDb()
      .update(recurringRules)
      .set({ deletedAt: new Date(), active: false, updatedAt: new Date() })
      .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));

    revalidateRecurring();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Records the bill as a real transaction and moves the cursor forward in one
 * transaction. The update is conditional on the old nextRunAt so a double
 * submit cannot post two rows.
 */
export async function markPaid(ruleId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const db = getDb();

    const [rule] = await db
      .select()
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.id, ruleId),
          eq(recurringRules.userId, userId),
          isNull(recurringRules.deletedAt),
        ),
      )
      .limit(1);
    if (!rule) throw new Error("That recurring rule is not available.");
    if (!rule.active) throw new Error("Resume the rule before marking it paid.");
    if (rule.type === "transfer") throw new Error("Recurring rules are income or expenses.");

    const now = new Date();
    const nextRunAt = advanceRun(rule.nextRunAt, scheduleOf(rule));
    const ended = rule.endDate != null && toDateInput(nextRunAt) > rule.endDate;

    const transactionId = await getDbPool().transaction(async (tx) => {
      const [created] = await tx
        .insert(transactions)
        .values({
          userId,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          date: now,
          payee: rule.payee,
          notes: rule.notes,
          paymentMethod: rule.paymentMethod,
          isRecurring: true,
          recurringRuleId: rule.id,
        })
        .returning({ id: transactions.id });
      if (!created) throw new Error("The transaction could not be saved.");

      const advanced = await tx
        .update(recurringRules)
        .set({ nextRunAt, lastRunAt: now, active: !ended, updatedAt: now })
        .where(
          and(
            eq(recurringRules.id, rule.id),
            eq(recurringRules.userId, userId),
            gte(recurringRules.nextRunAt, rule.nextRunAt),
            lte(recurringRules.nextRunAt, new Date(rule.nextRunAt.getTime() + 999)),
          ),
        )
        .returning({ id: recurringRules.id });
      if (advanced.length === 0) {
        throw new Error("The rule changed while saving. Refresh and try again.");
      }

      return created.id;
    });

    revalidateRecurring();
    return { ok: true, data: { id: transactionId } };
  } catch (error) {
    return actionError(error);
  }
}

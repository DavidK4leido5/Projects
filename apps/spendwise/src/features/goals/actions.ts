"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { goalContributionSchema, goalInputSchema } from "@repo/finance";
import { accounts, goalContributions, goals } from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { requireUserId } from "@/lib/auth/session";
import { getDb, getDbPool } from "@/lib/db";
import type { GoalStatus } from "@/features/goals/queries";

const idSchema = z.uuid("Choose a valid goal");
const contributionIdSchema = z.uuid("Choose a valid contribution");

/** goalInputSchema leaves the date loose; the column is a calendar date. */
const goalSchema = goalInputSchema.extend({
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-30")
    .nullish(),
});

function revalidateGoalPaths() {
  revalidatePath("/goals");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

async function assertAccount(userId: string, accountId: string) {
  const [account] = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId), isNull(accounts.deletedAt)))
    .limit(1);
  if (!account) throw new Error("That account is not available.");
}

async function assertGoal(userId: string, goalId: string) {
  const [goal] = await getDb()
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId), isNull(goals.deletedAt)))
    .limit(1);
  if (!goal) throw new Error("That goal is not available.");
  return goal;
}

async function setGoalStatus(id: string, status: GoalStatus): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const goalId = idSchema.parse(id);

    const rows = await getDb()
      .update(goals)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .returning({ id: goals.id });

    if (!rows[0]) throw new Error("That goal is not available.");

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function createGoal(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const values = goalSchema.parse(input);
    if (values.linkedAccountId) await assertAccount(userId, values.linkedAccountId);

    const [row] = await getDb()
      .insert(goals)
      .values({
        userId,
        name: values.name,
        targetAmount: values.targetAmount,
        currency: values.currency,
        targetDate: values.targetDate ?? null,
        linkedAccountId: values.linkedAccountId ?? null,
        note: values.note ?? null,
        color: values.color,
      })
      .returning({ id: goals.id });

    if (!row) throw new Error("The goal could not be created.");

    revalidateGoalPaths();
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateGoal(id: string, input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const goalId = idSchema.parse(id);
    const values = goalSchema.parse(input);
    if (values.linkedAccountId) await assertAccount(userId, values.linkedAccountId);

    const rows = await getDb()
      .update(goals)
      .set({
        name: values.name,
        targetAmount: values.targetAmount,
        currency: values.currency,
        targetDate: values.targetDate ?? null,
        linkedAccountId: values.linkedAccountId ?? null,
        note: values.note ?? null,
        color: values.color,
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .returning({ id: goals.id });

    if (!rows[0]) throw new Error("That goal is not available.");

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function archiveGoal(id: string): Promise<ActionResult> {
  return setGoalStatus(id, "archived");
}

export async function completeGoal(id: string): Promise<ActionResult> {
  return setGoalStatus(id, "completed");
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const goalId = idSchema.parse(id);

    const rows = await getDb()
      .update(goals)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .returning({ id: goals.id });

    if (!rows[0]) throw new Error("That goal is not available.");

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function addContribution(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const values = goalContributionSchema.parse(input);
    await assertGoal(userId, values.goalId);
    if (values.accountId) await assertAccount(userId, values.accountId);

    const id = await getDbPool().transaction(async (tx) => {
      const [row] = await tx
        .insert(goalContributions)
        .values({
          userId,
          goalId: values.goalId,
          accountId: values.accountId ?? null,
          amount: values.amount,
          date: values.date,
          note: values.note ?? null,
        })
        .returning({ id: goalContributions.id });

      if (!row) throw new Error("The contribution could not be saved.");
      return row.id;
    });

    revalidateGoalPaths();
    return { ok: true, data: { id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteContribution(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const contributionId = contributionIdSchema.parse(id);

    const rows = await getDb()
      .delete(goalContributions)
      .where(and(eq(goalContributions.id, contributionId), eq(goalContributions.userId, userId)))
      .returning({ id: goalContributions.id });

    if (!rows[0]) throw new Error("That contribution is not available.");

    revalidateGoalPaths();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

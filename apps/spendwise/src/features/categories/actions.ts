"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { categoryInputSchema } from "@repo/finance";
import { budgets, categories, transactions, type CategoryKind } from "@repo/db/schema";
import { actionError, type ActionResult } from "@/lib/action";
import { requireUserId } from "@/lib/auth/session";
import { getDb, getDbPool } from "@/lib/db";

function revalidateCategories() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

function parentCondition(parentId: string | null) {
  return parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId);
}

type Db = ReturnType<typeof getDb>;

async function assertNameAvailable(
  db: Db,
  userId: string,
  name: string,
  kind: CategoryKind,
  parentId: string | null,
  excludeId?: string,
) {
  const conditions = [
    eq(categories.userId, userId),
    eq(categories.kind, kind),
    isNull(categories.deletedAt),
    parentCondition(parentId),
    sql`lower(${categories.name}) = ${name.toLowerCase()}`,
  ];
  if (excludeId) conditions.push(ne(categories.id, excludeId));

  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(...conditions))
    .limit(1);
  if (existing) throw new Error("A category with that name already exists here.");
}

async function assertParent(
  db: Db,
  userId: string,
  parentId: string,
  kind: CategoryKind,
  selfId?: string,
) {
  if (selfId && parentId === selfId) throw new Error("A category cannot be its own parent.");

  let cursor: string | null = parentId;
  for (let depth = 0; cursor && depth < 50; depth += 1) {
    if (selfId && cursor === selfId) {
      throw new Error("That parent would create a loop.");
    }
    const [row] = await db
      .select({ id: categories.id, parentId: categories.parentId, kind: categories.kind })
      .from(categories)
      .where(
        and(eq(categories.id, cursor), eq(categories.userId, userId), isNull(categories.deletedAt)),
      )
      .limit(1);
    if (!row) throw new Error("That parent category is not available.");
    if (row.kind !== kind) throw new Error("Parent and child categories must be the same type.");
    cursor = row.parentId;
  }
}

export async function createCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const values = categoryInputSchema.parse(input);
    const db = getDb();
    const parentId = values.parentId ?? null;

    if (parentId) await assertParent(db, userId, parentId, values.kind);
    await assertNameAvailable(db, userId, values.name, values.kind, parentId);

    let sortOrder = values.sortOrder;
    if (sortOrder === undefined) {
      const [row] = await db
        .select({ value: max(categories.sortOrder) })
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            eq(categories.kind, values.kind),
            isNull(categories.deletedAt),
            parentCondition(parentId),
          ),
        );
      sortOrder = Number(row?.value ?? -1) + 1;
    }

    const [created] = await db
      .insert(categories)
      .values({
        userId,
        name: values.name,
        kind: values.kind,
        parentId,
        color: values.color || "slate",
        icon: values.icon || "tag",
        sortOrder,
      })
      .returning({ id: categories.id });

    if (!created) throw new Error("The category could not be created.");

    revalidateCategories();
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCategory(input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const values = categoryInputSchema
      .partial()
      .extend({ id: z.uuid("category") })
      .parse(input);
    const db = getDb();

    const [existing] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, values.id),
          eq(categories.userId, userId),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("That category is not available.");

    const kind = values.kind ?? existing.kind;
    const parentId = values.parentId !== undefined ? values.parentId : existing.parentId;

    if (values.kind && values.kind !== existing.kind) {
      const [child] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.parentId, existing.id),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .limit(1);
      if (child) throw new Error("Move its subcategories to another parent first.");

      const [used] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.categoryId, existing.id),
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
          ),
        )
        .limit(1);
      if (used) throw new Error("Categories with transactions keep their type.");
    }

    if (parentId) await assertParent(db, userId, parentId, kind, existing.id);

    const renamed =
      values.name !== undefined && values.name.toLowerCase() !== existing.name.toLowerCase();
    const moved = (parentId ?? null) !== existing.parentId;
    const rekinded = kind !== existing.kind;
    if (renamed || moved || rekinded) {
      await assertNameAvailable(
        db,
        userId,
        values.name ?? existing.name,
        kind,
        parentId ?? null,
        existing.id,
      );
    }

    await db
      .update(categories)
      .set({
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.kind !== undefined ? { kind: values.kind } : {}),
        ...(values.parentId !== undefined ? { parentId } : {}),
        ...(values.color !== undefined ? { color: values.color } : {}),
        ...(values.icon !== undefined ? { icon: values.icon } : {}),
        ...(values.sortOrder !== undefined ? { sortOrder: values.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(categories.id, existing.id), eq(categories.userId, userId)));

    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

const reorderSchema = z.object({
  id: z.uuid("category"),
  direction: z.enum(["up", "down"]),
});

/** Swaps display position with the sibling above or below. */
export async function reorderCategory(input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const { id, direction } = reorderSchema.parse(input);
    const db = getDb();

    const [current] = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)),
      )
      .limit(1);
    if (!current) throw new Error("That category is not available.");

    const siblings = await db
      .select({ id: categories.id, sortOrder: categories.sortOrder })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.kind, current.kind),
          eq(categories.archived, current.archived),
          isNull(categories.deletedAt),
          parentCondition(current.parentId),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    const index = siblings.findIndex((sibling) => sibling.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= siblings.length) return { ok: true };

    const ordered = [...siblings];
    const moving = ordered[index];
    const swapWith = ordered[targetIndex];
    if (!moving || !swapWith) return { ok: true };
    ordered[index] = swapWith;
    ordered[targetIndex] = moving;

    await getDbPool().transaction(async (tx) => {
      for (const [position, sibling] of ordered.entries()) {
        if (sibling.sortOrder === position) continue;
        await tx
          .update(categories)
          .set({ sortOrder: position })
          .where(and(eq(categories.id, sibling.id), eq(categories.userId, userId)));
      }
    });

    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

const archiveSchema = z.object({ id: z.uuid("category"), archived: z.boolean() });

export async function archiveCategory(input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const { id, archived } = archiveSchema.parse(input);
    await getDb()
      .update(categories)
      .set({ archived, updatedAt: new Date() })
      .where(
        and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)),
      );

    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

const deleteSchema = z.object({
  id: z.uuid("category"),
  reassignTo: z.uuid("replacement category").nullable(),
});

/**
 * Reassigns transactions, detaches children, drops the category's budgets
 * (their FK cascade would do this on a hard delete), then soft deletes.
 */
export async function deleteCategory(input: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const { id, reassignTo } = deleteSchema.parse(input);
    if (reassignTo === id) throw new Error("Choose a different replacement category.");
    const db = getDb();

    const [source] = await db
      .select({ id: categories.id, kind: categories.kind, parentId: categories.parentId })
      .from(categories)
      .where(
        and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)),
      )
      .limit(1);
    if (!source) throw new Error("That category is not available.");

    if (reassignTo) {
      const [target] = await db
        .select({ id: categories.id, kind: categories.kind })
        .from(categories)
        .where(
          and(
            eq(categories.id, reassignTo),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        )
        .limit(1);
      if (!target) throw new Error("That replacement category is not available.");
      if (target.kind !== source.kind) {
        throw new Error("Pick a replacement of the same category type.");
      }
    }

    await getDbPool().transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({ categoryId: reassignTo, updatedAt: new Date() })
        .where(
          and(
            eq(transactions.categoryId, id),
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
          ),
        );

      await tx
        .update(categories)
        .set({ parentId: source.parentId, updatedAt: new Date() })
        .where(
          and(
            eq(categories.parentId, id),
            eq(categories.userId, userId),
            isNull(categories.deletedAt),
          ),
        );

      await tx.delete(budgets).where(and(eq(budgets.categoryId, id), eq(budgets.userId, userId)));

      await tx
        .update(categories)
        .set({ deletedAt: new Date(), archived: true })
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    });

    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

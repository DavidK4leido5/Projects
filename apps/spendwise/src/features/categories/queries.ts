import "server-only";

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { categories, transactions, type CategoryKind } from "@repo/db/schema";
import { getDb } from "@/lib/db";

export type CategoryNode = {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  color: string;
  icon: string;
  sortOrder: number;
  archived: boolean;
  transactionCount: number;
  /** Direct plus child counts, for display only. */
  totalCount: number;
  children: CategoryNode[];
};

/**
 * Parents and children in display order, with a direct transaction count per
 * category. Sorting is sortOrder then name, matching the rest of the app.
 */
export async function listCategoryTree(userId: string): Promise<CategoryNode[]> {
  const db = getDb();

  const [rows, counts] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        kind: categories.kind,
        parentId: categories.parentId,
        color: categories.color,
        icon: categories.icon,
        sortOrder: categories.sortOrder,
        archived: categories.archived,
      })
      .from(categories)
      .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({ categoryId: transactions.categoryId, value: count() })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .groupBy(transactions.categoryId),
  ]);

  const countByCategory = new Map(counts.map((row) => [row.categoryId, Number(row.value)]));
  const nodes = new Map<string, CategoryNode>();

  for (const row of rows) {
    nodes.set(row.id, {
      ...row,
      transactionCount: countByCategory.get(row.id) ?? 0,
      totalCount: countByCategory.get(row.id) ?? 0,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  function sumChildren(node: CategoryNode): number {
    node.totalCount =
      node.transactionCount + node.children.reduce((total, child) => total + sumChildren(child), 0);
    return node.totalCount;
  }
  roots.forEach(sumChildren);

  return roots;
}

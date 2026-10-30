import type { CategoryKind } from "@repo/db/schema";
import type { CategoryNode } from "@/features/categories/queries";

/** The tree with its nesting removed, so an optimistic reducer can work on one list. */
export type FlatCategory = Omit<CategoryNode, "children" | "totalCount">;

export function flattenCategoryTree(nodes: CategoryNode[]): FlatCategory[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      name: node.name,
      kind: node.kind,
      parentId: node.parentId,
      color: node.color,
      icon: node.icon,
      sortOrder: node.sortOrder,
      archived: node.archived,
      transactionCount: node.transactionCount,
    },
    ...flattenCategoryTree(node.children),
  ]);
}

export function compareCategories(a: FlatCategory, b: FlatCategory): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

export function nextCategorySortOrder(
  nodes: FlatCategory[],
  kind: CategoryKind,
  parentId: string | null,
  archived: boolean,
  excludeId?: string,
): number {
  let max = -1;
  for (const node of nodes) {
    if (node.id === excludeId) continue;
    if (node.kind === kind && node.parentId === parentId && node.archived === archived) {
      max = Math.max(max, node.sortOrder);
    }
  }
  return max + 1;
}

export function descendantCategoryIds(nodes: FlatCategory[], id: string): Set<string> {
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Direct transaction count plus every descendant's count. */
export function categoryTotalCounts(nodes: FlatCategory[]): Map<string, number> {
  const children = new Map<string, FlatCategory[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = children.get(node.parentId);
    if (siblings) siblings.push(node);
    else children.set(node.parentId, [node]);
  }

  const totals = new Map<string, number>();
  const visiting = new Set<string>();

  function sum(node: FlatCategory): number {
    const known = totals.get(node.id);
    if (known !== undefined) return known;
    if (visiting.has(node.id)) return 0;
    visiting.add(node.id);
    let total = node.transactionCount;
    for (const child of children.get(node.id) ?? []) total += sum(child);
    visiting.delete(node.id);
    totals.set(node.id, total);
    return total;
  }

  for (const node of nodes) sum(node);
  return totals;
}

"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@repo/ui";
import {
  archiveCategory,
  createCategory,
  deleteCategory,
  reorderCategory,
  updateCategory,
} from "@/features/categories/actions";
import { CategoryDialog, type CategoryFormValues } from "@/features/categories/category-dialog";
import { CategoryList } from "@/features/categories/category-list";
import type { CategoryNode } from "@/features/categories/queries";
import {
  compareCategories,
  descendantCategoryIds,
  flattenCategoryTree,
  nextCategorySortOrder,
  type FlatCategory,
} from "@/features/categories/category-tree";

type OptimisticAction =
  | { type: "create"; node: Omit<FlatCategory, "sortOrder"> }
  | { type: "update"; id: string; values: CategoryFormValues }
  | { type: "archive"; id: string; archived: boolean }
  | { type: "reorder"; id: string; direction: "up" | "down" }
  | { type: "delete"; id: string };

function reduceCategories(nodes: FlatCategory[], action: OptimisticAction): FlatCategory[] {
  switch (action.type) {
    case "create":
      return [
        ...nodes,
        {
          ...action.node,
          sortOrder: nextCategorySortOrder(nodes, action.node.kind, action.node.parentId, false),
        },
      ];
    case "update": {
      const current = nodes.find((node) => node.id === action.id);
      if (!current) return nodes;
      const values = action.values;
      const moved = current.kind !== values.kind || current.parentId !== values.parentId;
      return nodes.map((node) => {
        if (node.id !== action.id) return node;
        return {
          ...node,
          name: values.name,
          kind: values.kind,
          parentId: values.parentId,
          color: values.color,
          icon: values.icon,
          ...(moved
            ? {
                sortOrder: nextCategorySortOrder(
                  nodes,
                  values.kind,
                  values.parentId,
                  node.archived,
                  node.id,
                ),
              }
            : {}),
        };
      });
    }
    case "archive":
      return nodes.map((node) =>
        node.id === action.id ? { ...node, archived: action.archived } : node,
      );
    case "reorder": {
      const current = nodes.find((node) => node.id === action.id);
      if (!current) return nodes;
      const group = nodes
        .filter(
          (node) =>
            node.kind === current.kind &&
            node.archived === current.archived &&
            node.parentId === current.parentId,
        )
        .sort(compareCategories);
      const index = group.findIndex((node) => node.id === current.id);
      const targetIndex = action.direction === "up" ? index - 1 : index + 1;
      const moving = group[index];
      const target = group[targetIndex];
      if (!moving || !target) return nodes;
      const ordered = [...group];
      ordered[index] = target;
      ordered[targetIndex] = moving;
      const positions = new Map(ordered.map((node, position) => [node.id, position]));
      return nodes.map((node) => {
        const position = positions.get(node.id);
        return position === undefined ? node : { ...node, sortOrder: position };
      });
    }
    case "delete": {
      const removed = descendantCategoryIds(nodes, action.id);
      return nodes.filter((node) => !removed.has(node.id));
    }
  }
}

export function CategoriesView({ categories }: { categories: CategoryNode[] }) {
  const router = useRouter();
  const initialNodes = useMemo(() => flattenCategoryTree(categories), [categories]);
  const [nodes, apply] = useOptimistic(initialNodes, reduceCategories);
  const [, startTransition] = useTransition();

  function handleCreate(values: CategoryFormValues) {
    const node: Omit<FlatCategory, "sortOrder"> = {
      id: "optimistic-" + crypto.randomUUID(),
      name: values.name,
      kind: values.kind,
      parentId: values.parentId,
      color: values.color,
      icon: values.icon,
      archived: false,
      transactionCount: 0,
    };

    startTransition(async () => {
      apply({ type: "create", node });
      const result = await createCategory(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Category added");
      router.refresh();
    });
  }

  function handleUpdate(node: FlatCategory, values: CategoryFormValues) {
    startTransition(async () => {
      apply({ type: "update", id: node.id, values });
      const result = await updateCategory({ id: node.id, ...values });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Category updated");
      router.refresh();
    });
  }

  function handleArchive(node: FlatCategory) {
    const archived = !node.archived;
    startTransition(async () => {
      apply({ type: "archive", id: node.id, archived });
      const result = await archiveCategory({ id: node.id, archived });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success((archived ? "Archived " : "Restored ") + node.name);
      router.refresh();
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      apply({ type: "reorder", id, direction });
      const result = await reorderCategory({ id, direction });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(node: FlatCategory, reassignTo: string | null) {
    startTransition(async () => {
      apply({ type: "delete", id: node.id });
      const result = await deleteCategory({ id: node.id, reassignTo });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted " + node.name);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        description="Group spending and income so budgets and reports line up."
        actions={
          <CategoryDialog
            categories={nodes}
            onSubmit={handleCreate}
            trigger={
              <Button>
                <Plus className="size-4" aria-hidden />
                Add category
              </Button>
            }
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense</CardTitle>
            <CardDescription>Everyday spending, bills, and sinking funds.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryList
              nodes={nodes}
              kind="expense"
              onReorder={handleReorder}
              onArchive={handleArchive}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income</CardTitle>
            <CardDescription>Salary, side work, and anything else coming in.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryList
              nodes={nodes}
              kind="income"
              onReorder={handleReorder}
              onArchive={handleArchive}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

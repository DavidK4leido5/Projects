"use client";

import {
  Archive,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  CategoryBadge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import type { CategoryKind } from "@repo/db/schema";
import { CategoryDialog, type CategoryFormValues } from "@/features/categories/category-dialog";
import {
  categoryTotalCounts,
  compareCategories,
  descendantCategoryIds,
  type FlatCategory,
} from "@/features/categories/category-tree";

export function CategoryList({
  nodes,
  kind,
  onReorder,
  onArchive,
  onUpdate,
  onDelete,
}: {
  nodes: FlatCategory[];
  kind: CategoryKind;
  onReorder: (id: string, direction: "up" | "down") => void;
  onArchive: (node: FlatCategory) => void;
  onUpdate: (node: FlatCategory, values: CategoryFormValues) => void;
  onDelete: (node: FlatCategory, reassignTo: string | null) => void;
}) {
  const kindNodes = nodes.filter((node) => node.kind === kind);
  const active = kindNodes.filter((node) => !node.archived).sort(compareCategories);
  const activeIds = new Set(active.map((node) => node.id));
  const roots = active.filter((node) => node.parentId === null || !activeIds.has(node.parentId));
  const archived = kindNodes.filter((node) => node.archived).sort(compareCategories);
  const totals = categoryTotalCounts(nodes);

  return (
    <div className="flex flex-col gap-4">
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {kind} categories yet. Add one to start grouping transactions.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {roots.map((node, index) => {
            const children = active.filter((child) => child.parentId === node.id);
            return (
              <li key={node.id} className="py-1 first:pt-0 last:pb-0">
                <CategoryRow
                  node={node}
                  nodes={nodes}
                  total={totals.get(node.id) ?? node.transactionCount}
                  canUp={index > 0}
                  canDown={index < roots.length - 1}
                  onReorder={onReorder}
                  onArchive={onArchive}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
                {children.length > 0 ? (
                  <ul className="ml-5 flex flex-col divide-y divide-border border-l border-border pl-2">
                    {children.map((child, childIndex) => (
                      <li key={child.id} className="py-1 first:pt-0 last:pb-0">
                        <CategoryRow
                          node={child}
                          nodes={nodes}
                          total={totals.get(child.id) ?? child.transactionCount}
                          canUp={childIndex > 0}
                          canDown={childIndex < children.length - 1}
                          onReorder={onReorder}
                          onArchive={onArchive}
                          onUpdate={onUpdate}
                          onDelete={onDelete}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Archived
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {archived.map((node) => (
              <li key={node.id} className="py-1 first:pt-0 last:pb-0">
                <CategoryRow
                  node={node}
                  nodes={nodes}
                  total={totals.get(node.id) ?? node.transactionCount}
                  reorderable={false}
                  onReorder={onReorder}
                  onArchive={onArchive}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CategoryRow({
  node,
  nodes,
  total,
  canUp = false,
  canDown = false,
  reorderable = true,
  onReorder,
  onArchive,
  onUpdate,
  onDelete,
}: {
  node: FlatCategory;
  nodes: FlatCategory[];
  total: number;
  canUp?: boolean;
  canDown?: boolean;
  reorderable?: boolean;
  onReorder: (id: string, direction: "up" | "down") => void;
  onArchive: (node: FlatCategory) => void;
  onUpdate: (node: FlatCategory, values: CategoryFormValues) => void;
  onDelete: (node: FlatCategory, reassignTo: string | null) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-2 py-1.5">
      <CategoryBadge
        name={node.name}
        color={node.color}
        className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 font-medium"
      />
      {node.archived ? <Badge variant="secondary">Archived</Badge> : null}
      <span
        className="shrink-0 text-xs tabular-nums text-muted-foreground"
        title={total + " transactions"}
      >
        {total}
      </span>

      <div className="flex shrink-0 items-center gap-0.5">
        {reorderable ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={"Move " + node.name + " up"}
              disabled={!canUp}
              onClick={() => onReorder(node.id, "up")}
            >
              <ChevronUp className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={"Move " + node.name + " down"}
              disabled={!canDown}
              onClick={() => onReorder(node.id, "down")}
            >
              <ChevronDown className="size-4" aria-hidden />
            </Button>
          </>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={"Actions for " + node.name}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={<Pencil />} onSelect={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={node.archived ? <RotateCcw /> : <Archive />}
              onSelect={() => onArchive(node)}
            >
              {node.archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive icon={<Trash2 />} onSelect={() => setDeleteOpen(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editOpen ? (
        <CategoryDialog
          categories={nodes}
          category={node}
          open
          onOpenChange={setEditOpen}
          onSubmit={(values) => onUpdate(node, values)}
        />
      ) : null}
      <DeleteCategoryDialog
        node={node}
        categories={nodes}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={(reassignTo) => onDelete(node, reassignTo)}
      />
    </div>
  );
}

function DeleteCategoryDialog({
  node,
  categories,
  open,
  onOpenChange,
  onDelete,
}: {
  node: FlatCategory;
  categories: FlatCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (reassignTo: string | null) => void;
}) {
  const [reassignTo, setReassignTo] = useState("");

  const excluded = descendantCategoryIds(categories, node.id);
  const options = categories
    .filter((option) => option.kind === node.kind && !option.archived && !excluded.has(option.id))
    .sort(compareCategories);
  const hasChildren = categories.some((category) => category.parentId === node.id);

  function remove() {
    const target = reassignTo === "none" ? null : reassignTo;
    setReassignTo("");
    onOpenChange(false);
    onDelete(target);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReassignTo("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {node.name}?</DialogTitle>
          <DialogDescription>
            {node.transactionCount === 0
              ? "No transactions use this category."
              : node.transactionCount +
                (node.transactionCount === 1 ? " transaction uses" : " transactions use") +
                " this category. Choose where they should go."}{" "}
            {hasChildren ? "Its subcategories move up to this category's parent." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor="reassign-category" className="text-sm font-medium">
            Move transactions to
          </label>
          <Select value={reassignTo} onValueChange={setReassignTo}>
            <SelectTrigger id="reassign-category">
              <SelectValue placeholder="Choose a replacement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!reassignTo} onClick={remove}>
            Delete category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

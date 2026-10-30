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
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { archiveCategory, deleteCategory, reorderCategory } from "@/features/categories/actions";
import { CategoryDialog } from "@/features/categories/category-dialog";
import type { CategoryNode } from "@/features/categories/queries";

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

export function CategoryList({
  categories,
  kind,
}: {
  categories: CategoryNode[];
  kind: CategoryKind;
}) {
  const active = flatten(categories).filter((node) => node.kind === kind && !node.archived);
  const activeIds = new Set(active.map((node) => node.id));
  const roots = active.filter((node) => node.parentId === null || !activeIds.has(node.parentId));
  const archived = flatten(categories).filter((node) => node.kind === kind && node.archived);

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
                  categories={categories}
                  canUp={index > 0}
                  canDown={index < roots.length - 1}
                />
                {children.length > 0 ? (
                  <ul className="ml-5 flex flex-col divide-y divide-border border-l border-border pl-2">
                    {children.map((child, childIndex) => (
                      <li key={child.id} className="py-1 first:pt-0 last:pb-0">
                        <CategoryRow
                          node={child}
                          categories={categories}
                          canUp={childIndex > 0}
                          canDown={childIndex < children.length - 1}
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
                <CategoryRow node={node} categories={categories} reorderable={false} />
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
  categories,
  canUp = false,
  canDown = false,
  reorderable = true,
}: {
  node: CategoryNode;
  categories: CategoryNode[];
  canUp?: boolean;
  canDown?: boolean;
  reorderable?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderCategory({ id: node.id, direction });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleArchived() {
    startTransition(async () => {
      const result = await archiveCategory({ id: node.id, archived: !node.archived });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success((node.archived ? "Restored " : "Archived ") + node.name);
      router.refresh();
    });
  }

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
        title={node.totalCount + " transactions"}
      >
        {node.totalCount}
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
              disabled={!canUp || pending}
              onClick={() => move("up")}
            >
              <ChevronUp className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={"Move " + node.name + " down"}
              disabled={!canDown || pending}
              onClick={() => move("down")}
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
              disabled={pending}
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
              onSelect={toggleArchived}
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

      <CategoryDialog
        categories={categories}
        category={node}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCategoryDialog
        node={node}
        categories={categories}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

function DeleteCategoryDialog({
  node,
  categories,
  open,
  onOpenChange,
}: {
  node: CategoryNode;
  categories: CategoryNode[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reassignTo, setReassignTo] = useState("");

  const excluded = new Set([node.id, ...flatten(node.children).map((child) => child.id)]);
  const options = flatten(categories).filter(
    (option) => option.kind === node.kind && !option.archived && !excluded.has(option.id),
  );

  function remove() {
    startTransition(async () => {
      const result = await deleteCategory({
        id: node.id,
        reassignTo: reassignTo === "none" ? null : reassignTo,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted " + node.name);
      setReassignTo("");
      onOpenChange(false);
      router.refresh();
    });
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
            {node.children.length > 0 ? "Its subcategories move up to this category's parent." : ""}
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
          <Button
            type="button"
            variant="destructive"
            disabled={!reassignTo || pending}
            onClick={remove}
          >
            {pending ? "Deleting" : "Delete category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

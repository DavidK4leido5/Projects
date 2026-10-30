"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, Receipt, Tag, Tags, Trash2, X } from "lucide-react";
import {
  AmountText,
  Button,
  CategoryBadge,
  Checkbox,
  DataTable,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@repo/finance";
import {
  bulkAddTag,
  bulkDeleteTransactions,
  bulkSetCategory,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
} from "@/features/transactions/actions";
import { TransactionRowActions } from "@/features/transactions/transaction-row-actions";
import { usePendingTransactions } from "@/features/transactions/transaction-create-store";
import type { TransactionRow } from "@/features/transactions/queries";
import type {
  TransactionAccountOption,
  TransactionCategoryOption,
  TransactionFormValues,
  TransactionTagOption,
} from "@/features/transactions/transaction-form";

type RowMutation =
  | { type: "delete"; ids: readonly string[] }
  | { type: "update"; ids: readonly string[]; patch: Partial<TransactionRow> }
  | { type: "tag"; ids: readonly string[]; tag: { id: string; name: string } };

function applyMutation(rows: TransactionRow[], mutation: RowMutation): TransactionRow[] {
  const ids = new Set(mutation.ids);

  if (mutation.type === "delete") return rows.filter((row) => !ids.has(row.id));

  if (mutation.type === "update") {
    return rows.map((row) => (ids.has(row.id) ? { ...row, ...mutation.patch } : row));
  }

  return rows.map((row) =>
    ids.has(row.id) &&
    !row.tags.some((tag) => tag.name.toLowerCase() === mutation.tag.name.toLowerCase())
      ? { ...row, tags: [...row.tags, mutation.tag] }
      : row,
  );
}

export function TransactionsTable({
  rows,
  locale,
  currency,
  accounts,
  categories,
  tags,
  emptyAction,
}: {
  rows: TransactionRow[];
  locale: string;
  currency: string;
  accounts: TransactionAccountOption[];
  categories: TransactionCategoryOption[];
  tags: TransactionTagOption[];
  emptyAction?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [optimisticRows, apply] = useOptimistic(rows, applyMutation);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("none");
  const [tagName, setTagName] = useState("");
  // Snapshot for the dialog copy: an optimistic delete empties selectedIds
  // while the confirm dialog is still on screen.
  const [bulkCount, setBulkCount] = useState(0);

  // Quick-add publishes a row before the server answers. Once the server row
  // with the same id arrives it wins, and the pending copy disappears.
  const pendingCreated = usePendingTransactions().filter(
    (row) => !optimisticRows.some((serverRow) => serverRow.id === row.id),
  );
  const visibleRows = [...pendingCreated, ...optimisticRows];
  const pendingIds = new Set(pendingCreated.map((row) => row.id));

  const selectedIds = visibleRows.filter((row) => selected.has(row.id)).map((row) => row.id);

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setSelected(new Set<string>());
  }

  function openBulk(open: (value: boolean) => void) {
    setBulkCount(selectedIds.length);
    open(true);
  }

  function remove(row: TransactionRow) {
    startTransition(async () => {
      apply({ type: "delete", ids: [row.id] });
      const result = await deleteTransaction(row.id);
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }

      toast.success("Deleted " + row.payee, {
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              const restored = await restoreTransaction(row.id);
              if (!restored.ok) {
                toast.error(restored.error);
                return;
              }
              router.refresh();
            })();
          },
        },
      });
      router.refresh();
    });
  }

  function update(row: TransactionRow, values: TransactionFormValues) {
    const account = accounts.find((item) => item.id === values.accountId);
    const category = categories.find((item) => item.id === values.categoryId);
    const transfer = accounts.find((item) => item.id === values.transferAccountId);
    const isTransfer = values.type === "transfer";

    startTransition(async () => {
      apply({
        type: "update",
        ids: [row.id],
        patch: {
          type: values.type,
          amount: values.amount,
          date: new Date(values.date),
          payee: values.payee.trim(),
          notes: values.notes?.trim() || null,
          accountId: values.accountId,
          accountName: account?.name ?? row.accountName,
          categoryId: isTransfer ? null : values.categoryId || null,
          categoryName: isTransfer ? null : (category?.name ?? null),
          categoryColor: isTransfer ? null : (category?.color ?? null),
          transferAccountId: isTransfer ? values.transferAccountId || null : null,
          transferAccountName: isTransfer ? (transfer?.name ?? null) : null,
          paymentMethod: values.paymentMethod,
        },
      });

      const result = await updateTransaction({
        id: row.id,
        type: values.type,
        amount: values.amount,
        currency: account?.currency ?? row.currency,
        accountId: values.accountId,
        categoryId: isTransfer ? null : values.categoryId || null,
        transferAccountId: isTransfer ? values.transferAccountId || null : null,
        date: new Date(values.date),
        payee: values.payee.trim(),
        notes: values.notes?.trim() || null,
        paymentMethod: values.paymentMethod,
        tagIds: values.tagIds ?? [],
      });

      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }

      toast.success("Transaction updated");
      router.refresh();
    });
  }

  function setCategory() {
    const ids = selectedIds;
    const category = categories.find((item) => item.id === categoryId) ?? null;
    const editable = visibleRows
      .filter((row) => ids.includes(row.id) && row.type !== "transfer")
      .map((row) => row.id);

    startTransition(async () => {
      apply({
        type: "update",
        ids: editable,
        patch: {
          categoryId: category?.id ?? null,
          categoryName: category?.name ?? null,
          categoryColor: category?.color ?? null,
        },
      });

      const result = await bulkSetCategory({
        ids,
        categoryId: categoryId === "none" ? null : categoryId,
      });
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }

      toast.success(
        "Updated " +
          result.data.count +
          (result.data.count === 1 ? " transaction" : " transactions"),
      );
      clear();
      setCategoryOpen(false);
      router.refresh();
    });
  }

  function addTag() {
    const ids = selectedIds;
    const name = tagName.trim();

    startTransition(async () => {
      apply({ type: "tag", ids, tag: { id: "pending-" + name.toLowerCase(), name } });

      const result = await bulkAddTag({ ids, name });
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }

      toast.success(
        "Tagged " +
          result.data.count +
          (result.data.count === 1 ? " transaction" : " transactions"),
      );
      setTagName("");
      clear();
      setTagOpen(false);
      router.refresh();
    });
  }

  function deleteSelected() {
    const ids = selectedIds;

    startTransition(async () => {
      apply({ type: "delete", ids });

      const result = await bulkDeleteTransactions({ ids });
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }

      toast.success(
        "Deleted " +
          result.data.count +
          (result.data.count === 1 ? " transaction" : " transactions"),
      );
      clear();
      setDeleteOpen(false);
      router.refresh();
    });
  }

  const columns: ColumnDef<TransactionRow>[] = [
    {
      id: "date",
      header: "Date",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDate(row.original.date, locale, "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "payee",
      header: "Payee",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex max-w-[260px] items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            {row.original.type === "transfer" ? (
              <ArrowLeftRight className="size-3.5" aria-hidden />
            ) : (
              <Receipt className="size-3.5" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.payee}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.type === "transfer" && row.original.transferAccountName
                ? row.original.accountName + " to " + row.original.transferAccountName
                : row.original.notes || row.original.accountName}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.categoryName ? (
          <CategoryBadge
            name={row.original.categoryName}
            color={row.original.categoryColor ?? "slate"}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Transfer</span>
        ),
    },
    {
      id: "account",
      header: "Account",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.accountName}</span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <AmountText
            amount={row.original.amount}
            currency={row.original.currency}
            locale={locale}
            type={row.original.type}
            signed={row.original.type !== "transfer"}
            className="whitespace-nowrap text-sm font-medium"
          />
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          {pendingIds.has(row.original.id) ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Saving
            </span>
          ) : (
            <TransactionRowActions
              transaction={row.original}
              accounts={accounts}
              categories={categories}
              tags={tags}
              currency={currency}
              disabled={pending}
              onDelete={remove}
              onUpdate={update}
            />
          )}
        </div>
      ),
    },
  ];

  if (visibleRows.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="No transactions match"
        description="Try a different search or clear the filters, then add a transaction."
        action={
          emptyAction ? (
            <Button asChild size="sm">
              <Link href="/transactions?new=1">Add a transaction</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
          <p className="mr-auto text-sm font-medium">{selectedIds.length} selected</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => openBulk(setCategoryOpen)}
          >
            <Tags className="size-4" aria-hidden />
            Category
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => openBulk(setTagOpen)}
          >
            <Tag className="size-4" aria-hidden />
            Add tag
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => openBulk(setDeleteOpen)}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            Delete
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear selection"
            onClick={clear}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card md:hidden">
        {visibleRows.map((row) => (
          <li key={row.id} className="flex items-start gap-3 p-4">
            <Checkbox
              className="mt-1"
              checked={selected.has(row.id)}
              onCheckedChange={() => toggle(row.id)}
              aria-label={"Select " + row.payee}
            />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.payee}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(row.date, locale, "MMM d")} · {row.categoryName ?? "Transfer"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <AmountText
                  amount={row.amount}
                  currency={row.currency}
                  locale={locale}
                  type={row.type}
                  signed={row.type !== "transfer"}
                  className="whitespace-nowrap text-sm font-medium"
                />
                {pendingIds.has(row.id) ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Saving
                  </span>
                ) : (
                  <TransactionRowActions
                    transaction={row}
                    accounts={accounts}
                    categories={categories}
                    tags={tags}
                    currency={currency}
                    disabled={pending}
                    onDelete={remove}
                    onUpdate={update}
                  />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={visibleRows}
          getRowId={(row) => row.id}
          selection={{
            selected: selectedIds,
            onChange: (ids) => setSelected(new Set(ids)),
          }}
        />
      </div>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change category</DialogTitle>
            <DialogDescription>
              Applies to {bulkCount} selected transaction
              {bulkCount === 1 ? "" : "s"}. Transfers are left alone.
            </DialogDescription>
          </DialogHeader>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCategoryOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={setCategory} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a tag</DialogTitle>
            <DialogDescription>
              Reuses an existing tag by name, or creates it. Applies to {bulkCount} transaction
              {bulkCount === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Input
              id="bulk-tag-name"
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              list="bulk-tag-options"
              placeholder="reimbursable"
              autoComplete="off"
              maxLength={40}
            />
            <datalist id="bulk-tag-options">
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
            </datalist>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTagOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addTag}
              disabled={pending || tagName.trim().length === 0}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Add tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={"Delete " + bulkCount + " transaction" + (bulkCount === 1 ? "" : "s") + "?"}
        description="They are soft deleted, so the data stays recoverable in the database."
        confirmLabel="Delete"
        onConfirm={deleteSelected}
        pending={pending}
      />
    </>
  );
}

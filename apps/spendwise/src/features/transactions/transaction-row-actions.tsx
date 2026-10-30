"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { TransactionEditDialog } from "@/features/transactions/transaction-edit-dialog";
import type { TransactionRow } from "@/features/transactions/queries";
import type {
  TransactionAccountOption,
  TransactionCategoryOption,
  TransactionFormValues,
  TransactionTagOption,
} from "@/features/transactions/transaction-form";

/**
 * Menu only. The table owns the mutation so it can apply the optimistic row
 * before the action answers; this component just reports the intent.
 */
export function TransactionRowActions({
  transaction,
  accounts,
  categories,
  tags,
  currency,
  disabled,
  onDelete,
  onUpdate,
}: {
  transaction: TransactionRow;
  accounts: TransactionAccountOption[];
  categories: TransactionCategoryOption[];
  tags: TransactionTagOption[];
  currency: string;
  disabled: boolean;
  onDelete: (transaction: TransactionRow) => void;
  onUpdate: (transaction: TransactionRow, values: TransactionFormValues) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { payee } = transaction;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={"Actions for " + payee}
            disabled={disabled}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem icon={<Pencil />} onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem destructive icon={<Trash2 />} onSelect={() => onDelete(transaction)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TransactionEditDialog
        transaction={transaction}
        accounts={accounts}
        categories={categories}
        tags={tags}
        currency={currency}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={(values) => {
          setEditOpen(false);
          onUpdate(transaction, values);
        }}
      />
    </>
  );
}

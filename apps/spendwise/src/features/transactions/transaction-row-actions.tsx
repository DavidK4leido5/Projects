"use client";

import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { deleteTransaction, restoreTransaction } from "@/features/transactions/actions";
import { TransactionEditDialog } from "@/features/transactions/transaction-edit-dialog";
import type { TransactionRow } from "@/features/transactions/queries";
import type {
  TransactionAccountOption,
  TransactionCategoryOption,
  TransactionTagOption,
} from "@/features/transactions/transaction-form";

export function TransactionRowActions({
  transaction,
  accounts,
  categories,
  tags,
  currency,
}: {
  transaction: TransactionRow;
  accounts: TransactionAccountOption[];
  categories: TransactionCategoryOption[];
  tags: TransactionTagOption[];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const { id, payee } = transaction;

  function remove() {
    startTransition(async () => {
      const result = await deleteTransaction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Deleted " + payee, {
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              const restored = await restoreTransaction(id);
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={"Actions for " + payee}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MoreHorizontal className="size-4" aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem icon={<Pencil />} onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem destructive icon={<Trash2 />} onSelect={remove}>
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
      />
    </>
  );
}

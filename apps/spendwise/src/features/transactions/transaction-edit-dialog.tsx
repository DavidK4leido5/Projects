"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  FormItem,
  FormLabel,
} from "@repo/ui";
import { updateTransaction } from "@/features/transactions/actions";
import type { TransactionRow } from "@/features/transactions/queries";
import {
  toDateTimeLocal,
  TransactionFormFields,
  transactionEditFormSchema,
  type TransactionAccountOption,
  type TransactionCategoryOption,
  type TransactionFormValues,
  type TransactionTagOption,
} from "@/features/transactions/transaction-form";
import { PAYMENT_METHODS } from "@/lib/defaults";

function paymentMethodValue(value: string): TransactionFormValues["paymentMethod"] {
  const match = PAYMENT_METHODS.find((method) => method.value === value);
  return match ? match.value : "other";
}

export function TransactionEditDialog({
  transaction,
  accounts,
  categories,
  tags,
  currency,
  open,
  onOpenChange,
}: {
  transaction: TransactionRow;
  accounts: TransactionAccountOption[];
  categories: TransactionCategoryOption[];
  tags: TransactionTagOption[];
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionEditFormSchema),
    defaultValues: {
      type: transaction.type,
      amount: transaction.amount,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId ?? "",
      transferAccountId: transaction.transferAccountId ?? "",
      date: toDateTimeLocal(transaction.date),
      payee: transaction.payee,
      notes: transaction.notes ?? "",
      paymentMethod: paymentMethodValue(transaction.paymentMethod),
      tagIds: transaction.tags.map((tag) => tag.id),
    },
  });

  function onSubmit(values: TransactionFormValues) {
    startTransition(async () => {
      const account = accounts.find((item) => item.id === values.accountId);
      const result = await updateTransaction({
        id: transaction.id,
        type: values.type,
        amount: values.amount,
        currency: account?.currency ?? currency,
        accountId: values.accountId,
        categoryId: values.type === "transfer" ? null : values.categoryId || null,
        transferAccountId: values.type === "transfer" ? values.transferAccountId || null : null,
        date: new Date(values.date),
        payee: values.payee.trim(),
        notes: values.notes?.trim() || null,
        paymentMethod: values.paymentMethod,
        tagIds: values.tagIds ?? [],
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Transaction updated");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            Change any detail. The account and category stay tied to you.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="edit-transaction-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <TransactionFormFields
              form={form}
              accounts={accounts}
              categories={categories}
              currency={currency}
            >
              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => {
                  const selected = field.value ?? [];
                  return (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      {tags.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No tags yet. Add one from the transactions toolbar.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {tags.map((tag) => {
                            const checked = selected.includes(tag.id);
                            return (
                              <label
                                key={tag.id}
                                className="flex items-center gap-2 text-sm text-foreground"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    field.onChange(
                                      value === true
                                        ? [...selected, tag.id]
                                        : selected.filter((id) => id !== tag.id),
                                    )
                                  }
                                />
                                {tag.name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </FormItem>
                  );
                }}
              />
            </TransactionFormFields>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-transaction-form" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Saving" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

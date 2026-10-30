"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Form,
  FormItem,
  FormLabel,
} from "@repo/ui";
import { createTransaction, uploadReceipt } from "@/features/transactions/actions";
import {
  publishPendingTransaction,
  rekeyPendingTransaction,
  removePendingTransaction,
} from "@/features/transactions/transaction-create-store";
import type { TransactionRow } from "@/features/transactions/queries";
import {
  toDateTimeLocal,
  TransactionFormFields,
  transactionFormSchema,
  type TransactionAccountOption,
  type TransactionCategoryOption,
  type TransactionFormValues,
} from "@/features/transactions/transaction-form";
import { useKeyboardShortcut, useMediaQuery, useOpenFromParam } from "@/lib/hooks";

export function QuickAddTransaction({
  accounts,
  categories,
  currency,
}: {
  accounts: TransactionAccountOption[];
  categories: TransactionCategoryOption[];
  currency: string;
}) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useOpenFromParam("new");
  const [receipt, setReceipt] = useState<File | null>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      accountId: accounts[0]?.id ?? "",
      categoryId: "",
      transferAccountId: "",
      date: toDateTimeLocal(new Date()),
      payee: "",
      notes: "",
      paymentMethod: "cash",
      tagIds: [],
    },
  });

  useKeyboardShortcut("n", () => setOpen(true));

  function onSubmit(values: TransactionFormValues) {
    const account = accounts.find((item) => item.id === values.accountId);
    const category =
      values.type === "transfer"
        ? undefined
        : categories.find((item) => item.id === values.categoryId);
    const transfer =
      values.type === "transfer"
        ? accounts.find((item) => item.id === values.transferAccountId)
        : undefined;

    const payee = values.payee.trim();
    const notes = values.notes?.trim() || null;
    const date = new Date(values.date);
    const file = receipt;
    // Temporary id: the row shows before the server answers, then the real id
    // takes over so the refreshed server row replaces it instead of duplicating.
    const tempId = "pending-" + crypto.randomUUID();
    const optimistic: TransactionRow = {
      id: tempId,
      date,
      type: values.type,
      amount: values.amount,
      currency: account?.currency ?? currency,
      payee,
      notes,
      accountId: values.accountId,
      accountName: account?.name ?? "",
      categoryId: values.type === "transfer" ? null : values.categoryId || null,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      transferAccountId: values.type === "transfer" ? values.transferAccountId || null : null,
      transferAccountName: transfer?.name ?? null,
      paymentMethod: values.paymentMethod,
      isRecurring: false,
      tags: [],
    };

    // Close first: the row is already on its way to the table.
    setOpen(false);
    setReceipt(null);
    form.reset({
      type: values.type,
      amount: 0,
      accountId: values.accountId,
      categoryId: "",
      transferAccountId: "",
      date: toDateTimeLocal(new Date()),
      payee: "",
      notes: "",
      paymentMethod: values.paymentMethod,
      tagIds: [],
    });
    publishPendingTransaction(optimistic);

    void (async () => {
      const result = await createTransaction({
        type: values.type,
        amount: values.amount,
        currency: account?.currency ?? currency,
        accountId: values.accountId,
        categoryId: values.type === "transfer" ? null : values.categoryId,
        transferAccountId: values.type === "transfer" ? values.transferAccountId : null,
        date,
        payee,
        notes,
        paymentMethod: values.paymentMethod,
        isRecurring: false,
        tagIds: values.tagIds ?? [],
      });

      if (!result.ok) {
        removePendingTransaction(tempId);
        toast.error(result.error);
        return;
      }

      rekeyPendingTransaction(tempId, result.data.id);

      if (file) {
        const data = new FormData();
        data.set("file", file);
        const uploaded = await uploadReceipt(result.data.id, data);
        if (!uploaded.ok)
          toast.error("Transaction saved, but the receipt failed: " + uploaded.error);
      }

      toast.success("Transaction added");
      router.refresh();
    })();
  }

  const body = (
    <Form {...form}>
      <form
        id="quick-add-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <TransactionFormFields
          form={form}
          accounts={accounts}
          categories={categories}
          currency={currency}
          extra={
            <FormItem>
              <FormLabel>Receipt (optional)</FormLabel>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
                <Paperclip className="size-4" aria-hidden />
                <span className="truncate">{receipt ? receipt.name : "Attach a file"}</span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-xs text-muted-foreground">PNG, JPEG, WebP, or PDF up to 5 MB.</p>
            </FormItem>
          }
        />
      </form>
    </Form>
  );

  const submit = (
    <Button type="submit" form="quick-add-form" disabled={accounts.length === 0}>
      <Plus className="size-4" aria-hidden />
      Add transaction
    </Button>
  );

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New transaction</DialogTitle>
              <DialogDescription>
                Record money in, money out, or a move between accounts.
              </DialogDescription>
            </DialogHeader>
            {body}
            <DialogFooter>{submit}</DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[92dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>New transaction</DrawerTitle>
              <DrawerDescription>
                Record money in, money out, or a move between accounts.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-2">{body}</div>
            <DrawerFooter>{submit}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      <Button
        type="button"
        size="icon"
        aria-label="Add transaction"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 size-12 rounded-full shadow-lg md:hidden"
      >
        <Plus className="size-5" aria-hidden />
      </Button>
    </>
  );
}

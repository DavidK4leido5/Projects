"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
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
    startTransition(async () => {
      const account = accounts.find((item) => item.id === values.accountId);
      const result = await createTransaction({
        type: values.type,
        amount: values.amount,
        currency: account?.currency ?? currency,
        accountId: values.accountId,
        categoryId: values.type === "transfer" ? null : values.categoryId,
        transferAccountId: values.type === "transfer" ? values.transferAccountId : null,
        date: new Date(values.date),
        payee: values.payee.trim(),
        notes: values.notes?.trim() || null,
        paymentMethod: values.paymentMethod,
        isRecurring: false,
        tagIds: values.tagIds ?? [],
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (receipt) {
        const data = new FormData();
        data.set("file", receipt);
        const uploaded = await uploadReceipt(result.data.id, data);
        if (!uploaded.ok)
          toast.error("Transaction saved, but the receipt failed: " + uploaded.error);
      }

      toast.success("Transaction added");
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
      setReceipt(null);
      setOpen(false);
      router.refresh();
    });
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
    <Button type="submit" form="quick-add-form" disabled={pending || accounts.length === 0}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? "Saving" : "Add transaction"}
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

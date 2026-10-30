"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  MoneyInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { toDateInput } from "@repo/finance";
import { addContribution } from "@/features/goals/actions";

type AccountOption = { id: string; name: string };

const NO_ACCOUNT = "none";

const formSchema = z.object({
  amount: z.number().int("Enter a whole amount").positive("Enter an amount greater than zero"),
  date: z.string().min(1, "Choose a date"),
  accountId: z.string().optional(),
  note: z.string().max(500, "Keep the note under 500 characters").optional(),
});

type Values = z.infer<typeof formSchema>;

export function ContributionDialog({
  goalId,
  goalName,
  currency,
  accounts,
  trigger,
}: {
  goalId: string;
  goalName: string;
  currency: string;
  accounts: AccountOption[];
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const today = toDateInput(new Date());

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, date: today, accountId: "", note: "" },
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await addContribution({
        goalId,
        amount: values.amount,
        date: new Date(values.date + "T00:00:00"),
        accountId: values.accountId || null,
        note: values.note?.trim() || null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Added to " + goalName);
      form.reset({ amount: 0, date: today, accountId: values.accountId, note: "" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Add money
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to {goalName}</DialogTitle>
          <DialogDescription>
            Contributions are tracked separately from transactions, so this never changes an account
            balance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value > 0 ? field.value : null}
                      onChange={(minor) => field.onChange(minor ?? 0)}
                      currency={currency}
                      aria-invalid={Boolean(form.formState.errors.amount)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account (optional)</FormLabel>
                    <Select
                      value={field.value || NO_ACCOUNT}
                      onValueChange={(value) => field.onChange(value === NO_ACCOUNT ? "" : value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ACCOUNT}>No account</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Bonus, side gig, round-up" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Saving" : "Add contribution"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

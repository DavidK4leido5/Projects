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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  MoneyInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@repo/ui";
import { upsertBudget } from "@/features/budgets/actions";
import type { BudgetCategory } from "@/features/budgets/queries";

const formSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amount: z.number().int("Enter a whole amount").positive("Enter an amount greater than zero"),
  rollover: z.boolean(),
});

type Values = z.infer<typeof formSchema>;

type BudgetDraft = {
  categoryId: string | null;
  amount: number;
  rollover: boolean;
  currency?: string;
};

export function BudgetDialog({
  month,
  currency,
  categories,
  budget,
  trigger,
}: {
  month: string;
  currency: string;
  categories: BudgetCategory[];
  budget?: BudgetDraft;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: budget?.categoryId ?? "overall",
      amount: budget?.amount ?? 0,
      rollover: budget?.rollover ?? false,
    },
  });

  const nameOf = new Map(categories.map((category) => [category.id, category.name]));

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await upsertBudget({
        categoryId: values.categoryId === "overall" ? null : values.categoryId,
        periodMonth: month,
        amount: values.amount,
        currency: budget?.currency ?? currency,
        rollover: values.rollover,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(budget ? "Budget updated" : "Budget added");
      if (!budget) {
        form.reset({ categoryId: "overall", amount: 0, rollover: false });
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" aria-hidden />
            New budget
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "New budget"}</DialogTitle>
          <DialogDescription>
            Set a monthly limit for one category, or one overall limit for everything.
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
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={Boolean(budget)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="overall">Overall (all spending)</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.parentId
                            ? (nameOf.get(category.parentId) ?? "Category") + " / " + category.name
                            : category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {budget ? (
                    <FormDescription>
                      Category is fixed on an existing budget. Delete it to pick another one.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly limit</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value > 0 ? field.value : null}
                      onChange={(minor) => field.onChange(minor ?? 0)}
                      currency={budget?.currency ?? currency}
                      aria-invalid={Boolean(form.formState.errors.amount)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rollover"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start justify-between gap-4 rounded-md border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Roll over unused money</FormLabel>
                    <FormDescription>
                      Adds last month&apos;s leftover to this month&apos;s limit.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Saving" : budget ? "Save changes" : "Create budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

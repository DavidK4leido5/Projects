"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
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
  Textarea,
} from "@repo/ui";

type AccountOption = { id: string; name: string };

type GoalDraft = {
  id: string;
  name: string;
  targetAmount: number;
  currency: string;
  targetDate: string | null;
  linkedAccountId: string | null;
  note: string | null;
  color: string;
};

export type GoalFormValues = {
  name: string;
  targetAmount: number;
  targetDate: string | null;
  linkedAccountId: string | null;
  note: string | null;
};

const formSchema = z.object({
  name: z.string().trim().min(1, "Name the goal").max(80, "Keep it under 80 characters"),
  targetAmount: z.number().int("Enter a whole amount").positive("Enter a target greater than zero"),
  targetDate: z.string().optional(),
  linkedAccountId: z.string().optional(),
  note: z.string().max(1000, "Keep the note under 1000 characters").optional(),
});

type Values = z.infer<typeof formSchema>;

const NO_ACCOUNT = "none";

export function GoalDialog({
  currency,
  accounts,
  goal,
  trigger,
  onSave,
}: {
  currency: string;
  accounts: AccountOption[];
  goal?: GoalDraft;
  trigger?: ReactNode;
  onSave: (values: GoalFormValues) => void;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: goal?.name ?? "",
      targetAmount: goal?.targetAmount ?? 0,
      targetDate: goal?.targetDate ?? "",
      linkedAccountId: goal?.linkedAccountId ?? "",
      note: goal?.note ?? "",
    },
  });

  function onSubmit(values: Values): void {
    onSave({
      name: values.name,
      targetAmount: values.targetAmount,
      targetDate: values.targetDate || null,
      linkedAccountId: values.linkedAccountId || null,
      note: values.note?.trim() || null,
    });

    if (!goal) {
      form.reset({
        name: "",
        targetAmount: 0,
        targetDate: "",
        linkedAccountId: "",
        note: "",
      });
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" aria-hidden />
            New goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            Set a target and a date. Contributions build the pace, so the projection stays honest.
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Emergency fund" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target amount</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value > 0 ? field.value : null}
                      onChange={(minor) => field.onChange(minor ?? 0)}
                      currency={goal?.currency ?? currency}
                      aria-invalid={Boolean(form.formState.errors.targetAmount)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked account (optional)</FormLabel>
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
                    <Textarea rows={3} placeholder="Why this goal matters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form={formId}>
            {goal ? "Save changes" : "Create goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

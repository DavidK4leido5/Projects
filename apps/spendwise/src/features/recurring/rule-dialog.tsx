"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { formatMoney, toDateInput } from "@repo/finance";
import { PAYMENT_METHODS } from "@/lib/defaults";
import { createRule, updateRule } from "@/features/recurring/actions";
import {
  FREQUENCY_LABELS,
  FREQUENCY_UNITS,
  RULE_FREQUENCIES,
  WEEKDAY_LABELS,
  monthlyAmount,
  scheduleLabel,
  type RuleFormSource,
} from "@/features/recurring/rule-meta";

const PAYMENT_VALUES = [
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "ewallet",
  "other",
] as const;

const formSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.int("Enter a whole amount in cents").positive("Enter an amount greater than zero"),
  accountId: z.string().min(1, "Choose an account"),
  categoryId: z.string(),
  payee: z
    .string()
    .trim()
    .min(1, "Who is the bill for?")
    .max(120, "Keep the payee under 120 characters"),
  paymentMethod: z.enum(PAYMENT_VALUES, "Choose a payment method"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"], "Choose a frequency"),
  interval: z.int("Interval must be a whole number").min(1, "At least 1").max(365, "365 or less"),
  dayOfMonth: z.int("Day of month must be a whole number").min(1).max(31).nullable(),
  weekday: z.int("Weekday must be a whole number").min(0).max(6).nullable(),
  startDate: z.string().min(1, "Choose a start date"),
});

type Values = z.infer<typeof formSchema>;

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

function emptyCategory(value: string | null): string {
  return value ?? "none";
}

export function RuleDialog({
  accounts,
  categories,
  currency,
  locale = "en-PH",
  rule,
  trigger,
  open,
  onOpenChange,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  currency: string;
  locale?: string;
  rule?: RuleFormSource | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;
  const [pending, startTransition] = useTransition();

  const [defaults] = useState<Values>(() => ({
    type: rule?.type ?? "expense",
    amount: rule?.amount ?? 0,
    accountId: rule?.accountId ?? accounts[0]?.id ?? "",
    categoryId: rule?.categoryId ?? "",
    payee: rule?.payee ?? "",
    paymentMethod: rule?.paymentMethod ?? "cash",
    frequency: rule?.frequency ?? "monthly",
    interval: rule?.interval ?? 1,
    dayOfMonth: rule?.dayOfMonth ?? (rule ? null : new Date().getDate()),
    weekday: rule?.weekday ?? null,
    startDate: rule?.startDate ?? toDateInput(new Date()),
  }));

  const form = useForm<Values>({ resolver: zodResolver(formSchema), defaultValues: defaults });
  const [type, frequency, interval, amount, dayOfMonth, weekday] = useWatch({
    control: form.control,
    name: ["type", "frequency", "interval", "amount", "dayOfMonth", "weekday"],
  });

  const ruleCurrency = rule?.currency ?? currency;
  const visibleCategories = categories.filter((category) => category.kind === type);
  const featuredMonthly = monthlyAmount({ amount, frequency, interval });

  function setOpen(next: boolean): void {
    if (!isControlled) setUncontrolledOpen(next);
    if (!next) form.reset(defaults);
    onOpenChange?.(next);
  }

  function onSubmit(values: Values) {
    startTransition(async () => {
      const payload = {
        type: values.type,
        amount: values.amount,
        currency: ruleCurrency,
        accountId: values.accountId,
        categoryId: values.categoryId === "" ? null : values.categoryId,
        payee: values.payee.trim(),
        notes: null,
        paymentMethod: values.paymentMethod,
        frequency: values.frequency,
        interval: values.interval,
        dayOfMonth: values.frequency === "monthly" ? values.dayOfMonth : null,
        weekday: values.frequency === "weekly" ? values.weekday : null,
        startDate: values.startDate,
        endDate: null,
      };

      const result = rule ? await updateRule(rule.id, payload) : await createRule(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(rule ? "Rule updated" : "Rule created");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit recurring rule" : "New recurring rule"}</DialogTitle>
          <DialogDescription>
            Bills and subscriptions that repeat. Marking one paid records the transaction.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="rule-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("categoryId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        currency={ruleCurrency}
                        locale={locale}
                        aria-invalid={Boolean(form.formState.errors.amount)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payee</FormLabel>
                  <FormControl>
                    <Input placeholder="Rent, Netflix, salary" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={emptyCategory(field.value || null)}
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {visibleCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RULE_FREQUENCIES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {FREQUENCY_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Every</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          inputMode="numeric"
                          value={field.value > 0 ? field.value : ""}
                          onChange={(event) => {
                            const next = event.target.valueAsNumber;
                            field.onChange(Number.isNaN(next) ? 0 : next);
                          }}
                          aria-invalid={Boolean(form.formState.errors.interval)}
                        />
                      </FormControl>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {FREQUENCY_UNITS[frequency]}
                        {field.value === 1 ? "" : "s"}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {frequency === "monthly" ? (
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        placeholder="Day from the start date"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const next = event.target.valueAsNumber;
                          field.onChange(Number.isNaN(next) ? null : next);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {frequency === "weekly" ? (
              <FormField
                control={form.control}
                name="weekday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weekday</FormLabel>
                    <Select
                      value={field.value == null ? "none" : String(field.value)}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : Number(value))
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Day from the start date</SelectItem>
                        {WEEKDAY_LABELS.map((label, index) => (
                          <SelectItem key={label} value={String(index)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {scheduleLabel({ frequency, interval, dayOfMonth, weekday })}
              {" · about "}
              {formatMoney(featuredMonthly, ruleCurrency, locale)} per month
            </p>
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="rule-form" disabled={pending || accounts.length === 0}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Saving" : rule ? "Save rule" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

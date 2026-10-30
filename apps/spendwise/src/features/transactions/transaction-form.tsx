"use client";

import { type ReactNode } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
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
import { PAYMENT_METHODS } from "@/lib/defaults";

export type TransactionAccountOption = {
  id: string;
  name: string;
  type: string;
  currency: string;
};

export type TransactionCategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
};

export type TransactionTagOption = { id: string; name: string };

const PAYMENT_VALUES = [
  "cash",
  "debit_card",
  "credit_card",
  "bank_transfer",
  "ewallet",
  "other",
] as const;

const transactionShape = {
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().int("Enter a whole amount").positive("Enter an amount greater than zero"),
  accountId: z.string().min(1, "Choose an account"),
  categoryId: z.string().optional(),
  transferAccountId: z.string().optional(),
  date: z.string().min(1, "Choose a date"),
  payee: z
    .string()
    .trim()
    .min(1, "Who was it for?")
    .max(120, "Keep the payee under 120 characters"),
  notes: z.string().max(2000, "Keep notes under 2000 characters").optional(),
  paymentMethod: z.enum(PAYMENT_VALUES),
  tagIds: z.array(z.string()).optional(),
};

function transferIssue(value: {
  type: string;
  accountId: string;
  transferAccountId?: string;
}): { path: string[]; message: string } | null {
  if (value.type !== "transfer") return null;
  if (!value.transferAccountId) {
    return { path: ["transferAccountId"], message: "Choose where the money goes" };
  }
  if (value.transferAccountId === value.accountId) {
    return { path: ["transferAccountId"], message: "Pick a different account" };
  }
  return null;
}

export const transactionFormSchema = z.object(transactionShape).superRefine((value, ctx) => {
  const issue = transferIssue(value);
  if (issue) {
    ctx.addIssue({ code: "custom", ...issue });
    return;
  }
  if (!value.categoryId) {
    ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category" });
  }
});

/** Editing keeps uncategorized transactions editable; everything else matches. */
export const transactionEditFormSchema = z.object(transactionShape).superRefine((value, ctx) => {
  const issue = transferIssue(value);
  if (issue) ctx.addIssue({ code: "custom", ...issue });
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const EMPTY_TRANSACTION_VALUES: TransactionFormValues = {
  type: "expense",
  amount: 0,
  accountId: "",
  categoryId: "",
  transferAccountId: "",
  date: "",
  payee: "",
  notes: "",
  paymentMethod: "cash",
  tagIds: [],
};

export function toDateTimeLocal(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

/**
 * The quick-add field set. Quick-add, edit, and any future form share this so
 * the transfer/category rules only exist once.
 */
export function TransactionFormFields({
  form,
  accounts,
  categories,
  currency,
  extra,
  children,
}: {
  form: UseFormReturn<TransactionFormValues>;
  accounts: TransactionAccountOption[];
  categories: TransactionCategoryOption[];
  currency: string;
  /** Rendered beside the payment method, e.g. the receipt picker. */
  extra?: ReactNode;
  /** Rendered after notes, e.g. tag checkboxes. */
  children?: ReactNode;
}) {
  const [type, accountId] = useWatch({
    control: form.control,
    name: ["type", "accountId"],
  });
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const visibleCategories = categories.filter((category) =>
    type === "income" ? category.kind === "income" : category.kind === "expense",
  );

  return (
    <>
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <div
              role="radiogroup"
              aria-label="Transaction type"
              className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
            >
              {(
                [
                  ["expense", "Expense"],
                  ["income", "Income"],
                  ["transfer", "Transfer"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  onClick={() => {
                    field.onChange(value);
                    form.setValue("categoryId", "");
                    form.setValue("transferAccountId", "");
                    form.clearErrors();
                  }}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (field.value === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
                  currency={selectedAccount?.currency ?? currency}
                  aria-invalid={Boolean(form.formState.errors.amount)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
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
            <FormLabel>{type === "transfer" ? "Description" : "Payee"}</FormLabel>
            <FormControl>
              <Input
                placeholder={type === "transfer" ? "Move to savings" : "Where did it go?"}
                autoComplete="off"
                {...field}
              />
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
              <FormLabel>{type === "transfer" ? "From account" : "Account"}</FormLabel>
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

        {type === "transfer" ? (
          <FormField
            control={form.control}
            name="transferAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To account</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts
                      .filter((account) => account.id !== accountId)
                      .map((account) => (
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
        ) : (
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
        )}
      </div>

      <div className={extra ? "grid gap-4 sm:grid-cols-2" : ""}>
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
        {extra}
      </div>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (optional)</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="Anything worth remembering" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {children}
    </>
  );
}

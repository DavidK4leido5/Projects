"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { CURRENCIES } from "@repo/finance";
import { ACCOUNT_TYPE_META, ACCOUNT_TYPES } from "@/features/accounts/account-meta";
import type { AccountWithBalance } from "@/features/accounts/queries";

const schema = z.object({
  name: z.string().trim().min(1, "Give the account a name").max(80, "Keep it under 80 characters"),
  type: z.enum(["cash", "bank", "ewallet", "credit_card", "savings", "investment"]),
  startingBalance: z.number().int(),
  currency: z.string().length(3, "Choose a currency"),
});

export type AccountFormValues = z.infer<typeof schema>;

export function AccountDialog({
  currency,
  account,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSubmit: onAccountSubmit,
}: {
  currency: string;
  account?: AccountWithBalance;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (values: AccountFormValues) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const formId = useId();

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          startingBalance: account.startingBalance,
          currency: account.currency,
        }
      : { name: "", type: "cash", startingBalance: 0, currency },
  });
  const selectedCurrency = useWatch({ control: form.control, name: "currency" });

  function submit(values: AccountFormValues) {
    setOpen(false);
    if (!account) {
      form.reset({ name: "", type: values.type, startingBalance: 0, currency: values.currency });
    }
    onAccountSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>
            Track cash, a bank account, an e-wallet, or a card. Balances start from what you enter
            here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(submit)}
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
                    <Input placeholder="Everyday savings" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {ACCOUNT_TYPE_META[value].label}
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.code} · {item.name}
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
              name="startingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting balance</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value === 0 ? null : field.value}
                      onChange={(minor) => field.onChange(minor ?? 0)}
                      currency={selectedCurrency}
                      allowNegative
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    For a credit card, enter what you currently owe as a negative amount.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form={formId}>
            {account ? null : <Plus className="size-4" aria-hidden />}
            {account ? "Save changes" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

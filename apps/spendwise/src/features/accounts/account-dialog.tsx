"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { CURRENCIES } from "@repo/finance";
import { createAccount } from "@/features/accounts/actions";
import { ACCOUNT_TYPE_META, ACCOUNT_TYPES } from "@/features/accounts/account-meta";

const schema = z.object({
  name: z.string().trim().min(1, "Give the account a name").max(80, "Keep it under 80 characters"),
  type: z.enum(["cash", "bank", "ewallet", "credit_card", "savings", "investment"]),
  startingBalance: z.number().int(),
  currency: z.string().length(3, "Choose a currency"),
});

type Values = z.infer<typeof schema>;

export function AccountDialog({ currency }: { currency: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "cash", startingBalance: 0, currency },
  });
  const selectedCurrency = useWatch({ control: form.control, name: "currency" });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await createAccount({
        name: values.name,
        type: values.type,
        startingBalance: values.startingBalance,
        currency: values.currency.toUpperCase(),
        color: "slate",
        icon: "wallet",
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Account added");
      form.reset({ name: "", type: values.type, startingBalance: 0, currency: values.currency });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden />
          Add account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New account</DialogTitle>
          <DialogDescription>
            Track cash, a bank account, an e-wallet, or a card. Balances start from what you enter
            here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="account-form"
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
          <Button type="submit" form="account-form" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Saving" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

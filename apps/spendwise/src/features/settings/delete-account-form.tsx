"use client";

import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Button,
  ConfirmDialog,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@repo/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PasswordInput } from "@/features/auth/password-input";
import { deleteAccount } from "@/features/settings/actions";
import { authClient } from "@/lib/auth/client";

const schema = z.object({
  password: z.string().min(1, "Enter your password"),
  confirm: z.string(),
});

type Values = z.infer<typeof schema>;

export function DeleteAccountForm({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  function onSubmit(values: Values) {
    setError(null);
    if (values.confirm.trim().toLowerCase() !== email.toLowerCase()) {
      form.setError("confirm", { message: "Type the email on this account" });
      return;
    }

    startTransition(async () => {
      const result = await deleteAccount(values.password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.data.deleted) {
        toast.message(result.data.message ?? "Check your email to confirm deletion.");
        setOpen(false);
        return;
      }
      await authClient.signOut().catch(() => undefined);
      toast.success(
        result.data.identityDeleted
          ? "Your account and data were deleted."
          : "Your financial data was deleted. The sign-in identity remains with the auth provider.",
      );
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type your email to confirm</FormLabel>
                <FormControl>
                  <Input placeholder={email} autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive" size="sm" disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                Delete account
              </Button>
            }
            title="Delete this account?"
            description="This removes your accounts, transactions, budgets, goals, reports, and receipt files. It cannot be undone."
            confirmLabel="Delete everything"
            onConfirm={() => form.handleSubmit(onSubmit)()}
            open={open}
            onOpenChange={setOpen}
          />
        </div>
      </form>
    </Form>
  );
}

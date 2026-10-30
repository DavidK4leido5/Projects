"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui";
import { authClient } from "@/lib/auth/client";
import { passwordStrength } from "./password-strength";
import { PasswordInput } from "./password-input";
import { resetPasswordSchema, type ResetPasswordValues } from "./schemas";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const watchedPassword = useWatch({ control: form.control, name: "password" });
  const strength = passwordStrength(watchedPassword);

  function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    startTransition(async () => {
      const { error } = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });

      if (error) {
        setFormError(error.message ?? "That reset link is invalid or has expired.");
        return;
      }

      setDone(true);
      setTimeout(() => router.replace("/login"), 1200);
    });
  }

  if (!token) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription>
          This page needs a reset token. Request a fresh link from{" "}
          <Link className="underline" href="/forgot-password">
            forgot password
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  if (done) {
    return (
      <Alert role="status">
        <AlertDescription>Password updated. Taking you to sign in.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError ? (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {watchedPassword ? "Strength: " + strength.label : "Use 8+ characters."}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Updating" : "Update password"}
        </Button>
      </form>
    </Form>
  );
}

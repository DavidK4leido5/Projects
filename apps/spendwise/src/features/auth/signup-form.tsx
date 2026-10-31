"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
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
  Input,
} from "@repo/ui";
import { authClient } from "@/lib/auth/client";
import { brand } from "@/lib/brand";
import { passwordStrength } from "./password-strength";
import { PasswordInput } from "./password-input";
import { signupSchema, type SignupValues } from "./schemas";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const watchedPassword = useWatch({ control: form.control, name: "password" });
  const strength = passwordStrength(watchedPassword);

  function onSubmit(values: SignupValues) {
    setFormError(null);
    setNotice(null);
    startTransition(async () => {
      const { error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (error) {
        setFormError(error.message ?? "We could not create the account.");
        return;
      }

      const session = await authClient.getSession();
      if (!session.data?.user) {
        setNotice("Account created. Check your email to verify it, then sign in.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
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

        {notice ? (
          <Alert role="status">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Maria Santos" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...field}
                />
              </FormControl>
              <div className="flex items-center gap-2" aria-live="polite">
                <div className="flex h-1 flex-1 gap-1" aria-hidden>
                  {[0, 1, 2, 3].map((step) => (
                    <span
                      key={step}
                      className={
                        "h-full flex-1 rounded-full " +
                        (watchedPassword.length > 0 && strength.score > step
                          ? "bg-primary"
                          : "bg-muted")
                      }
                    />
                  ))}
                </div>
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {watchedPassword ? strength.label : ""}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
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

        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Creating account" : "Create account"}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to keep your own backup of exported data. {brand.name} never sells
          your information.
        </p>
      </form>
    </Form>
  );
}

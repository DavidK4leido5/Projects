"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
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

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Keep it under 80 characters"),
});

type Values = z.infer<typeof schema>;

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedName, setSavedName] = useState(name);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name } });

  function onSubmit(values: Values) {
    const previousName = savedName;
    setSavedName(values.name);
    startTransition(async () => {
      try {
        const { error } = await authClient.updateUser({ name: values.name });
        if (error) throw new Error(error.message ?? "Could not update your name.");
        toast.success("Profile updated");
        router.refresh();
      } catch (cause) {
        setSavedName(previousName);
        toast.error(cause instanceof Error ? cause.message : "Could not update your name.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Email</span>
            <Input value={email} readOnly disabled aria-describedby="email-note" />
            <p id="email-note" className="text-xs text-muted-foreground">
              Email changes are handled by sign-in verification in a later release.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {pending ? "Saving" : "Save profile"}
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Displayed as <span className="font-medium text-foreground">{savedName}</span>
          </p>
        </div>
      </form>
    </Form>
  );
}

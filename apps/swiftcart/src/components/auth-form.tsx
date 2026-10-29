"use client";

import { useActionState } from "react";
import { Button } from "@repo/ui";
import { emptyFormState, type FormState } from "@/lib/form";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none";

type AuthFormProps = {
  mode: "signin" | "signup";
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isSignup ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-800">
          Store name
          <input
            name="storeName"
            type="text"
            required
            autoComplete="organization"
            className={inputClass}
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-800">
        Email
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-800">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          className={inputClass}
        />
      </label>

      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? isSignup
            ? "Creating store..."
            : "Signing in..."
          : isSignup
            ? "Create store"
            : "Sign in"}
      </Button>
    </form>
  );
}

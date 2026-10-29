"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@repo/ui";
import { provisionAccount } from "@/features/auth/actions";
import { authClient } from "@/lib/auth/client";

type Mode = "signin" | "signup-user" | "signup-store";

const COPY: Record<Mode, { submit: string; busy: string }> = {
  signin: { submit: "Sign in", busy: "Signing in..." },
  "signup-user": { submit: "Create account", busy: "Creating account..." },
  "signup-store": { submit: "Open store", busy: "Creating store..." },
};

function messageOf(thrown: unknown, fallback: string): string {
  if (thrown instanceof Error && thrown.message) return thrown.message;
  const shaped = thrown as { message?: string; error?: { message?: string } } | null;
  return shaped?.message ?? shaped?.error?.message ?? fallback;
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignin = mode === "signin";
  const isStore = mode === "signup-store";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("name") ?? "").trim();
    const storeName = String(form.get("storeName") ?? "").trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (isStore && storeName.length < 2) {
      setError("Store name must be at least 2 characters.");
      return;
    }

    setPending(true);

    // The hosted client can either return or throw for the same failure, so both
    // paths land on the same inline message instead of a runtime error overlay.
    try {
      if (isSignin) {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw result.error;
      } else {
        const name = isStore ? storeName : displayName;
        const result = await authClient.signUp.email({ email, password, name });
        if (result.error) throw result.error;

        const provisioned = await provisionAccount({ mode: isStore ? "store" : "user", storeName });
        if (!provisioned.ok) {
          await authClient.signOut();
          throw new Error(provisioned.error);
        }
      }

      router.push("/continue");
      router.refresh();
    } catch (thrown) {
      setError(
        messageOf(
          thrown,
          isSignin ? "Email or password is incorrect." : "Could not create the account.",
        ),
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {isStore ? (
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

      {mode === "signup-user" ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-800">
          Name
          <input name="name" type="text" required autoComplete="name" className={inputClass} />
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
          minLength={8}
          autoComplete={isSignin ? "current-password" : "new-password"}
          className={inputClass}
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? COPY[mode].busy : COPY[mode].submit}
      </Button>
    </form>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@repo/ui";
import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/features/stores/actions";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-neutral-600">Manage your store and its listings.</p>
      </header>

      <AuthForm mode="signin" action={signIn} />

      <p className="text-sm text-neutral-600">
        No store yet?{" "}
        <Link
          href="/signup"
          className="font-medium text-neutral-900 underline-offset-4 hover:underline"
        >
          Open a store
        </Link>
      </p>

      <Card className="bg-neutral-50 p-4">
        <p className="text-xs text-neutral-600">Demo account: demo@swiftcart.dev / demo1234</p>
      </Card>
    </div>
  );
}

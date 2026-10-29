import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/features/stores/actions";

export const metadata: Metadata = {
  title: "Open a store",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Open a store</h1>
        <p className="text-sm text-neutral-600">
          Set up your storefront and start listing what you sell.
        </p>
      </header>

      <AuthForm mode="signup" action={signUp} />

      <p className="text-sm text-neutral-600">
        Already have a store?{" "}
        <Link
          href="/login"
          className="font-medium text-neutral-900 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

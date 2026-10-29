import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-neutral-600">Save a cart and come back to it later.</p>
      </header>

      <AuthForm mode="signup-user" />

      <p className="text-sm text-neutral-600">
        Selling something?{" "}
        <Link href="/signup/store" className="underline underline-offset-4">
          Open a store
        </Link>
        .
      </p>
    </div>
  );
}

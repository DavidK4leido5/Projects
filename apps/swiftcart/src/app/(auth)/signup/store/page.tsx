import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Open a store" };

export default function StoreSignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Open a store</h1>
        <p className="text-sm text-neutral-600">
          One account, one store. You can list products as soon as it exists.
        </p>
      </header>

      <AuthForm mode="signup-store" />

      <p className="text-sm text-neutral-600">
        Just shopping?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Create a shopper account
        </Link>
        .
      </p>
    </div>
  );
}

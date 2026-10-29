import Link from "next/link";
import { Card, CardTitle } from "@repo/ui";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-neutral-600">Manage your store, your cart, or the whole site.</p>
      </header>

      <AuthForm mode="signin" />

      <Card className="flex flex-col gap-1">
        <CardTitle className="text-sm font-medium text-neutral-600">Demo accounts</CardTitle>
        <p className="text-sm text-neutral-700">admin@swiftcart.dev</p>
        <p className="text-sm text-neutral-700">demo@swiftcart.dev</p>
        <p className="text-sm text-neutral-700">shopper@swiftcart.dev</p>
        <p className="text-xs text-neutral-500">Password for all three: demo1234</p>
      </Card>

      <p className="text-sm text-neutral-600">
        No account?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Sign up
        </Link>{" "}
        or{" "}
        <Link href="/signup/store" className="underline underline-offset-4">
          open a store
        </Link>
        .
      </p>
    </div>
  );
}

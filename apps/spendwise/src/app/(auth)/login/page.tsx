import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/auth-shell";
import { DemoCredentials } from "@/features/auth/demo-credentials";
import { LoginForm } from "@/features/auth/login-form";
import { getAuthUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginCard />}>
      <LoginBody />
    </Suspense>
  );
}

async function LoginBody() {
  if (await getAuthUser()) redirect("/dashboard");
  return <LoginCard />;
}

function LoginCard() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to pick up where your money left off."
      footer={
        <span>
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </span>
      }
      afterFooter={<DemoCredentials />}
    >
      <LoginForm />
    </AuthShell>
  );
}

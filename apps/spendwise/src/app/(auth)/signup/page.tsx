import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/auth-shell";
import { SignupForm } from "@/features/auth/signup-form";
import { getAuthUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupCard />}>
      <SignupBody />
    </Suspense>
  );
}

async function SignupBody() {
  if (await getAuthUser()) redirect("/dashboard");
  return <SignupCard />;
}

function SignupCard() {
  return (
    <AuthShell
      title="Create your account"
      description="A calm place for everyday money, from the first peso."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </span>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}

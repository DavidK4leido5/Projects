import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { brand } from "@/lib/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={brand.name + " home"}
      >
        <Logo size="md" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
        Your accounts, transactions, and reports stay scoped to your account.
      </p>
    </main>
  );
}

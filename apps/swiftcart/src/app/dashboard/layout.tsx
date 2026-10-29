import Link from "next/link";
import type { ReactNode } from "react";
import { requireStore } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const store = await requireStore();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{store.name}</h1>
          <Link
            href={`/stores/${store.slug}`}
            className="text-sm text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            /stores/{store.slug}
          </Link>
        </div>
        <nav className="flex items-center gap-5 text-sm text-neutral-600">
          <Link href="/dashboard" className="transition-colors hover:text-neutral-900">
            Products
          </Link>
          <Link href="/dashboard/products/new" className="transition-colors hover:text-neutral-900">
            New product
          </Link>
        </nav>
      </div>

      {children}
    </main>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { requireStoreOwner } from "@/lib/auth/guards";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const actor = await requireStoreOwner();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-neutral-200 pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{actor.store.name}</h1>
          <Link
            href={"/stores/" + actor.store.slug}
            className="text-sm text-neutral-600 underline-offset-4 hover:underline"
          >
            /stores/{actor.store.slug}
          </Link>
        </div>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/dashboard" className="transition-colors hover:text-neutral-900">
            Products
          </Link>
          <Link href="/dashboard/products/new" className="transition-colors hover:text-neutral-900">
            New product
          </Link>
        </nav>
      </div>
      <div className="pt-8">{children}</div>
    </main>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireStoreOwner } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

async function DashboardLayoutBody({ children }: { children: ReactNode }) {
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
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Items
          </Link>
          <Link
            href="/dashboard/inventory"
            className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Inventory
          </Link>
          <Link
            href="/dashboard/orders"
            className="text-sm text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Orders
          </Link>
        </nav>
      </div>
      <div className="pt-8">{children}</div>
    </main>
  );
}

export default function DashboardLayout(props: Parameters<typeof DashboardLayoutBody>[0]) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardLayoutBody {...props} />
    </Suspense>
  );
}

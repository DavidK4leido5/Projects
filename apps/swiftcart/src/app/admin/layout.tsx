import { Suspense } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/stores", label: "Stores" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
];

async function AdminLayoutBody({ children }: { children: ReactNode }) {
  const actor = await requireAdmin();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-neutral-200 pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight">SwiftCart admin</h1>
          <span className="text-sm text-neutral-600">{actor.profile.email}</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-neutral-600">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="pt-8">{children}</div>
    </main>
  );
}

export default function AdminLayout(props: Parameters<typeof AdminLayoutBody>[0]) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminLayoutBody {...props} />
    </Suspense>
  );
}

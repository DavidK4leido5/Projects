import { Suspense } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@repo/ui";
import { adminMetrics, LOW_STOCK_THRESHOLD } from "@/app/admin/queries";
import { adminOverview } from "@/features/admin/queries";
import { PageSkeleton } from "@/components/skeletons";

async function AdminPageBody() {
  const [overview, metrics] = await Promise.all([adminOverview(), adminMetrics()]);
  const stats = [
    { label: "Users", value: overview.users },
    { label: "Stores", value: overview.stores },
    { label: "Products", value: overview.products },
    { label: "Cart items", value: overview.cartItems },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-1">
            <CardTitle className="text-sm font-medium text-neutral-600">{stat.label}</CardTitle>
            <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/orders" className="block">
          <Card className="flex h-full flex-col gap-1">
            <CardTitle className="text-sm font-medium text-neutral-600">Orders today</CardTitle>
            <p className="text-2xl font-semibold tracking-tight">{metrics.ordersToday}</p>
            <p className="text-xs text-neutral-500">View orders</p>
          </Card>
        </Link>

        <Link href="/admin/orders" className="block">
          <Card className="flex h-full flex-col gap-1">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Open slices by status
            </CardTitle>
            <div className="flex flex-col gap-1 text-sm">
              {metrics.openSlices.map((slice) => (
                <div key={slice.status} className="flex items-baseline justify-between gap-3">
                  <span className="capitalize text-neutral-600">{slice.status}</span>
                  <span className="font-medium text-neutral-900">{slice.count}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500">Waiting on a store</p>
          </Card>
        </Link>

        <Link href="/admin/products" className="block">
          <Card className="flex h-full flex-col gap-1">
            <CardTitle className="text-sm font-medium text-neutral-600">Low stock</CardTitle>
            <p className="text-2xl font-semibold tracking-tight">{metrics.lowStock}</p>
            <p className="text-xs text-neutral-500">
              Products at {LOW_STOCK_THRESHOLD} units or fewer
            </p>
          </Card>
        </Link>
      </div>

      <Card className="flex flex-col gap-2">
        <CardTitle>What this area does</CardTitle>
        <p className="text-sm leading-6 text-neutral-600">
          This is the operator console for SwiftCart. It lists every account, store, and product in
          the marketplace. From here you can create a store for an existing account, rename or
          delete a store, change a user role, remove a user, and delete any product. Changes take
          effect immediately for every visitor.
        </p>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminPageBody />
    </Suspense>
  );
}

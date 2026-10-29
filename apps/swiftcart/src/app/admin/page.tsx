import { Suspense } from "react";
import Link from "next/link";
import { Card } from "@repo/ui";
import {
  adminMetrics,
  adminOrderSlices,
  LOW_STOCK_THRESHOLD,
  profileActivity,
  storeOrderStats,
} from "@/app/admin/queries";
import { adminOverview } from "@/features/admin/queries";
import { AdminOverviewSkeleton } from "@/components/admin/skeletons";

type Metric = {
  label: string;
  value: number;
  context: string;
  href: string;
};

async function AdminPageBody() {
  const [overview, metrics, slicesByOrder, storeStats, activity] = await Promise.all([
    adminOverview(),
    adminMetrics(),
    adminOrderSlices(),
    storeOrderStats(),
    profileActivity(),
  ]);

  const openStatuses = new Set(metrics.openSlices.map((slice) => slice.status));
  const openSliceCount = metrics.openSlices.reduce((total, slice) => total + slice.count, 0);
  let openOrders = 0;
  for (const slices of Object.values(slicesByOrder)) {
    if (slices.some((slice) => openStatuses.has(slice.status))) openOrders += 1;
  }

  const stats: Metric[] = [
    {
      label: "Products",
      value: overview.products,
      context: overview.cartItems + " in shopper carts",
      href: "/admin/products",
    },
    {
      label: "Orders",
      value: metrics.orders,
      context: metrics.ordersToday + " placed today",
      href: "/admin/orders",
    },
    {
      label: "Users",
      value: overview.users,
      context: Object.keys(activity.orderCounts).length + " with order history",
      href: "/admin/users",
    },
    {
      label: "Stores",
      value: overview.stores,
      context: Object.keys(storeStats).length + " with order traffic",
      href: "/admin/stores",
    },
    {
      label: "Open slices",
      value: openSliceCount,
      context: "Across " + openOrders + " orders",
      href: "/admin/orders",
    },
    {
      label: "Low stock",
      value: metrics.lowStock,
      context: "At or below " + LOW_STOCK_THRESHOLD + " units",
      href: "/admin/products",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Overview</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          >
            <Card className="flex h-full flex-col justify-between gap-6 p-5 transition-colors group-hover:border-neutral-300 group-hover:bg-neutral-50">
              <p className="text-sm font-medium text-neutral-600">{stat.label}</p>
              <div className="flex flex-col gap-1">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.context}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="flex flex-col gap-1 p-5">
        <h2 className="text-base font-semibold tracking-tight">Open slices by status</h2>
        <div className="mt-2 flex flex-col divide-y divide-neutral-100">
          {metrics.openSlices.map((slice) => (
            <Link
              key={slice.status}
              href="/admin/orders"
              className="-mx-2 flex items-baseline justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-inset"
            >
              <span className="capitalize text-neutral-600">{slice.status}</span>
              <span className="font-medium tabular-nums text-neutral-900">{slice.count}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminOverviewSkeleton />}>
      <AdminPageBody />
    </Suspense>
  );
}

import { Suspense } from "react";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageSkeleton } from "@/components/skeletons";
import { requireAdmin } from "@/lib/auth/guards";
import {
  isOrderStatusFilter,
  listAdminOrders,
  ORDER_STATUS_FILTERS,
} from "@/app/admin/order-queries";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

async function AdminOrdersPageBody({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const rawStatus = params.status ?? "all";
  const status = isOrderStatusFilter(rawStatus) ? rawStatus : "all";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const orders = await listAdminOrders({ q, status, page });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">Orders</h2>
        <p className="text-sm text-muted-foreground">
          Every order across the marketplace, newest first. Advancing a slice takes effect for the
          shopper immediately.
        </p>
      </div>

      <OrdersTable
        rows={orders.rows}
        total={orders.total}
        page={orders.page}
        pages={orders.pages}
        statusOptions={ORDER_STATUS_FILTERS}
      />
    </div>
  );
}

export default function AdminOrdersPage(props: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <AdminOrdersPageBody {...props} />
    </Suspense>
  );
}

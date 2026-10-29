import { Suspense } from "react";
import Link from "next/link";
import { formatDate, formatMoney } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";
import { listUserOrders } from "@/features/orders/queries";
import { requireUser } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

export const metadata = { title: "Orders" };

const STATUS_STYLES = {
  placed: "bg-neutral-100 text-neutral-700",
  fulfilled: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
} as const;

function statusClass(status: string) {
  return STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.placed;
}

async function OrdersPageBody() {
  const actor = await requireUser();
  const orders = await listUserOrders(actor.profile.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-neutral-600">Everything you have ordered, newest first.</p>
      </div>

      {orders.length === 0 ? (
        <Card className="mt-8 flex flex-col items-start gap-3">
          <CardTitle>No orders yet</CardTitle>
          <p className="text-sm text-neutral-600">
            Once you place an order it will be listed here with everything in it.
          </p>
          <Link href="/">
            <Button variant="secondary">Browse the shop</Button>
          </Link>
        </Card>
      ) : (
        <Card className="mt-8 overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Reference
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Total
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-900">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize " +
                        statusClass(order.status)
                      }
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-neutral-900">
                    {formatMoney(order.totalCents)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={"/orders/" + order.id}
                      className="rounded-md px-2 py-1 font-medium text-neutral-900 underline-offset-4 hover:bg-neutral-100"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrdersPageBody />
    </Suspense>
  );
}

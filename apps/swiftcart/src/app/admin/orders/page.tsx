import { Suspense } from "react";
import Link from "next/link";
import { formatDate, formatMoney } from "@repo/shared";
import { Button, Card } from "@repo/ui";
import { setOrderStatus } from "@/features/orders/actions";
import { listAllOrders } from "@/features/orders/queries";
import { requireAdmin } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

const STATUSES = ["placed", "fulfilled", "cancelled"] as const;

async function AdminOrdersPageBody() {
  await requireAdmin();
  const orders = await listAllOrders();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">
          Orders <span className="font-normal text-neutral-500">({orders.length})</span>
        </h2>
        <p className="text-sm text-neutral-600">
          Every order placed across the marketplace, newest first. Changing a status takes effect
          immediately for the shopper.
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">No orders have been placed yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Reference
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Customer
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Total
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-3">
                    <Link
                      href={"/orders/" + order.id}
                      className="font-mono text-xs text-neutral-900 underline-offset-4 hover:underline"
                    >
                      {order.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{order.customerEmail}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatMoney(order.totalCents)}</td>
                  <td className="px-5 py-3">
                    <form action={setOrderStatus} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="id" value={order.id} />
                      <select
                        name="status"
                        defaultValue={order.status}
                        aria-label={"Status for order " + order.id.slice(0, 8)}
                        className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status} className="capitalize">
                            {status}
                          </option>
                        ))}
                      </select>
                      <Button variant="secondary" type="submit" className="px-2 py-1.5">
                        Update
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminOrdersPageBody />
    </Suspense>
  );
}

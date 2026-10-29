import { Suspense } from "react";
import Link from "next/link";
import { formatDate, formatMoney } from "@repo/shared";
import { Button, Card } from "@repo/ui";
import { adminOrderSlices } from "@/app/admin/queries";
import { FulfilmentControls } from "@/components/fulfilment-controls";
import { setOrderStatus } from "@/features/orders/actions";
import { listAllOrders } from "@/features/orders/queries";
import { requireAdmin } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

const STATUSES = ["placed", "fulfilled", "cancelled"] as const;

async function AdminOrdersPageBody() {
  await requireAdmin();
  const [orders, slicesByOrder] = await Promise.all([listAllOrders(), adminOrderSlices()]);

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
                <th scope="col" className="px-5 py-3 font-medium">
                  Fulfilment
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders.map((order) => {
                const slices = slicesByOrder.get(order.id) ?? [];

                return (
                  <tr key={order.id}>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={"/orders/" + order.accessToken}
                          className="font-mono text-xs text-neutral-900 underline-offset-4 hover:underline"
                        >
                          {order.id.slice(0, 8)}
                        </Link>
                        <Link
                          href={"/track/" + order.accessToken}
                          className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
                        >
                          Track order
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-neutral-600">{order.customerEmail}</td>
                    <td className="px-5 py-3 text-neutral-600">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3 text-neutral-600">{formatMoney(order.totalCents)}</td>
                    <td className="px-5 py-3 align-top">
                      <div className="flex flex-col gap-3">
                        {slices.length === 0 ? (
                          <span className="text-xs text-neutral-500">No store slices</span>
                        ) : (
                          slices.map((slice) => (
                            <div key={slice.storeId} className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-neutral-900">
                                  {slice.storeName}
                                </span>
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600">
                                  {slice.status}
                                </span>
                                <span className="text-xs text-neutral-500">
                                  {slice.itemCount} {slice.itemCount === 1 ? "item" : "items"}
                                </span>
                              </div>
                              <FulfilmentControls
                                token={order.accessToken}
                                status={slice.status}
                                storeId={slice.storeId}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </td>
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
                );
              })}
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

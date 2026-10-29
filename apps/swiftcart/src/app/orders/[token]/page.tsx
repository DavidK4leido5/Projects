import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatMoney } from "@repo/shared";
import { Card, CardTitle } from "@repo/ui";
import { getOrderByToken } from "@/features/orders/queries";
import { PageSkeleton } from "@/components/skeletons";

export const metadata = { title: "Order" };

const STATUS_STYLES = {
  placed: "bg-neutral-100 text-neutral-700",
  fulfilled: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
} as const;

function statusClass(status: string) {
  return STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.placed;
}

async function OrderPageBody({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getOrderByToken(token);
  if (!result) notFound();

  const { order, items } = result;

  const address = [
    order.deliveryLine1,
    order.deliveryLine2,
    [order.deliveryCity, order.deliveryRegion, order.deliveryPostal].filter(Boolean).join(", "),
    order.deliveryCountry,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <Link href="/" className="text-sm text-neutral-600 underline-offset-4 hover:underline">
          Back to the shop
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            {order.publicRef ?? order.id.slice(0, 8)}
          </h1>
          <span
            className={
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize " +
              statusClass(order.status)
            }
          >
            {order.status}
          </span>
        </div>
        <p className="text-sm text-neutral-600">
          Placed {formatDate(order.createdAt)}
          {order.customerName ? " for " + order.customerName : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="mt-8 p-5">
          <p className="text-sm text-neutral-600">This order has no line items recorded.</p>
        </Card>
      ) : (
        <Card className="mt-8 overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Product
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Store
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Unit price
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Quantity
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Line total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium text-neutral-900">
                    {item.productName}
                    {item.optionSummary ? (
                      <span className="block text-xs font-normal text-neutral-500">
                        {item.optionSummary}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{item.storeName}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatMoney(item.priceCents)}</td>
                  <td className="px-5 py-3 text-neutral-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-right font-medium text-neutral-900">
                    {formatMoney(item.priceCents * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-2 p-5">
          <CardTitle className="text-sm font-medium text-neutral-600">Delivery</CardTitle>
          <p className="text-sm font-medium text-neutral-900">{order.customerName ?? "Guest"}</p>
          {order.customerPhone ? (
            <p className="text-sm text-neutral-600">{order.customerPhone}</p>
          ) : null}
          <p className="text-sm text-neutral-600">
            {address || "No delivery address was recorded."}
          </p>
          {order.customerEmail ? (
            <p className="text-sm text-neutral-600">{order.customerEmail}</p>
          ) : (
            <p className="text-sm text-neutral-600">Guest checkout, no email on file.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle className="text-sm font-medium text-neutral-600">Summary</CardTitle>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-neutral-600">Total</span>
            <span className="font-semibold">{formatMoney(order.totalCents)}</span>
          </div>
          <p className="text-xs text-neutral-500">
            {items.length} {items.length === 1 ? "line item" : "line items"}
          </p>
          <p className="text-xs text-neutral-500">
            No payment was taken. This records what was reserved.
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function OrderPage(props: Parameters<typeof OrderPageBody>[0]) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderPageBody {...props} />
    </Suspense>
  );
}

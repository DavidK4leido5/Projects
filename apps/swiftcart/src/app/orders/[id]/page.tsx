import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDate, formatMoney } from "@repo/shared";
import { Card, CardTitle } from "@repo/ui";
import { getOrder } from "@/features/orders/queries";
import { getActor } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

const STATUS_STYLES = {
  placed: "bg-neutral-100 text-neutral-700",
  fulfilled: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
} as const;

function statusClass(status: string) {
  return STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.placed;
}

async function OrderPageBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");

  const result = await getOrder(id);
  if (!result) notFound();

  const { order, items } = result;
  const isAdmin = actor.kind === "admin";
  if (order.userId !== actor.profile.id && !isAdmin) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <Link
          href={isAdmin ? "/admin/orders" : "/orders"}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          {isAdmin ? "All orders" : "Back to orders"}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight">{order.id.slice(0, 8)}</h1>
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
          Placed {formatDate(order.createdAt)} for {order.customerEmail}
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="mt-8">
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
                  <td className="px-5 py-3 font-medium text-neutral-900">{item.productName}</td>
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

      <div className="mt-6 flex flex-col items-end gap-3">
        <Card className="flex w-full max-w-xs flex-col gap-3">
          <CardTitle className="text-sm font-medium text-neutral-600">Summary</CardTitle>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-neutral-600">Total</span>
            <span className="font-semibold">{formatMoney(order.totalCents)}</span>
          </div>
          <p className="text-xs text-neutral-500">
            {items.length} {items.length === 1 ? "line item" : "line items"}
          </p>
        </Card>
        <p className="text-xs text-neutral-500">
          No payment was taken. This records what was reserved.
        </p>
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

import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cn, formatDate, formatMoney } from "@repo/shared";
import { Card, CardTitle } from "@repo/ui";
import { FulfilmentControls } from "@/components/fulfilment-controls";
import { PageSkeleton } from "@/components/skeletons";
import { SliceTimeline, TrackStatus } from "@/components/track-status";
import { getTrackingOrder } from "@/features/orders/tracking";
import { getActor } from "@/lib/auth/guards";

export const metadata = { title: "Tracking" };

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ store?: string }>;
};

async function TrackOrderBody({ params, searchParams }: PageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);

  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");

  const detail = await getTrackingOrder(token, actor);
  if (!detail) notFound();

  const { order, slices, items, role } = detail;
  const canFulfil = role === "store" || role === "admin";
  const chosen = slices.find((slice) => slice.storeId === query.store) ?? slices[0];
  const visibleTotal =
    role === "store"
      ? items.reduce((total, item) => total + item.priceCents * item.quantity, 0)
      : order.totalCents;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <Link
          href="/track"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          All tracking
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            {order.ref ?? order.token.slice(0, 8)}
          </h1>
          <TrackStatus status={detail.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Placed {formatDate(order.createdAt)}
          {order.customerName ? " for " + order.customerName : ""}
        </p>
      </div>

      <section className="mt-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Fulfilment by store</h2>
          {canFulfil && slices.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Store</span>
              {slices.map((slice) => (
                <Link
                  key={slice.storeId}
                  href={"/track/" + order.token + "?store=" + slice.storeId}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs",
                    slice.storeId === chosen?.storeId
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {slice.storeName}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {slices.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">
              No store fulfilments were recorded for this order.
            </p>
          </Card>
        ) : (
          slices.map((slice) => (
            <Card key={slice.storeId} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">{slice.storeName}</span>
                <TrackStatus status={slice.status} />
                <span className="text-xs text-muted-foreground">
                  {slice.itemCount} {slice.itemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <SliceTimeline status={slice.status} />
              {canFulfil && chosen && slice.storeId === chosen.storeId ? (
                <FulfilmentControls
                  token={order.token}
                  status={slice.status}
                  storeId={slice.storeId}
                />
              ) : null}
            </Card>
          ))
        )}
      </section>

      <Card className="mt-6 overflow-hidden p-0">
        {items.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            This order has no line items recorded.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Product
                </th>
                {role === "store" ? null : (
                  <th scope="col" className="px-5 py-3 font-medium">
                    Store
                  </th>
                )}
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
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium text-foreground">
                    {item.productName}
                    {item.optionSummary ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {item.optionSummary}
                      </span>
                    ) : null}
                  </td>
                  {role === "store" ? null : (
                    <td className="px-5 py-3 text-muted-foreground">{item.storeName}</td>
                  )}
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatMoney(item.priceCents)}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{item.quantity}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatMoney(item.priceCents * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {role === "store" || role === "admin" ? (
          <Card className="flex flex-col gap-2 p-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivery</CardTitle>
            <p className="text-sm font-medium">{order.customerName ?? "Guest"}</p>
            {order.customerPhone ? (
              <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {order.address || "No delivery address was recorded."}
            </p>
            {role === "admin" && order.customerEmail ? (
              <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
            ) : null}
          </Card>
        ) : null}

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {role === "store" ? "Your part" : "Summary"}
          </CardTitle>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {role === "store" ? "Items subtotal" : "Total"}
            </span>
            <span className="font-semibold tabular-nums">{formatMoney(visibleTotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "line item" : "line items"}
          </p>
        </Card>
      </div>

      {role !== "user" && detail.events.length > 0 ? (
        <Card className="mt-6 flex flex-col gap-3 p-5">
          <CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle>
          <ul className="flex flex-col gap-2">
            {detail.events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {event.actorRole ?? "system"}
                </span>
                <span className="font-medium">
                  {event.fromStatus ? event.fromStatus + " to " : ""}
                  {event.toStatus}
                </span>
                {event.note ? <span className="text-muted-foreground">{event.note}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </main>
  );
}

export default function TrackOrderPage(props: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TrackOrderBody {...props} />
    </Suspense>
  );
}

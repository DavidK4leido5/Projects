import { Suspense } from "react";
import { formatDate, formatMoney } from "@repo/shared";
import {
  Badge,
  Card,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { FulfilmentControls } from "@/components/fulfilment-controls";
import { Pagination } from "@/components/pagination";
import { ResultsRegion } from "@/components/results-region";
import { PageSkeleton } from "@/components/skeletons";
import { getTrackingOrder, listStoreTracking } from "@/features/orders/tracking";
import { requireStoreOwner } from "@/lib/auth/guards";

export const metadata = { title: "Orders" };

const PER_PAGE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type TrackedOrder = NonNullable<Awaited<ReturnType<typeof getTrackingOrder>>>;

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function statusVariant(status: string) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "delivered") return "default" as const;
  return "secondary" as const;
}

/** Same card frame as the rows below, so a page change does not jump. */
function OrderCardsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid gap-5 px-5 py-4 md:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function OrdersPageBody({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requireStoreOwner();
  const params = await searchParams;
  const rows = await listStoreTracking(actor.store.id, actor.store.slug);

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const requested = Math.max(Number(first(params.page)) || 1, 1);
  const page = Math.min(requested, pages);
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const details = await Promise.all(pageRows.map((row) => getTrackingOrder(row.token, actor)));

  const orders = pageRows.flatMap((row, index) => {
    const detail = details[index];
    return detail ? [{ row, detail }] : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Orders</h2>
        <p className="text-sm text-muted-foreground">
          Every order that includes your items, newest first. Move your part through packing and
          delivery here.
        </p>
      </div>

      <ResultsRegion
        id="order-results"
        className="flex scroll-mt-24 flex-col gap-4"
        skeleton={<OrderCardsSkeleton />}
      >
        {orders.length === 0 ? (
          <Card className="px-5 py-8">
            <p className="text-sm text-muted-foreground">
              No orders yet. Once a shopper buys from your store, it shows up here.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(({ row, detail }) => {
              const slice = row.slices[0];
              const status = slice?.status ?? "processing";
              const sliceTotal = detail.items.reduce(
                (total, item) => total + item.priceCents * item.quantity,
                0,
              );

              return (
                <Card key={row.id} className="overflow-hidden p-0">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {row.ref ?? row.id.slice(0, 8)}
                        </span>
                        <Badge variant={statusVariant(status)} className="capitalize">
                          {status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(row.createdAt)} · {detail.items.length} line item
                        {detail.items.length === 1 ? "" : "s"} · {formatMoney(sliceTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 px-5 py-4 md:grid-cols-[minmax(0,1fr)_17rem]">
                    <TrackedItems detail={detail} />

                    <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-3 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Deliver to
                      </p>
                      <p className="font-medium">{detail.order.customerName ?? "Guest"}</p>
                      {detail.order.customerPhone ? (
                        <p className="text-muted-foreground">{detail.order.customerPhone}</p>
                      ) : null}
                      <p className="text-muted-foreground">
                        {detail.order.address || "No address recorded."}
                      </p>

                      <FulfilmentControls token={row.token} status={status} className="mt-3" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ResultsRegion>

      <Pagination
        page={page}
        pages={pages}
        scrollTargetId="order-results"
        className="border-t border-border pt-4"
      />
    </div>
  );
}

function TrackedItems({ detail }: { detail: TrackedOrder }) {
  if (detail.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No line items for this store.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-0">Item</TableHead>
          <TableHead className="px-0">Qty</TableHead>
          <TableHead className="px-0 text-right">Line total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detail.items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="px-0">
              <span className="font-medium">{item.productName}</span>
              {item.optionSummary ? (
                <span className="block text-xs text-muted-foreground">{item.optionSummary}</span>
              ) : null}
            </TableCell>
            <TableCell className="px-0 tabular-nums text-muted-foreground">
              {item.quantity}
            </TableCell>
            <TableCell className="px-0 text-right tabular-nums">
              {formatMoney(item.priceCents * item.quantity)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <OrdersPageBody searchParams={searchParams} />
    </Suspense>
  );
}

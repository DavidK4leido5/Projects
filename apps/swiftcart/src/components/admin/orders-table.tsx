"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Ban, ExternalLink, StickyNote } from "lucide-react";
import { formatMoney } from "@repo/shared";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  Textarea,
} from "@repo/ui";
import type { AdminOrderRow, AdminOrderSliceRow } from "@/app/admin/order-queries";
import { EntityDrawer } from "@/components/entity-drawer";
import { FulfilmentControls } from "@/components/fulfilment-controls";
import { Pagination } from "@/components/pagination";
import { ResultsRegion } from "@/components/results-region";
import { RowMenu } from "@/components/row-menu";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableToolbar } from "@/components/table-toolbar";
import { addOrderNote, setFulfilmentStatus } from "@/features/orders/tracking-actions";
import { useSettlePending } from "@/lib/hooks";
import { beginPending } from "@/lib/navigation-pending";
import { orderStatus } from "@/lib/order-rollup";
import { nextStatus, type SliceStatus } from "@/lib/order-status";

const ORDERS_PATH = "/admin/orders";

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type StatusOption = { readonly value: string; readonly label: string };

type OrdersTableProps = {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pages: number;
  statusOptions: readonly StatusOption[];
};

type SliceChange = { orderId: string; storeId: string; status: SliceStatus };

/** Serialises the view state; defaults stay out of the URL. */
function ordersHref({ q, status, page }: { q: string; status: string; page: number }): string {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (status !== "all") search.set("status", status);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? ORDERS_PATH + "?" + query : ORDERS_PATH;
}

function customerLabel(row: AdminOrderRow): string {
  return row.customerName ?? row.customerEmail ?? "Guest";
}

function customerTitle(row: AdminOrderRow): string {
  return [row.customerName, row.customerEmail].filter(Boolean).join(" / ") || "Guest";
}

export function OrdersTable({
  rows: serverRows,
  total,
  page,
  pages,
  statusOptions,
}: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL landing is the end signal for every toolbar navigation.
  const paramsKey = searchParams.toString();
  useSettlePending(paramsKey);
  const [pending, startTransition] = useTransition();

  const rawStatus = searchParams.get("status") ?? "all";
  const status = statusOptions.some((option) => option.value === rawStatus) ? rawStatus : "all";
  const q = searchParams.get("q") ?? "";
  const filtered = Boolean(q) || status !== "all";
  // The URL keeps the truth; the select holds the new choice while the server streams.
  const [statusValue, setStatusValue] = useOptimistic(status);

  // The URL is the base; a slice change lands locally first so the badge and the
  // drawer agree with the tap instead of waiting for the round trip.
  const [rows, applySlice] = useOptimistic(
    serverRows,
    (state: AdminOrderRow[], change: SliceChange) =>
      state.map((row) => {
        if (row.id !== change.orderId) return row;
        const slices = row.slices.map((slice) =>
          slice.storeId === change.storeId ? { ...slice, status: change.status } : slice,
        );
        return { ...row, slices, status: orderStatus(slices.map((slice) => slice.status)) };
      }),
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<AdminOrderRow | null>(null);
  const [cancelFor, setCancelFor] = useState<AdminOrderRow | null>(null);

  const openRow = rows.find((row) => row.id === openId) ?? null;

  function write(href: string, replace: boolean) {
    startTransition(() => {
      beginPending();
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  function search(value: string) {
    write(ordersHref({ q: value, status, page: 1 }), true);
  }

  function filter(value: string) {
    startTransition(() => {
      beginPending();
      setStatusValue(value);
      router.push(ordersHref({ q, status: value, page: 1 }), { scroll: false });
    });
  }

  function goToPage(next: number) {
    write(ordersHref({ q, status, page: next }), false);
  }

  function clearFilters() {
    write(ORDERS_PATH, false);
  }

  function move(order: AdminOrderRow, storeId: string, to: SliceStatus, note?: string) {
    setError(null);
    startTransition(async () => {
      applySlice({ orderId: order.id, storeId, status: to });
      const result = await setFulfilmentStatus(order.token, to, note, storeId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCancelFor(null);
      router.refresh();
    });
  }

  function saveNote(order: AdminOrderRow, note: string) {
    setError(null);
    startTransition(async () => {
      const result = await addOrderNote(order.token, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNoteFor(null);
      router.refresh();
    });
  }

  function advance(row: AdminOrderRow) {
    if (row.slices.length !== 1) {
      setOpenId(row.id);
      return;
    }
    const slice = row.slices[0];
    if (!slice) return;
    const next = nextStatus(slice.status);
    if (next) move(row, slice.storeId, next);
  }

  return (
    <div className="flex flex-col gap-3">
      <TableToolbar
        value={q}
        onSearch={search}
        placeholder="Search reference or customer"
        filters={
          <select
            value={statusValue}
            onChange={(event) => filter(event.target.value)}
            aria-label="Filter by order status"
            className={SELECT_CLASS}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
        count={total}
        countLabel={total === 1 ? "order" : "orders"}
      />

      {error && !noteFor && !cancelFor ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ResultsRegion
        id="admin-orders-results"
        skeleton={<TableSkeleton rows={Math.max(rows.length, 1)} columns={7} />}
      >
        {rows.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {filtered
                ? "No orders match this view."
                : page > 1
                  ? "Nothing on this page."
                  : "No orders have been placed yet."}
            </p>
            {filtered ? (
              <Button type="button" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : page > 1 ? (
              <Button type="button" size="sm" onClick={() => goToPage(1)}>
                Back to page 1
              </Button>
            ) : null}
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-28 px-3 py-2 font-medium">
                      Reference
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Customer
                    </th>
                    <th scope="col" className="w-24 px-3 py-2 font-medium">
                      Date
                    </th>
                    <th scope="col" className="w-24 px-3 py-2 text-right font-medium">
                      Total
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Fulfilment
                    </th>
                    <th scope="col" className="w-28 px-3 py-2 font-medium">
                      Status
                    </th>
                    <th scope="col" className="w-12 px-3 py-2 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const canAdvance = row.slices.some(
                      (slice) => nextStatus(slice.status) !== null,
                    );
                    const cancellable = row.slices.filter((slice) => slice.status === "processing");

                    return (
                      <tr
                        key={row.id}
                        tabIndex={0}
                        onClick={() => setOpenId(row.id)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          setOpenId(row.id);
                        }}
                        className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            href={"/track/" + row.token}
                            onClick={(event) => event.stopPropagation()}
                            title={"Track " + (row.ref ?? row.token)}
                            className="font-mono text-xs text-foreground underline-offset-4 hover:underline"
                          >
                            {row.ref ?? row.token.slice(0, 8)}
                          </Link>
                        </td>

                        <td className="px-3 py-2.5">
                          <div
                            className="max-w-56 truncate text-muted-foreground"
                            title={customerTitle(row)}
                          >
                            {customerLabel(row)}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {row.placedOn}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-foreground">
                          {formatMoney(row.totalCents)}
                        </td>

                        <td className="px-3 py-2.5">
                          <FulfilmentSummary slices={row.slices} />
                        </td>

                        <td className="px-3 py-2.5">
                          <StatusBadge status={row.status} />
                        </td>

                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end">
                            <RowMenu
                              label={"Actions for order " + (row.ref ?? row.token)}
                              items={[
                                {
                                  label: "Advance fulfilment",
                                  icon: <ArrowRight />,
                                  onSelect: () => advance(row),
                                  disabled: !canAdvance,
                                },
                                {
                                  label: "Cancel slice",
                                  icon: <Ban />,
                                  destructive: true,
                                  onSelect: () => {
                                    setError(null);
                                    setCancelFor(row);
                                  },
                                  disabled: cancellable.length === 0,
                                },
                                {
                                  label: "Add note",
                                  icon: <StickyNote />,
                                  onSelect: () => {
                                    setError(null);
                                    setNoteFor(row);
                                  },
                                },
                                {
                                  label: "Open tracker",
                                  icon: <ExternalLink />,
                                  onSelect: () => router.push("/track/" + row.token),
                                  separatorBefore: true,
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </ResultsRegion>

      <Pagination page={page} pages={pages} scrollTargetId="admin-orders-results" />

      <EntityDrawer
        open={openRow !== null}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
        title={openRow ? (openRow.ref ?? openRow.token.slice(0, 8)) : "Order"}
        description={
          openRow
            ? "Placed " +
              openRow.placedOn +
              " · " +
              openRow.items.length +
              " line " +
              (openRow.items.length === 1 ? "item" : "items")
            : undefined
        }
        footer={
          openRow ? (
            <Button asChild variant="outline" className="w-full">
              <Link href={"/track/" + openRow.token}>Open tracker</Link>
            </Button>
          ) : null
        }
      >
        {openRow ? <OrderDetail row={openRow} /> : null}
      </EntityDrawer>

      <NoteDialog
        order={noteFor}
        pending={pending}
        error={error}
        onClose={() => {
          setNoteFor(null);
          setError(null);
        }}
        onConfirm={(note) => {
          if (noteFor) saveNote(noteFor, note);
        }}
      />

      <CancelSliceDialog
        order={cancelFor}
        pending={pending}
        error={error}
        onClose={() => {
          setCancelFor(null);
          setError(null);
        }}
        onConfirm={(storeId, reason) => {
          if (cancelFor) move(cancelFor, storeId, "cancelled", reason);
        }}
      />
    </div>
  );
}

/** Up to two store slices inline; past that the drawer carries the detail. */
function FulfilmentSummary({ slices }: { slices: AdminOrderSliceRow[] }) {
  if (slices.length === 0) {
    return <span className="text-xs text-muted-foreground">No slices</span>;
  }

  if (slices.length > 2) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title={slices.map((slice) => slice.storeName + " / " + slice.status).join("\n")}
      >
        {slices.length} stores
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {slices.map((slice) => (
        <div key={slice.storeId} className="flex items-center gap-1.5">
          <span className="max-w-32 truncate text-xs text-muted-foreground" title={slice.storeName}>
            {slice.storeName}
          </span>
          <StatusBadge status={slice.status} />
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "cancelled"
      ? "destructive"
      : status === "delivered" || status === "completed"
        ? "default"
        : "secondary";

  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

function OrderDetail({ row }: { row: AdminOrderRow }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={row.status} />
        <span className="text-xs text-muted-foreground">
          {row.slices.length} {row.slices.length === 1 ? "store" : "stores"} · {row.items.length}{" "}
          {row.items.length === 1 ? "line item" : "line items"}
        </span>
      </div>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buyer</h3>
        <p className="text-sm font-medium">{customerLabel(row)}</p>
        {row.customerName && row.customerEmail ? (
          <p className="text-sm text-muted-foreground">{row.customerEmail}</p>
        ) : null}
        {row.customerPhone ? (
          <p className="text-sm text-muted-foreground">{row.customerPhone}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">
          {row.address || "No delivery address was recorded."}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Line items
        </h3>
        {row.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {row.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{item.productName}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.optionSummary ? item.optionSummary + " · " : ""}
                    {item.storeName}
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  {item.quantity} × {formatMoney(item.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fulfilment
        </h3>
        {row.slices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No store fulfilments were recorded.</p>
        ) : (
          row.slices.map((slice) => (
            <div
              key={slice.storeId}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium" title={slice.storeName}>
                  {slice.storeName}
                </span>
                <StatusBadge status={slice.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {slice.itemCount} {slice.itemCount === 1 ? "item" : "items"}
              </p>
              <FulfilmentControls token={row.token} status={slice.status} storeId={slice.storeId} />
            </div>
          ))
        )}
      </section>

      <div className="flex items-baseline justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Order total</span>
        <span className="font-semibold tabular-nums">{formatMoney(row.totalCents)}</span>
      </div>
    </div>
  );
}

function NoteDialog({
  order,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  order: AdminOrderRow | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  return (
    <AlertDialog
      open={order !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        {order ? (
          <NoteForm
            key={order.id}
            order={order}
            pending={pending}
            error={error}
            onConfirm={onConfirm}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NoteForm({
  order,
  pending,
  error,
  onConfirm,
}: {
  order: AdminOrderRow;
  pending: boolean;
  error: string | null;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Add a note</AlertDialogTitle>
        <AlertDialogDescription>
          Internal note on {order.ref ?? order.token.slice(0, 8)}. Shoppers never see it.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="What happened?"
        aria-label="Note"
        autoFocus
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <Button
          type="button"
          disabled={pending || note.trim() === ""}
          onClick={() => onConfirm(note.trim())}
        >
          {pending ? "Saving..." : "Add note"}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

function CancelSliceDialog({
  order,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  order: AdminOrderRow | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (storeId: string, reason: string) => void;
}) {
  return (
    <AlertDialog
      open={order !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        {order ? (
          <CancelSliceForm
            key={order.id}
            order={order}
            pending={pending}
            error={error}
            onConfirm={onConfirm}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CancelSliceForm({
  order,
  pending,
  error,
  onConfirm,
}: {
  order: AdminOrderRow;
  pending: boolean;
  error: string | null;
  onConfirm: (storeId: string, reason: string) => void;
}) {
  const cancellable = order.slices.filter((slice) => slice.status === "processing");
  const [storeId, setStoreId] = useState("");
  const [reason, setReason] = useState("");

  const chosen = cancellable.some((slice) => slice.storeId === storeId)
    ? storeId
    : (cancellable[0]?.storeId ?? "");

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel this slice?</AlertDialogTitle>
        <AlertDialogDescription>
          The store&apos;s part of {order.ref ?? order.token.slice(0, 8)} is cancelled, stock goes
          back, and the shopper sees it. A reason is required.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {cancellable.length > 1 ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Store</span>
          <select
            value={chosen}
            onChange={(event) => setStoreId(event.target.value)}
            className={SELECT_CLASS}
          >
            {cancellable.map((slice) => (
              <option key={slice.storeId} value={slice.storeId}>
                {slice.storeName}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason for cancelling"
        aria-label="Reason for cancelling"
        autoFocus
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          disabled={pending || reason.trim() === ""}
          onClick={() => onConfirm(chosen, reason.trim())}
        >
          {pending ? "Cancelling..." : "Cancel slice"}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatMoney } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";

/** What the panel shows. Captured when the order is placed, so it survives the refresh. */
export type PlacedOrder = {
  ref: string;
  token: string;
  signedIn: boolean;
  totalCents: number;
  items: {
    id: string;
    productName: string;
    options: string | null;
    quantity: number;
    lineTotalCents: number;
  }[];
  delivery: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postal: string;
    country: string;
  };
};

function addressLine(delivery: PlacedOrder["delivery"]): string {
  return [
    delivery.line1,
    delivery.line2,
    [delivery.city, delivery.region, delivery.postal].filter(Boolean).join(", "),
    delivery.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * The order the shopper just placed. Stays on the checkout page: no redirect,
 * and the guest receipt link is the only way back, so it is shown in full.
 */
export function OrderSuccess({ order }: { order: PlacedOrder }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const receipt = "/orders/" + order.token;

  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copyReceipt() {
    if (reset.current !== null) clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(window.location.origin + receipt);
      setCopied("copied");
      // The label is feedback for this click, so the timer belongs to the handler.
      reset.current = setTimeout(() => setCopied("idle"), 2000);
    } catch {
      setCopied("failed");
    }
  }

  return (
    <section className="mt-8 flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-2 p-5">
        <CardTitle>Order placed</CardTitle>
        <p className="text-sm text-neutral-600">
          Thank you, {order.delivery.fullName}. The store prepares your order, then it ships.
        </p>
        <p className="text-sm text-neutral-600">
          Order reference{" "}
          <span className="font-mono font-medium text-neutral-900">{order.ref}</span>
        </p>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <CardTitle className="text-sm font-medium text-neutral-600">What you ordered</CardTitle>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium break-words text-neutral-900">
                  {item.productName}
                </span>
                {item.options ? (
                  <span className="block text-xs text-neutral-500">{item.options}</span>
                ) : null}
                <span className="block text-xs text-neutral-500">Quantity {item.quantity}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap font-medium text-neutral-900">
                {formatMoney(item.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-3 border-t border-neutral-200 pt-3 text-sm">
          <span className="text-neutral-600">Total</span>
          <span className="font-semibold">{formatMoney(order.totalCents)}</span>
        </div>
        <p className="text-xs text-neutral-500">No payment was taken.</p>
      </Card>

      <Card className="flex flex-col gap-1 p-5">
        <CardTitle className="text-sm font-medium text-neutral-600">Delivering to</CardTitle>
        <p className="text-sm font-medium break-words text-neutral-900">
          {order.delivery.fullName}
        </p>
        <p className="text-sm text-neutral-600">{order.delivery.phone}</p>
        <p className="text-sm break-words text-neutral-600">{addressLine(order.delivery)}</p>
      </Card>

      {order.signedIn ? null : (
        <Card className="flex flex-col gap-3 p-5">
          <CardTitle className="text-sm font-medium text-neutral-600">Your receipt link</CardTitle>
          <p className="text-sm text-neutral-600">
            This link is the only way back to this order, so keep it somewhere safe.
          </p>
          <code className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs break-all text-neutral-700">
            {receipt}
          </code>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={copyReceipt}
              className="w-full sm:w-auto"
            >
              {copied === "copied" ? "Copied" : "Copy link"}
            </Button>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={receipt}>View receipt</Link>
            </Button>
          </div>
          {copied === "failed" ? (
            <p className="text-xs text-red-600">Copy failed. Select the link and copy it.</p>
          ) : null}
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {order.signedIn ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={"/track/" + order.token}>Track this order</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href="/">Keep shopping</Link>
        </Button>
      </div>
    </section>
  );
}

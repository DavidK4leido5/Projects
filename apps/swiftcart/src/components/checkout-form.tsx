"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentProps, type FormEvent } from "react";
import { formatMoney } from "@repo/shared";
import { Button, Card, CardTitle, Input, Label } from "@repo/ui";
import { OrderSuccess, type PlacedOrder } from "@/components/order-success";
import { placeOrder } from "@/features/orders/actions";

export type DeliveryAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal: string;
  country: string;
};

/** One cart line, as the form and the success panel both need it. */
export type CheckoutItem = {
  id: string;
  productName: string;
  storeName: string;
  options: Record<string, string>;
  priceCents: number;
  quantity: number;
};

function optionLine(options: Record<string, string>): string | null {
  const entries = Object.entries(options);
  if (entries.length === 0) return null;
  return entries.map(([name, value]) => name + ": " + value).join(", ");
}

function Field({ label, ...props }: { label: string } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} {...props} />
    </div>
  );
}

/** The details the shopper submitted, for the panel. Validation stays on the server. */
function addressFrom(formData: FormData): DeliveryAddress {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    fullName: text("fullName"),
    phone: text("phone"),
    line1: text("line1"),
    line2: text("line2") || null,
    city: text("city"),
    region: text("region") || null,
    postal: text("postal"),
    country: text("country") || "PH",
  };
}

/**
 * Delivery details plus the submit. When the shopper already has a saved
 * address the form collapses to one confirm button, posting the saved values
 * back as hidden fields so the action has a single input shape.
 *
 * The page renders this even with an empty cart, so the success panel keeps its
 * state when the refresh that clears the cart lands. A failure only sets the
 * error, so the fields keep what was typed.
 */
export function CheckoutForm({
  saved,
  guest,
  items,
  totalCents,
  itemCount,
}: {
  saved: DeliveryAddress | null;
  guest: boolean;
  items: CheckoutItem[];
  totalCents: number;
  itemCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const delivery = addressFrom(formData);
    setError(null);

    start(async () => {
      const result = await placeOrder(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Render the panel from what we already hold, before the refresh lands.
      setPlaced({
        ref: result.ref,
        token: result.token,
        signedIn: !guest,
        totalCents,
        delivery,
        items: items.map((item) => ({
          id: item.id,
          productName: item.productName,
          options: optionLine(item.options),
          quantity: item.quantity,
          lineTotalCents: item.priceCents * item.quantity,
        })),
      });
      router.refresh();
    });
  }

  if (placed) return <OrderSuccess order={placed} />;

  if (items.length === 0) {
    return (
      <Card className="mt-8 flex flex-col items-start gap-3 p-5">
        <CardTitle>Your cart is empty</CardTitle>
        <p className="text-sm text-neutral-600">Add something to the cart before checking out.</p>
        <Button asChild variant="secondary">
          <Link href="/">Browse the shop</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-[1fr_20rem] md:items-start">
      <Card className="flex flex-col gap-4 p-5">
        <CardTitle>Delivery</CardTitle>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {saved ? (
            <>
              {Object.entries(saved).map(([name, value]) =>
                value ? <input key={name} type="hidden" name={name} value={value} /> : null,
              )}
              <Card className="flex flex-col gap-1 border-neutral-200 bg-neutral-50 p-4">
                <CardTitle className="text-sm">{saved.fullName}</CardTitle>
                <p className="text-sm text-neutral-600">{saved.phone}</p>
                <p className="text-sm text-neutral-600">
                  {[saved.line1, saved.line2, saved.city, saved.region, saved.postal, saved.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </Card>
            </>
          ) : (
            <>
              <Field label="Full name" name="fullName" required minLength={2} autoComplete="name" />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
              />
              <Field
                label="Street address"
                name="line1"
                required
                minLength={4}
                autoComplete="address-line1"
              />
              <Field
                label="Apartment, suite, etc. (optional)"
                name="line2"
                autoComplete="address-line2"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="City"
                  name="city"
                  required
                  minLength={2}
                  autoComplete="address-level2"
                />
                <Field label="Region (optional)" name="region" autoComplete="address-level1" />
                <Field
                  label="Postal code"
                  name="postal"
                  required
                  minLength={3}
                  autoComplete="postal-code"
                />
                <Field
                  label="Country"
                  name="country"
                  required
                  defaultValue="PH"
                  autoComplete="country-name"
                />
              </div>
            </>
          )}

          {error ? (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Placing order..." : "Place order"}
          </Button>
          <p className="text-xs text-neutral-500">
            No payment is taken. Placing the order reserves the stock.
          </p>
        </form>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <CardTitle className="text-sm font-medium text-neutral-600">Order summary</CardTitle>
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const options = optionLine(item.options);
            return (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-neutral-900">
                    {item.productName}
                  </span>
                  {options ? (
                    <span className="block text-xs text-neutral-500">{options}</span>
                  ) : null}
                  <span className="block text-xs text-neutral-500">{item.storeName}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-neutral-600">
                  {item.quantity} × {formatMoney(item.priceCents)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-baseline justify-between gap-3 border-t border-neutral-200 pt-3 text-sm">
          <span className="text-neutral-600">Total</span>
          <span className="font-semibold">{formatMoney(totalCents)}</span>
        </div>
        <p className="text-xs text-neutral-500">
          {itemCount} {itemCount === 1 ? "item" : "items"}. No payment is taken.
        </p>
      </Card>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentProps, type FormEvent } from "react";
import { Button, Card, CardTitle, Input, Label } from "@repo/ui";
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

function Field({ label, ...props }: { label: string } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} {...props} />
    </div>
  );
}

/**
 * Delivery details plus the submit. When the shopper already has a saved
 * address the form collapses to one confirm button, posting the saved values
 * back as hidden fields so the action has a single input shape.
 */
export function CheckoutForm({ saved }: { saved: DeliveryAddress | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    start(async () => {
      const result = await placeOrder(formData);
      if (result.ok) {
        router.push("/orders/" + result.token);
        return;
      }
      setError(result.error);
    });
  }

  return (
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
            <Field label="City" name="city" required minLength={2} autoComplete="address-level2" />
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
  );
}

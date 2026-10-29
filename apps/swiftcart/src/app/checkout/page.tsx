import { Suspense } from "react";
import Link from "next/link";
import { formatMoney } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";
import { getCart } from "@/features/cart/queries";
import { getSavedAddress } from "@/features/orders/queries";
import { CheckoutForm, type DeliveryAddress } from "@/components/checkout-form";
import { PageSkeleton } from "@/components/skeletons";
import { getActor } from "@/lib/auth/guards";
import { getCartId } from "@/lib/cart";

export const metadata = { title: "Checkout" };

function optionLine(options: Record<string, string>): string | null {
  const entries = Object.entries(options);
  if (entries.length === 0) return null;
  return entries.map(([name, value]) => name + ": " + value).join(", ");
}

async function CheckoutBody() {
  const cart = await getCart(await getCartId());
  const actor = await getActor();

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        </div>
        <Card className="mt-8 flex flex-col items-start gap-3 p-5">
          <CardTitle>Your cart is empty</CardTitle>
          <p className="text-sm text-neutral-600">Add something to the cart before checking out.</p>
          <Link href="/">
            <Button variant="secondary">Browse the shop</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const saved: DeliveryAddress | null =
    actor.kind === "user" ? await getSavedAddress(actor.profile.id) : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-neutral-600">
          {actor.kind === "anonymous"
            ? "You can order as a guest. Keep the order link it gives you, because that is the only way back to it."
            : "Confirm the delivery details and place the order."}
        </p>
        {actor.kind === "anonymous" ? (
          <p className="text-sm text-neutral-600">
            <Link href="/login" className="underline underline-offset-4 hover:text-neutral-900">
              Log in instead
            </Link>{" "}
            to use a saved address.
          </p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_20rem] md:items-start">
        <Card className="flex flex-col gap-4 p-5">
          <CardTitle>Delivery</CardTitle>
          <CheckoutForm saved={saved} />
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle className="text-sm font-medium text-neutral-600">Order summary</CardTitle>
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => {
              const options = optionLine(item.variantOptions);
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
            <span className="font-semibold">{formatMoney(cart.totalCents)}</span>
          </div>
          <p className="text-xs text-neutral-500">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}. No payment is taken.
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutBody />
    </Suspense>
  );
}

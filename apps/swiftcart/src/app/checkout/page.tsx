import { Suspense } from "react";
import Link from "next/link";
import { getCart } from "@/features/cart/queries";
import { getSavedAddress } from "@/features/orders/queries";
import { CheckoutForm, type CheckoutItem, type DeliveryAddress } from "@/components/checkout-form";
import { PageSkeleton } from "@/components/skeletons";
import { getActor } from "@/lib/auth/guards";
import { getCartId } from "@/lib/cart";

export const metadata = { title: "Checkout" };

/**
 * The form, the summary, and the panel that replaces them are one client
 * component so that placing an order keeps its state when the refresh that
 * empties the cart arrives. The cart is handed down as plain data.
 */
async function CheckoutBody() {
  const cart = await getCart(await getCartId());
  const actor = await getActor();

  const saved: DeliveryAddress | null =
    actor.kind === "user" ? await getSavedAddress(actor.profile.id) : null;

  const items: CheckoutItem[] = cart.items.map((item) => ({
    id: item.id,
    productName: item.productName,
    storeName: item.storeName,
    options: item.variantOptions,
    priceCents: item.priceCents,
    quantity: item.quantity,
  }));

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

      <CheckoutForm
        saved={saved}
        guest={actor.kind === "anonymous"}
        items={items}
        totalCents={cart.totalCents}
        itemCount={cart.itemCount}
      />
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

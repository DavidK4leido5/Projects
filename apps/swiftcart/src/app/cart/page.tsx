import { Suspense } from "react";
import Link from "next/link";
import { formatMoney } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";
import { getCartId } from "@/lib/cart";
import { getCart } from "@/features/cart/queries";
import { CartLine } from "@/components/cart-line";
import { PageSkeleton } from "@/components/skeletons";

export const metadata = { title: "Cart" };

async function CartPageBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const cartId = await getCartId();
  const cart = await getCart(cartId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="text-sm text-neutral-600">
          Your cart is saved as you shop. Sign in and it follows you across devices.
        </p>
      </div>

      {error === "stock" ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          Someone bought the last of something while this order was forming. Nothing was charged.
          Adjust the quantities and try again.
        </p>
      ) : null}

      {cart.items.length === 0 ? (
        <Card className="mt-8 flex flex-col items-start gap-3 p-5">
          <CardTitle>Your cart is empty</CardTitle>
          <p className="text-sm text-neutral-600">
            Nothing here yet. Browse the shop and add something you like.
          </p>
          <Link href="/">
            <Button variant="secondary">Back to the shop</Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_20rem] md:items-start">
          <ul className="flex flex-col gap-4">
            {cart.items.map((item) => (
              <CartLine key={item.id} item={item} />
            ))}
          </ul>

          <Card className="flex flex-col gap-3 p-5">
            <CardTitle className="text-sm font-medium text-neutral-600">Summary</CardTitle>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-semibold">{formatMoney(cart.totalCents)}</span>
            </div>
            <p className="text-xs text-neutral-500">
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} in the cart.
            </p>
            <Button asChild className="w-full">
              <Link href="/checkout">Checkout</Link>
            </Button>
            <p className="text-xs text-neutral-500">
              No payment is taken. Placing an order reserves the stock.
            </p>
          </Card>
        </div>
      )}
    </main>
  );
}

export default function CartPage(props: Parameters<typeof CartPageBody>[0]) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CartPageBody {...props} />
    </Suspense>
  );
}

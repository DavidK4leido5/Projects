import Image from "next/image";
import { Suspense } from "react";
import Link from "next/link";
import { formatMoney } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";
import { getCart } from "@/features/cart/queries";
import { removeFromCart, setQuantity } from "@/features/cart/actions";
import { placeOrder } from "@/features/orders/actions";
import { requireUser } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

export const metadata = { title: "Cart" };

async function CartPageBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const actor = await requireUser();
  const cart = await getCart(actor.profile.id);

  const oversold = cart.items.filter((item) => item.quantity > item.stock);
  const blocked = oversold.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="text-sm text-neutral-600">
          Saved to your account. Sign in on another device and it is still here.
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
        <Card className="mt-8 flex flex-col items-start gap-3">
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
              <li key={item.id}>
                <Card className="flex flex-wrap items-center gap-4">
                  <Link href={`/products/${item.productSlug}`} className="shrink-0">
                    {(item.variantImageKey ?? item.coverKey) ? (
                      <Image
                        src={item.variantImageKey ?? item.coverKey ?? ""}
                        alt={item.productName}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-md border border-neutral-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md bg-neutral-100 text-lg text-neutral-400">
                        {item.productName.charAt(0)}
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="truncate text-sm font-semibold tracking-tight underline-offset-4 hover:underline"
                    >
                      {item.productName}
                    </Link>
                    <span className="text-xs text-neutral-500">{item.storeName}</span>
                    {Object.keys(item.variantOptions).length > 0 ? (
                      <span className="text-xs text-neutral-600">
                        {Object.entries(item.variantOptions)
                          .map(([name, value]) => name + ": " + value)
                          .join(" · ")}
                      </span>
                    ) : null}
                    <span className="text-xs text-neutral-500">
                      {formatMoney(item.priceCents)} each, {item.stock} in stock
                    </span>
                    {item.quantity > item.stock ? (
                      <span className="text-xs text-red-600">
                        Only {item.stock} left. Lower the quantity to keep it.
                      </span>
                    ) : null}
                  </div>

                  <form action={setQuantity} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                      Quantity
                      <input
                        name="quantity"
                        type="number"
                        min={1}
                        max={Math.max(item.stock, 1)}
                        defaultValue={item.quantity}
                        className="w-16 rounded-md border border-neutral-200 px-2 py-1.5 text-sm text-neutral-900"
                      />
                    </label>
                    <Button variant="secondary" type="submit" className="px-2 py-1.5">
                      Update
                    </Button>
                  </form>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">
                      {formatMoney(item.priceCents * item.quantity)}
                    </span>
                    <form action={removeFromCart}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button variant="ghost" type="submit" className="px-2 py-1">
                        Remove
                      </Button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="flex flex-col gap-3">
            <CardTitle className="text-sm font-medium text-neutral-600">Summary</CardTitle>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-semibold">{formatMoney(cart.totalCents)}</span>
            </div>
            <p className="text-xs text-neutral-500">
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} in the cart.
            </p>
            <form action={placeOrder}>
              <Button type="submit" disabled={blocked} className="w-full">
                Place order
              </Button>
            </form>
            <p className="text-xs text-neutral-500">
              No payment is taken. Placing an order reserves the stock and records it in your
              account.
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

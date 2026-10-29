import Link from "next/link";
import { formatMoney } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";
import { getCart } from "@/features/cart/queries";
import { removeFromCart, setQuantity } from "@/features/cart/actions";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const actor = await requireUser();
  const cart = await getCart(actor.profile.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="text-sm text-neutral-600">
          Saved to your account. Sign in on another device and it is still here.
        </p>
      </div>

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
                    {item.imageKey ? (
                      <img
                        src={`/api/images/${item.imageKey}`}
                        alt={item.productName}
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
                    <span className="text-xs text-neutral-500">
                      {formatMoney(item.priceCents)} each
                    </span>
                  </div>

                  <form action={setQuantity} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <label className="flex flex-col gap-1 text-xs text-neutral-500">
                      Quantity
                      <input
                        type="number"
                        name="quantity"
                        min={1}
                        max={99}
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
            <Button variant="secondary" disabled>
              Checkout is out of scope for this demo
            </Button>
          </Card>
        </div>
      )}
    </main>
  );
}

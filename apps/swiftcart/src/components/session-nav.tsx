import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { getActor } from "@/lib/auth/guards";
import { getCartId } from "@/lib/cart";
import { cartCount } from "@/features/cart/queries";

/** The only cookie-bound piece of the header. Always rendered inside Suspense. */
export async function SessionNav() {
  const actor = await getActor();
  const count = await cartCount(await getCartId());

  return (
    <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
      <Link
        href="/cart"
        aria-label={count === 1 ? "Cart, 1 item" : "Cart, " + count + " items"}
        className="relative grid h-9 w-9 place-items-center rounded-md text-neutral-700 transition-colors hover:bg-neutral-100"
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] leading-4 text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>

      {actor.kind === "anonymous" ? (
        <>
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Sign up
          </Link>
        </>
      ) : (
        <>
          {actor.kind === "admin" ? (
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-neutral-100"
            >
              Admin
            </Link>
          ) : null}
          {actor.kind === "store" ? (
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-neutral-100"
            >
              Dashboard
            </Link>
          ) : null}
          {actor.kind === "user" ? (
            <Link
              href="/orders"
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-neutral-100"
            >
              Orders
            </Link>
          ) : null}
          <SignOutButton />
        </>
      )}
    </nav>
  );
}

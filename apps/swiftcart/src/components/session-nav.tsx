import Link from "next/link";
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
        className="whitespace-nowrap rounded-md px-2 py-1.5 text-neutral-700 transition-colors hover:bg-neutral-100 sm:px-3"
      >
        Cart ({count})
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

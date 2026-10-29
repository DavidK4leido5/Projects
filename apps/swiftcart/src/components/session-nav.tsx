import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { getActor } from "@/lib/auth/guards";

/** The only cookie-bound piece of the header. Always rendered inside Suspense. */
export async function SessionNav() {
  const actor = await getActor();

  return (
    <nav className="ml-auto flex items-center gap-2 text-sm">
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
            <>
              <Link
                href="/orders"
                className="rounded-md px-3 py-1.5 transition-colors hover:bg-neutral-100"
              >
                Orders
              </Link>
              <Link
                href="/cart"
                className="rounded-md px-3 py-1.5 transition-colors hover:bg-neutral-100"
              >
                Cart
              </Link>
            </>
          ) : null}
          <SignOutButton />
        </>
      )}
    </nav>
  );
}

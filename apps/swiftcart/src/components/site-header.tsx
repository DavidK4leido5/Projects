import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { getActor } from "@/lib/auth/guards";
import { listStoreFacets } from "@/features/catalog/queries";

export async function SiteHeader() {
  const [actor, facets] = await Promise.all([getActor(), listStoreFacets()]);

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight">
          SwiftCart
        </Link>

        <form action="/" role="search" className="relative hidden flex-1 md:block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path
                d="m16 16 4.5 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            name="q"
            type="search"
            placeholder="Search products or stores"
            aria-label="Search products or stores"
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white"
          />
        </form>

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
      </div>

      <div className="border-t border-neutral-100 md:hidden">
        <form action="/" role="search" className="mx-auto max-w-6xl px-4 py-2">
          <input
            name="q"
            type="search"
            placeholder="Search products or stores"
            aria-label="Search products or stores"
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white"
          />
        </form>
      </div>

      <div className="border-t border-neutral-100">
        <div className="mx-auto flex h-11 max-w-6xl items-center gap-5 overflow-x-auto px-4 text-sm text-neutral-600">
          <Link href="/" className="font-medium text-neutral-900">
            All products
          </Link>
          {facets.map((facet) => (
            <Link
              key={facet.slug}
              href={"/?store=" + facet.slug}
              className="whitespace-nowrap transition-colors hover:text-neutral-900"
            >
              {facet.name}
            </Link>
          ))}
          <span className="ml-auto hidden whitespace-nowrap text-neutral-500 sm:block">
            {facets.reduce((sum, facet) => sum + facet.productCount, 0)} products listed
          </span>
        </div>
      </div>
    </header>
  );
}

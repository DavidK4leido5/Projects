import Link from "next/link";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/catalog-search";
import { SessionNav } from "@/components/session-nav";
import { SessionNavSkeleton } from "@/components/skeletons";
import { listStoreFacets } from "@/features/catalog/queries";

/** Same box at the same size, so the header does not shift when the input hydrates. */
function SearchFallback({ variant }: { variant: "desktop" | "mobile" }) {
  return (
    <div
      className={
        variant === "desktop" ? "relative hidden flex-1 md:block" : "mx-auto max-w-6xl px-4 py-2"
      }
    >
      <div className="h-[38px] w-full animate-pulse rounded-full border border-neutral-200 bg-neutral-100" />
    </div>
  );
}

/**
 * Static shell. The only cookie-bound part is SessionNav, suspended so the rest
 * of the header stays prerenderable.
 */
export async function SiteHeader() {
  const facets = await listStoreFacets();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight">
          SwiftCart
        </Link>

        <Suspense fallback={<SearchFallback variant="desktop" />}>
          <CatalogSearch variant="desktop" />
        </Suspense>

        <Suspense fallback={<SessionNavSkeleton />}>
          <SessionNav />
        </Suspense>
      </div>

      <div className="border-t border-neutral-100 md:hidden">
        <Suspense fallback={<SearchFallback variant="mobile" />}>
          <CatalogSearch variant="mobile" />
        </Suspense>
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

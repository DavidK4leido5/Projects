import Link from "next/link";
import { SearchX } from "lucide-react";

/** Compact catalogue result fallback. Owns the pagination scroll target. */
export function EmptyState({ description }: { description: string }) {
  return (
    <div
      id="catalogue-results"
      className="mt-6 flex min-h-[20rem] scroll-mt-24 items-center justify-center sm:min-h-[24rem]"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-10 text-center">
        <SearchX className="h-8 w-8 text-neutral-400" aria-hidden="true" />
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">
          No products found
        </h2>
        <p className="max-w-md text-sm text-neutral-600">{description}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Clear filters
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-600 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
          >
            Browse everything
          </Link>
        </div>
      </div>
    </div>
  );
}

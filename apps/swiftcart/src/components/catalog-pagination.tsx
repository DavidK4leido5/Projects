"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { catalogueHref, readCatalogueParams, withCatalogueParam } from "@/lib/search-params";

const BUTTON_CLASS =
  "rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200";

export function CatalogPagination({ page, pages }: { page: number; pages: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(to: number) {
    const next = withCatalogueParam(readCatalogueParams(searchParams), "page", String(to));
    startTransition(() => {
      router.replace(catalogueHref(next), { scroll: false });
      requestAnimationFrame(() => {
        document.getElementById("catalogue-results")?.scrollIntoView({ block: "start" });
      });
    });
  }

  return (
    <nav
      aria-label="Pagination"
      aria-busy={pending}
      className="mt-8 flex items-center justify-between gap-3 border-t border-neutral-200 pt-5"
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className={BUTTON_CLASS}
      >
        Previous
      </button>

      <span className="text-xs tabular-nums text-neutral-500">
        Page {page} of {pages}
      </span>

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= pages}
        className={BUTTON_CLASS}
      >
        Next
      </button>
    </nav>
  );
}

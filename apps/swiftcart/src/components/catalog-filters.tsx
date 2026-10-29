"use client";

import { useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import {
  SORT_OPTIONS,
  catalogueHref,
  readCatalogueParams,
  withCatalogueParam,
  type CatalogueParams,
} from "@/lib/search-params";
import { beginPending } from "@/lib/navigation-pending";
import { useOptimisticParams } from "@/lib/use-optimistic-params";

const SELECT_CLASS =
  "rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900";

type StoreOption = { slug: string; name: string };

export function CatalogFilters({
  stores,
  categories,
  filtered,
}: {
  stores: StoreOption[];
  categories: string[];
  filtered: boolean;
}) {
  const searchParams = useSearchParams();
  // The URL is the base; the optimistic value keeps the controls on the new
  // choice while the server streams and falls back to the URL on back/forward.
  const [params, setParams] = useOptimistic<CatalogueParams>(readCatalogueParams(searchParams));
  const [, startTransition] = useTransition();
  const { navigate, pending } = useOptimisticParams();

  const sort = SORT_OPTIONS.find((option) => option.value === params.sort)?.value ?? "new";

  function apply(key: keyof CatalogueParams, value: string | undefined) {
    const next = withCatalogueParam(params, key, value);
    // Re-picking what is already shown would raise a skeleton no URL change can
    // clear.
    if (catalogueHref(next) === catalogueHref(params)) return;
    // Raise the skeleton on the event's own frame. Inside startTransition React
    // is free to schedule the store update a frame later, and the budget is one.
    beginPending();
    startTransition(() => {
      setParams(next);
      navigate(next, "push");
    });
  }

  function clear() {
    beginPending();
    startTransition(() => {
      setParams({});
      navigate({}, "push");
    });
  }

  return (
    <div
      role="group"
      aria-label="Catalogue filters"
      aria-busy={pending}
      className="mt-4 flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-4"
    >
      <label className="flex items-center gap-2 text-xs text-neutral-600">
        Store
        <select
          value={params.store ?? ""}
          onChange={(event) => apply("store", event.target.value || undefined)}
          className={SELECT_CLASS}
        >
          <option value="">All stores</option>
          {stores.map((store) => (
            <option key={store.slug} value={store.slug}>
              {store.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-neutral-600">
        Category
        <select
          value={params.category ?? ""}
          onChange={(event) => apply("category", event.target.value || undefined)}
          className={SELECT_CLASS}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-neutral-600">
        Sort
        <select
          value={sort}
          onChange={(event) => apply("sort", event.target.value)}
          className={SELECT_CLASS}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={params.stock === "in"}
          onChange={(event) => apply("stock", event.target.checked ? "in" : undefined)}
          className="h-3.5 w-3.5 rounded border-neutral-200"
        />
        In stock only
      </label>

      {filtered ? (
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            clear();
          }}
          // Keep focus where it is: a clicked anchor would otherwise take it
          // from the header search box.
          onMouseDown={(event) => event.preventDefault()}
          className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          Clear
        </a>
      ) : null}
    </div>
  );
}

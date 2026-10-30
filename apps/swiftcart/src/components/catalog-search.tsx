"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useDebouncedSearchField } from "@/lib/hooks";
import { CATALOGUE_PATH, readCatalogueParams } from "@/lib/search-params";
import { useOptimisticParams } from "@/lib/use-optimistic-params";

const DEBOUNCE_MS = 300;

const INPUT_CLASS = {
  desktop:
    "w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white",
  mobile:
    "w-full rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white",
} as const;

/**
 * URL-driven catalogue search. The input owns its own value while the shopper
 * types, so results streaming in never remount it or move the caret.
 */
export function CatalogSearch({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const { navigate, pending } = useOptimisticParams();

  function go(next: string) {
    const onCatalogue = pathname === CATALOGUE_PATH;
    if (onCatalogue && next === urlQuery) return;
    navigate(
      { ...readCatalogueParams(searchParams), q: next || undefined, page: undefined },
      onCatalogue ? "replace" : "push",
    );
  }

  const {
    input,
    setInput,
    flush,
    pending: settling,
  } = useDebouncedSearchField({
    value: urlQuery,
    onCommit: go,
    delay: DEBOUNCE_MS,
  });

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    flush();
  }

  const desktop = variant === "desktop";

  return (
    <div
      role="search"
      className={desktop ? "relative hidden flex-1 md:block" : "mx-auto max-w-6xl px-4 py-2"}
    >
      {desktop ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      ) : null}
      <input
        name="q"
        type="search"
        value={input}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Search products or stores"
        aria-label="Search products or stores"
        aria-busy={pending || settling}
        className={desktop ? INPUT_CLASS.desktop : INPUT_CLASS.mobile}
      />
    </div>
  );
}

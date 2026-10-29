"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { CATALOGUE_PATH, catalogueHref, readCatalogueParams } from "@/lib/search-params";

const DEBOUNCE_MS = 300;

const INPUT_CLASS = {
  desktop:
    "w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white",
  mobile:
    "w-full rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 focus:bg-white",
} as const;

/** Runs `onSettle` once typing pauses; `cancel` drops a pending run. */
function useDebounced(onSettle: (value: string) => void, delay: number) {
  const latest = useRef(onSettle);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = onSettle;
  }, [onSettle]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  return {
    schedule(value: string) {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        latest.current(value);
      }, delay);
    },
    cancel() {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    },
  };
}

/**
 * URL-driven catalogue search. The input owns its own value while the shopper
 * types, so results streaming in never remount it or move the caret.
 */
export function CatalogSearch({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [value, setValue] = useState(urlQuery);
  const [pending, startTransition] = useTransition();
  const typing = useRef(false);

  // The URL wins unless the shopper is typing. Once their value reaches the URL
  // they are in sync again, so a later back button or clear can move the box.
  useEffect(() => {
    if (typing.current) {
      if (urlQuery === value) typing.current = false;
      return;
    }
    setValue(urlQuery);
  }, [urlQuery, value]);

  function go(next: string) {
    if (pathname === CATALOGUE_PATH) {
      if (next === urlQuery) return;
      startTransition(() => {
        router.replace(
          catalogueHref({ ...readCatalogueParams(searchParams), q: next, page: undefined }),
          { scroll: false },
        );
      });
      return;
    }
    startTransition(() => {
      router.push(catalogueHref({ q: next }));
    });
  }

  const debounce = useDebounced(go, DEBOUNCE_MS);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    typing.current = true;
    setValue(next);
    debounce.schedule(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    debounce.cancel();
    go(value);
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
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Search products or stores"
        aria-label="Search products or stores"
        aria-busy={pending}
        className={desktop ? INPUT_CLASS.desktop : INPUT_CLASS.mobile}
      />
    </div>
  );
}

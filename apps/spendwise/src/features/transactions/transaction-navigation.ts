"use client";

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

const PAGE_KEYS = ["q", "type", "account", "category", "from", "to", "sort", "page"] as const;

/**
 * One canonical transactions URL. Search, filters and the pager all build
 * through here so the pending check can compare strings, empty values drop
 * their parameter, and the default sort never shows up.
 */
export function transactionsHref(
  params: { get(name: string): string | null },
  patch: Record<string, string | null> = {},
): string {
  const query = new URLSearchParams();
  for (const key of PAGE_KEYS) {
    const value = Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] : params.get(key);
    if (!value) continue;
    if (key === "sort" && value === "date_desc") continue;
    if (key === "page" && value === "1") continue;
    query.set(key, value);
  }
  const search = query.toString();
  return search ? "/transactions?" + search : "/transactions";
}

let target: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Marks a navigation in flight; it clears itself once the URL catches up. */
export function beginNavigation(href: string) {
  target = href;
  if (timer) clearTimeout(timer);
  // ponytail: a dropped navigation would pin the spinner forever, so it self-clears.
  timer = setTimeout(() => {
    timer = null;
    target = null;
    emit();
  }, 10_000);
  emit();
}

/**
 * True while a transactions navigation is in flight. The target is compared
 * with the current URL, so the flag falls away on commit without an effect.
 * The match also retires the target: a stale one would light up on Back.
 */
export function useNavigationPending(): boolean {
  const params = useSearchParams();
  const current = transactionsHref(params);
  return useSyncExternalStore(
    subscribe,
    () => {
      if (target !== null && target === current) {
        target = null;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        return false;
      }
      return target !== null;
    },
    () => false,
  );
}

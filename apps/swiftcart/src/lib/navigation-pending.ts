"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * A pager and the results it replaces live in different components, on either
 * side of a server boundary. Module state is the smallest thing they can share:
 * the pager calls beginPending(), the results region reads the boolean.
 */

const PENDING_TIMEOUT_MS = 10_000;

let pendingSince: number | null = null;
let timeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function clearTimer(): void {
  if (timeout !== null) {
    clearTimeout(timeout);
    timeout = null;
  }
}

/**
 * Marks a navigation as in flight. The timestamp is kept so a navigation that
 * never lands cannot leave a permanent skeleton: the timer clears it after 10s.
 */
export function beginPending(): void {
  pendingSince = Date.now();
  clearTimer();
  timeout = setTimeout(() => {
    timeout = null;
    pendingSince = null;
    emit();
  }, PENDING_TIMEOUT_MS);
  emit();
}

/** The URL landed (or gave up); drop the skeleton. */
export function endPending(): void {
  clearTimer();
  if (pendingSince === null) return;
  pendingSince = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return pendingSince !== null;
}

/** The server never has a navigation in flight, so it renders the real list. */
function getServerSnapshot(): boolean {
  return false;
}

export function useNavigationPending(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
/**
 * Drops the pending flag once the URL the navigation asked for is the URL in
 * use. One hook instead of the same effect copied into every table.
 */
export function useSettlePending(key: string): void {
  useEffect(() => {
    endPending();
  }, [key]);
}

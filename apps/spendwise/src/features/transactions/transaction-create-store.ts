"use client";

import { useSyncExternalStore } from "react";
import type { TransactionRow } from "@/features/transactions/queries";

type Entry = { key: string; row: TransactionRow };

const PENDING_TTL = 15_000;
const EMPTY: TransactionRow[] = [];
const listeners = new Set<() => void>();

let entries: Entry[] = [];
let rows: TransactionRow[] = EMPTY;

function publish() {
  rows = entries.map((entry) => entry.row);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The quick-add dialog closes before the server answers, so its row is
 * published here and the table renders it straight away. The server row wins
 * by id once it arrives; the entry also expires because a page or filter that
 * does not contain the new row would otherwise keep it forever.
 */
export function publishPendingTransaction(row: TransactionRow) {
  const key = row.id;
  entries = [{ key, row }, ...entries.filter((entry) => entry.key !== key)].slice(0, 10);
  publish();
  // ponytail: fixed expiry, no reconciliation callback. The table hides the
  // row the moment the server returns the same id.
  setTimeout(() => removePendingTransaction(key), PENDING_TTL);
}

/** Swaps the temporary id for the id the server assigned. */
export function rekeyPendingTransaction(key: string, id: string) {
  entries = entries.map((entry) =>
    entry.key === key ? { ...entry, row: { ...entry.row, id } } : entry,
  );
  publish();
}

export function removePendingTransaction(key: string) {
  entries = entries.filter((entry) => entry.key !== key);
  publish();
}

/** Newest first. The table hides any id the server already returned. */
export function usePendingTransactions(): TransactionRow[] {
  return useSyncExternalStore(
    subscribe,
    () => rows,
    () => EMPTY,
  );
}

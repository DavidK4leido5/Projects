"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { Button, Input } from "@repo/ui";
import { useDebouncedValue } from "@/lib/hooks";
import {
  beginNavigation,
  transactionsHref,
  useNavigationPending,
} from "@/features/transactions/transaction-navigation";

type Option = { id: string; name: string };

export type TransactionFilterValues = {
  q: string;
  type: string;
  account: string;
  category: string;
  from: string;
  to: string;
  sort: string;
};

const SEARCH_DELAY = 300;

const EMPTY: TransactionFilterValues = {
  q: "",
  type: "",
  account: "",
  category: "",
  from: "",
  to: "",
  sort: "date_desc",
};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * URL-backed filters. Typing writes with router.replace after 300 ms so it
 * never adds history entries; selects write with router.push so Back restores
 * the previous view. Nothing here submits, so the table never goes blank.
 */
export function TransactionsFilters({
  accounts,
  categories,
  values,
}: {
  accounts: Option[];
  categories: Option[];
  values: TransactionFilterValues;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(values.q);
  const settledQuery = useDebouncedValue(query, SEARCH_DELAY);
  const [optimistic, setOptimistic] = useOptimistic(values);
  const [isPending, startTransition] = useTransition();
  const navigationPending = useNavigationPending();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typing = query !== settledQuery;
  const busy = isPending || navigationPending || typing;
  const active =
    Number(Boolean(query.trim())) +
    Number(Boolean(optimistic.type)) +
    Number(Boolean(optimistic.account)) +
    Number(Boolean(optimistic.category)) +
    Number(Boolean(optimistic.from)) +
    Number(Boolean(optimistic.to));

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function go(href: string, mode: "push" | "replace", next?: TransactionFilterValues) {
    if (!next && href === transactionsHref(params)) return;
    beginNavigation(href);
    startTransition(() => {
      if (next) setOptimistic(next);
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  /** Every filter, including the ones still waiting on a navigation. */
  function patchFor(filters: TransactionFilterValues): Record<string, string | null> {
    return {
      q: filters.q.trim() || null,
      type: filters.type || null,
      account: filters.account || null,
      category: filters.category || null,
      from: filters.from || null,
      to: filters.to || null,
      sort: filters.sort || null,
      page: null,
    };
  }

  function commitQuery(next: string, immediate: boolean) {
    clearTimer();
    // Merge the optimistic filters so a search typed while a select is still
    // in flight cannot drop that select.
    const href = transactionsHref(params, patchFor({ ...optimistic, q: next }));
    if (immediate) {
      go(href, "replace");
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      // The page can unmount before the debounce lands; never pull the user back.
      if (window.location.pathname !== "/transactions") return;
      go(href, "replace");
    }, SEARCH_DELAY);
  }

  function onQueryChange(next: string) {
    setQuery(next);
    commitQuery(next, false);
  }

  function setFilter(key: keyof TransactionFilterValues, value: string) {
    // A filter change flushes any search still waiting on the debounce, so the
    // typed text is not dropped when the two land together.
    clearTimer();
    const q = query.trim();
    const next: TransactionFilterValues = { ...optimistic, [key]: value, q };
    go(transactionsHref(params, patchFor(next)), "push", next);
  }

  function clearFilters() {
    clearTimer();
    setQuery("");
    go(transactionsHref(params, patchFor(EMPTY)), "push", EMPTY);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="sr-only">
            Search transactions
          </label>
          <Input
            id="q"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              commitQuery(query, true);
            }}
            placeholder="Search payee or notes"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="type" className="sr-only">
            Type
          </label>
          <select
            id="type"
            value={optimistic.type}
            onChange={(event) => setFilter("type", event.target.value)}
            className={selectClass}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div>
          <label htmlFor="account" className="sr-only">
            Account
          </label>
          <select
            id="account"
            value={optimistic.account}
            onChange={(event) => setFilter("account", event.target.value)}
            className={selectClass}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select
            id="category"
            value={optimistic.category}
            onChange={(event) => setFilter("category", event.target.value)}
            className={selectClass}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="from" className="sr-only">
            From date
          </label>
          <Input
            id="from"
            type="date"
            value={optimistic.from}
            onChange={(event) => setFilter("from", event.target.value)}
            aria-label="From date"
          />
        </div>

        <div>
          <label htmlFor="to" className="sr-only">
            To date
          </label>
          <Input
            id="to"
            type="date"
            value={optimistic.to}
            onChange={(event) => setFilter("to", event.target.value)}
            aria-label="To date"
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor="sort" className="sr-only">
          Sort
        </label>
        <select
          id="sort"
          value={optimistic.sort}
          onChange={(event) => setFilter("sort", event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Largest amount</option>
          <option value="amount_asc">Smallest amount</option>
        </select>

        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Updating
            </>
          ) : null}
        </span>

        {active > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="size-3.5" aria-hidden />
            Clear {active} filter{active === 1 ? "" : "s"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

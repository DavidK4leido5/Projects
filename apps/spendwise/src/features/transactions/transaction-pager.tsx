"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, type MouseEvent, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  Loader2,
} from "lucide-react";
import { cn } from "@repo/shared";
import {
  beginNavigation,
  transactionsHref,
  useNavigationPending,
} from "@/features/transactions/transaction-navigation";

const CONTROL =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-sm font-medium tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 sm:h-8 sm:w-8 [&_svg]:size-4";

const CURRENT = "border-primary bg-primary text-primary-foreground";

type PageItem = { kind: "page"; value: number } | { kind: "gap"; jumpTo: number };

/**
 * Up to 7 pages everything is shown. Beyond that: 1, the last page, three
 * around the current one, and one ellipsis per gap.
 */
function pageItems(page: number, pages: number): PageItem[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => ({ kind: "page", value: index + 1 }));
  }

  const start = Math.min(Math.max(page - 1, 1), Math.max(pages - 2, 1));
  const visible = new Set<number>([1, pages]);
  for (let value = start; value <= start + 2 && value <= pages; value += 1) {
    visible.add(value);
  }

  const sorted = [...visible].sort((left, right) => left - right);
  const items: PageItem[] = [];

  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) {
      if (value - previous === 2) items.push({ kind: "page", value: previous + 1 });
      else items.push({ kind: "gap", jumpTo: Math.floor((previous + value) / 2) });
    }
    items.push({ kind: "page", value });
  });

  return items;
}

/**
 * Numbered pager that never waits on the server: the clicked number highlights
 * at once, the rows stay put, and the URL follows with scroll:false.
 */
export function TransactionPager({
  page,
  pageCount,
  total,
  start,
  end,
}: {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [optimisticPage, setOptimisticPage] = useOptimistic(page);
  const [isPending, startTransition] = useTransition();
  const navigationPending = useNavigationPending();
  const busy = isPending || navigationPending;

  const pages = Math.max(1, pageCount);
  const current = Math.min(Math.max(optimisticPage, 1), pages);

  function hrefFor(target: number): string {
    return transactionsHref(params, { page: target > 1 ? String(target) : null });
  }

  function go(event: MouseEvent<HTMLAnchorElement>, target: number) {
    // Modified clicks belong to the browser: new tab, copied link, download.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    const href = hrefFor(target);
    beginNavigation(href);
    startTransition(() => {
      setOptimisticPage(target);
      router.push(href, { scroll: false });
    });
    requestAnimationFrame(() => {
      document.getElementById("transactions-results")?.scrollIntoView({ block: "start" });
    });
  }

  function arrowLink(target: number, label: string, icon: ReactNode) {
    const href = hrefFor(target);
    return (
      <Link
        prefetch
        href={href}
        aria-label={label}
        className={CONTROL}
        onClick={(event) => go(event, target)}
      >
        {icon}
      </Link>
    );
  }

  function arrowButton(label: string, icon: ReactNode) {
    return (
      <button type="button" disabled aria-label={label} className={CONTROL}>
        {icon}
      </button>
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
    >
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground"
      >
        Showing {start}–{end} of {total}
        {busy ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            <span className="sr-only">Updating results</span>
          </>
        ) : null}
      </p>

      {pages > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {current <= 1
            ? arrowButton("First page", <ChevronsLeft />)
            : arrowLink(1, "First page", <ChevronsLeft />)}
          {current <= 1
            ? arrowButton("Previous page", <ChevronLeft />)
            : arrowLink(current - 1, "Previous page", <ChevronLeft />)}

          {pageItems(current, pages).map((item) => {
            if (item.kind === "gap") {
              return (
                <Link
                  key={"gap-" + item.jumpTo}
                  prefetch
                  href={hrefFor(item.jumpTo)}
                  aria-label={"Go to page " + item.jumpTo}
                  className={CONTROL}
                  onClick={(event) => go(event, item.jumpTo)}
                >
                  <Ellipsis />
                </Link>
              );
            }

            if (item.value === current) {
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-current="page"
                  aria-label={"Page " + item.value}
                  className={cn(CONTROL, CURRENT)}
                >
                  {item.value}
                </button>
              );
            }

            return (
              <Link
                key={item.value}
                prefetch
                href={hrefFor(item.value)}
                aria-label={"Go to page " + item.value}
                className={CONTROL}
                onClick={(event) => go(event, item.value)}
              >
                {item.value}
              </Link>
            );
          })}

          {current >= pages
            ? arrowButton("Next page", <ChevronRight />)
            : arrowLink(current + 1, "Next page", <ChevronRight />)}
          {current >= pages
            ? arrowButton("Last page", <ChevronsRight />)
            : arrowLink(pages, "Last page", <ChevronsRight />)}
        </div>
      ) : null}
    </nav>
  );
}

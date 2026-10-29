"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Ellipsis } from "lucide-react";
import { cn } from "@repo/shared";
import { beginPending, endPending } from "@/lib/navigation-pending";

type PaginationProps = {
  page: number;
  pages: number;
  /** Query parameter the page number is written to. */
  paramName?: string;
  /** Element scrolled to the top of the viewport; the window is never scrolled. */
  scrollTargetId?: string;
  className?: string;
};

const CONTROL =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-sm font-medium tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 sm:h-8 sm:w-8 [&_svg]:size-4";

const CURRENT = "border-primary bg-primary text-primary-foreground";

// A navigation that never lands must not leave the list in a skeleton forever.
const SAFETY_TIMEOUT_MS = 10_000;

type PageItem = { kind: "page"; value: number } | { kind: "gap"; jumpTo: number };

/**
 * Up to 7 pages everything is shown. Beyond that: 1, the last page, three around
 * the current one, and one ellipsis per gap.
 */
function pageItems(page: number, pages: number): PageItem[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => ({ kind: "page", value: index + 1 }));
  }

  // Three numbers, slid inward at the edges so the row never shrinks to two.
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
      // One hidden page is cheaper to show than an ellipsis that jumps to it.
      if (value - previous === 2) items.push({ kind: "page", value: previous + 1 });
      else items.push({ kind: "gap", jumpTo: Math.floor((previous + value) / 2) });
    }
    items.push({ kind: "page", value });
  });

  return items;
}

export function Pagination({
  page,
  pages,
  paramName = "page",
  scrollTargetId,
  className,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  // The clicked page shows as selected immediately. The target is tied to the
  // page it was clicked from, so once the server prop moves the highlight falls
  // back to it without an effect.
  const [jump, setJump] = useState<{ from: number; to: number } | null>(null);

  const settled = Math.min(Math.max(page, 1), pages);
  const current = jump && jump.from === settled ? jump.to : settled;

  // The URL is the source of truth: when it reflects the new page the skeleton
  // goes, whether or not anything else reported the navigation as finished.
  useEffect(() => {
    endPending();
    const safety = setTimeout(endPending, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(safety);
  }, [page, pages]);

  if (pages <= 1) return null;

  function hrefFor(target: number): string {
    const next = new URLSearchParams(searchParams.toString());
    next.set(paramName, String(target));
    const query = next.toString();
    return query ? pathname + "?" + query : pathname;
  }

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
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
    const clicked = Number(new URL(href, "http://localhost").searchParams.get(paramName));
    if (Number.isFinite(clicked)) setJump({ from: settled, to: clicked });
    beginPending();
    startTransition(() => {
      router.push(href, { scroll: false });
    });
    requestAnimationFrame(() => {
      if (!scrollTargetId) return;
      document.getElementById(scrollTargetId)?.scrollIntoView({ block: "start" });
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
        onClick={(event) => navigate(event, href)}
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
      className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}
    >
      <p className="text-xs tabular-nums text-muted-foreground">
        Page {current} of {pages}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {current <= 1
          ? arrowButton("First page", <ChevronsLeft />)
          : arrowLink(1, "First page", <ChevronsLeft />)}
        {current <= 1
          ? arrowButton("Previous page", <ChevronLeft />)
          : arrowLink(current - 1, "Previous page", <ChevronLeft />)}

        {pageItems(current, pages).map((item) => {
          if (item.kind === "gap") {
            const href = hrefFor(item.jumpTo);
            return (
              <Link
                key={"gap-" + item.jumpTo}
                prefetch
                href={href}
                aria-label={"Go to page " + item.jumpTo}
                className={CONTROL}
                onClick={(event) => navigate(event, href)}
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

          const href = hrefFor(item.value);
          return (
            <Link
              key={item.value}
              prefetch
              href={href}
              aria-label={"Go to page " + item.value}
              className={CONTROL}
              onClick={(event) => navigate(event, href)}
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
    </nav>
  );
}

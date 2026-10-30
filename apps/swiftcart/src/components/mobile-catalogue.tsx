"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@repo/shared";
import { ProductCard } from "@/components/product-card";
import type { CataloguePage, CatalogueQuery } from "@/lib/catalogue-client";
import type { ProductCardModel } from "@/features/catalog/queries";

/**
 * The server and the hydrating client must produce the same first window, so
 * both start from this fixed viewport instead of reading the real one during
 * render. The virtualizer replaces it as soon as it observes the window.
 */
const INITIAL_VIEWPORT = { width: 390, height: 844 };
const ROW_ESTIMATE = 300;
/** Matches the wrapper's sm:hidden: above this the feed is not on screen. */
const MOBILE_QUERY = "(max-width: 639px)";

type MobileCatalogueProps = {
  initialItems: ProductCardModel[];
  initialPage: number;
  pages: number;
  search: CatalogueQuery;
  className?: string;
};

function pageHref(search: CatalogueQuery, page: number): string {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.store) params.set("store", search.store);
  if (search.category) params.set("category", search.category);
  if (search.sort) params.set("sort", search.sort);
  if (search.stock) params.set("stock", search.stock);
  params.set("page", String(page));
  return "/api/catalogue?" + params.toString();
}

/**
 * Two cards per virtual row. The page scrolls, so the virtualizer is anchored
 * to the window and offsets rows by the list's own top.
 */
export function MobileCatalogue({
  initialItems,
  initialPage,
  pages,
  search,
  className,
}: MobileCatalogueProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  // Null until the list's top is known: the first paint must not read layout,
  // and the near-the-end check waits for a measured offset.
  const [scrollMargin, setScrollMargin] = useState<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const pageRef = useRef(initialPage);

  const rowCount = Math.ceil(items.length / 2);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 3,
    scrollMargin: scrollMargin ?? 0,
    initialRect: INITIAL_VIEWPORT,
    // window.scrollY is read after mount, never during render.
    initialOffset: 0,
  });

  useEffect(() => {
    const update = () => {
      const next = wrapperRef.current?.offsetTop ?? 0;
      setScrollMargin((current) => (current === next ? current : next));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const loadMore = useCallback(async () => {
    const target = pageRef.current + 1;
    if (busyRef.current || pageRef.current >= pages) return;
    if (typeof window === "undefined" || !window.matchMedia(MOBILE_QUERY).matches) return;

    busyRef.current = true;
    setLoading(true);
    try {
      const response = await fetch(pageHref(search, target));
      if (!response.ok) return;
      const next = (await response.json()) as CataloguePage;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
      pageRef.current = next.page;
      setPage(next.page);
    } catch {
      // A dropped page is retried by the next sentinel hit or scroll.
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [pages, search]);

  // The last virtual row is a second trigger for when the sentinel is skipped
  // by a fast scroll; both funnel through the same in-flight guard. Overscan is
  // left out, or the first screenful would already count as the end.
  const virtualRows = virtualizer.getVirtualItems();
  const lastRow = virtualizer.range?.endIndex ?? -1;

  useEffect(() => {
    if (scrollMargin === null || lastRow < rowCount - 2) return;
    // Deferred a tick: the effect must not start a state update in the same
    // render pass the virtualizer just triggered.
    queueMicrotask(() => {
      void loadMore();
    });
  }, [lastRow, rowCount, scrollMargin, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div ref={wrapperRef} aria-busy={loading} className={cn("sm:hidden", className)}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.map((row) => {
          const start = row.index * 2;
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              // pb-3 is the row gap: measuring the row includes it.
              className="absolute left-0 top-0 grid w-full grid-cols-2 gap-3 pb-3"
              style={{ transform: "translateY(" + (row.start - (scrollMargin ?? 0)) + "px)" }}
            >
              {items.slice(start, start + 2).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} aria-hidden="true" />

      {loading ? (
        <p role="status" className="mt-3 text-center text-xs text-neutral-500">
          Loading more...
        </p>
      ) : page >= pages ? (
        <p className="mt-3 text-center text-xs text-neutral-500">End of results.</p>
      ) : null}
    </div>
  );
}

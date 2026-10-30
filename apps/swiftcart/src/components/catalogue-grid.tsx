"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { ProductCardModel } from "@/features/catalog/queries";
import type { CataloguePage, CatalogueQuery } from "@/lib/catalogue-client";

/**
 * The server and the hydrating client must produce the same first window, so
 * both start from this fixed viewport instead of reading the real one during
 * render. The virtualizer replaces it as soon as it observes the window.
 */
const INITIAL_VIEWPORT = { width: 390, height: 844 };
const ROW_ESTIMATE = 300;
/** Below sm the grid appends pages; above it the page's pager owns paging. */
const MOBILE_QUERY = "(max-width: 639px)";
/** Two columns are the base; each matching query adds one. */
const COLUMN_QUERIES = ["(min-width: 640px)", "(min-width: 1024px)", "(min-width: 1280px)"];

type CatalogueGridProps = {
  initialItems: ProductCardModel[];
  initialPage: number;
  pages: number;
  search: CatalogueQuery;
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
 * One virtualised grid at every width. A row holds as many cards as the current
 * breakpoint has columns, and only the rows near the viewport are mounted.
 */
export function CatalogueGrid({ initialItems, initialPage, pages, search }: CatalogueGridProps) {
  // Two columns is the narrow default, so the server render and the hydrating
  // client agree; the media effect replaces it with the real count.
  const [columns, setColumns] = useState(2);
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

  // Above sm the pager owns paging, so the grid shows exactly the cards the
  // server sent for the current page and never grows.
  const mobile = columns === 2;
  const visibleItems = mobile ? items : initialItems;
  const rowCount = Math.ceil(visibleItems.length / columns);

  useEffect(() => {
    const queries = COLUMN_QUERIES.map((query) => window.matchMedia(query));
    const update = () => {
      const next = queries.reduce((count, query) => (query.matches ? count + 1 : count), 2);
      setColumns((current) => (current === next ? current : next));
    };
    update();
    for (const query of queries) query.addEventListener("change", update);
    return () => {
      for (const query of queries) query.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const next = wrapperRef.current?.offsetTop ?? 0;
      setScrollMargin((current) => (current === next ? current : next));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Rows change height and width with the column count, so the measurement
  // cache is keyed per column count instead of being reused across layouts.
  const getItemKey = useCallback((index: number) => columns + ":" + index, [columns]);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 3,
    scrollMargin: scrollMargin ?? 0,
    initialRect: INITIAL_VIEWPORT,
    // window.scrollY is read after mount, never during render.
    initialOffset: 0,
    getItemKey,
  });

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
    if (!mobile || scrollMargin === null || lastRow < rowCount - 2) return;
    // Deferred a tick: the effect must not start a state update in the same
    // render pass the virtualizer just triggered.
    queueMicrotask(() => {
      void loadMore();
    });
  }, [mobile, lastRow, rowCount, scrollMargin, loadMore]);

  useEffect(() => {
    if (!mobile) return;
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
  }, [mobile, loadMore]);

  return (
    <div ref={wrapperRef} aria-busy={loading}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.map((row) => {
          const startIndex = row.index * columns;
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              // The bottom padding is the row gap: measuring the row includes it.
              className="absolute left-0 top-0 grid w-full gap-3 pb-3 sm:gap-4 sm:pb-4"
              style={{
                gridTemplateColumns: "repeat(" + columns + ", minmax(0, 1fr))",
                transform: "translateY(" + (row.start - (scrollMargin ?? 0)) + "px)",
              }}
            >
              {visibleItems.slice(startIndex, startIndex + columns).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} aria-hidden="true" />

      {mobile && loading ? (
        <p role="status" className="mt-3 text-center text-xs text-neutral-500">
          Loading more...
        </p>
      ) : mobile && page >= pages ? (
        <p className="mt-3 text-center text-xs text-neutral-500">End of results.</p>
      ) : null}
    </div>
  );
}

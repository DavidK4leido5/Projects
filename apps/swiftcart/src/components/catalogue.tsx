import Link from "next/link";
import { Button, Skeleton } from "@repo/ui";
import { CatalogFilters } from "@/components/catalog-filters";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { ResultsRegion } from "@/components/results-region";
import { listStoreFacets, searchProducts } from "@/features/catalog/queries";
import { SORT_OPTIONS } from "@/lib/search-params";

const GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4";

/**
 * Same cell padding, line heights, and button height as ProductCard, so the
 * twelve cards that land after a page change do not move the pager.
 */
function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="flex flex-col gap-1.5 p-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-baseline justify-between gap-2 pt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="mt-2 h-[30px] w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export type CatalogueSearch = {
  q?: string;
  store?: string;
  sort?: string;
  stock?: string;
  page?: string;
};

/**
 * Reads searchParams, so it is always rendered inside a Suspense boundary. The
 * shell above it stays prerendered.
 */
export async function Catalogue({ searchParams }: { searchParams: Promise<CatalogueSearch> }) {
  const params = await searchParams;
  const sort = params.sort === "price-asc" || params.sort === "price-desc" ? params.sort : "new";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const inStock = params.stock === "in";
  const q = params.q?.trim() ?? "";
  const store = params.store ?? "";

  const [facets, catalog] = await Promise.all([
    listStoreFacets(),
    searchProducts({ q, store, sort, inStock, page, perPage: 12 }),
  ]);

  const filtered = Boolean(q || store || inStock || sort !== "new");
  const storeName = store ? (facets.find((facet) => facet.slug === store)?.name ?? store) : "";
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label.toLowerCase();
  const scope = [q ? 'for "' + q + '"' : "", storeName ? "in " + storeName : ""]
    .filter(Boolean)
    .join(" ");
  const conditions = [
    scope,
    inStock ? "in stock only" : "",
    sort !== "new" && sortLabel ? "sorted by " + sortLabel : "",
  ]
    .filter(Boolean)
    .join(", ");
  const emptyDescription = conditions
    ? "No matches " + conditions + "."
    : "No products are listed yet.";
  /*
   * The rail renders four cards, so it asks for four and names the ids the page
   * is already showing. Fetching a larger set and trimming it here put the size
   * of the rail in the component instead of the query, and left it short when
   * one of the four was also on the page.
   */
  const rail =
    filtered || catalog.items.length === 0
      ? []
      : (
          await searchProducts({
            sort: "price-asc",
            inStock: true,
            perPage: 4,
            exclude: catalog.items.map((item) => item.id),
          })
        ).items;

  return (
    <main id="catalogue" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-10 pt-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="hover:text-neutral-900">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-700">
          {store
            ? (facets.find((facet) => facet.slug === store)?.name ?? "All products")
            : "All products"}
        </span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {q ? "Results for " + q : "All products"}
          </h1>
          <p className="text-sm text-neutral-600">
            {catalog.total} {catalog.total === 1 ? "listing" : "listings"}
            {filtered ? " in this view" : " from independent stores"}
          </p>
        </div>
        <Link href="/signup/store">
          <Button className="px-3 py-1.5 text-xs">Start selling</Button>
        </Link>
      </div>

      <CatalogFilters
        stores={facets.map((facet) => ({ slug: facet.slug, name: facet.name }))}
        filtered={filtered}
      />

      {catalog.items.length === 0 ? (
        <EmptyState description={emptyDescription} />
      ) : (
        <ResultsRegion
          id="catalogue-results"
          className="mt-6 scroll-mt-24"
          skeleton={<ProductGridSkeleton count={12} />}
        >
          <div className={GRID_CLASS}>
            {catalog.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </ResultsRegion>
      )}

      <Pagination
        page={catalog.page}
        pages={catalog.pages}
        scrollTargetId="catalogue-results"
        className="mt-8 border-t border-neutral-200 pt-5"
      />

      {!filtered && rail.length > 0 ? (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-3 border-b border-neutral-200 pb-3">
            <h2 className="text-lg font-semibold tracking-tight">Best value</h2>
            <Link
              href="/?sort=price-asc"
              className="text-xs text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {rail.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

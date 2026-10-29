import Link from "next/link";
import { Button, Card, CardTitle } from "@repo/ui";
import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogPagination } from "@/components/catalog-pagination";
import { ProductCard } from "@/components/product-card";
import { listStoreFacets, searchProducts } from "@/features/catalog/queries";

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

  const [facets, catalog, bestValue] = await Promise.all([
    listStoreFacets(),
    searchProducts({ q, store, sort, inStock, page, perPage: 12 }),
    searchProducts({ sort: "price-asc", inStock: true, perPage: 8 }),
  ]);

  const filtered = Boolean(q || store || inStock || sort !== "new");
  const onPage = new Set(catalog.items.map((item) => item.id));
  const rail = bestValue.items.filter((item) => !onPage.has(item.id)).slice(0, 4);

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
        <Card id="catalogue-results" className="mt-8 flex scroll-mt-24 flex-col items-start gap-3">
          <CardTitle>Nothing matched</CardTitle>
          <p className="text-sm text-neutral-600">
            Try a different search term, or clear the filters to see the whole catalogue.
          </p>
          <Link href="/">
            <Button variant="secondary">Clear filters</Button>
          </Link>
        </Card>
      ) : (
        <div
          id="catalogue-results"
          className="mt-6 grid scroll-mt-24 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        >
          {catalog.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {catalog.pages > 1 ? <CatalogPagination page={catalog.page} pages={catalog.pages} /> : null}

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

      <section id="stores" className="mt-14 scroll-mt-28">
        <div className="flex items-end justify-between gap-3 border-b border-neutral-200 pb-3">
          <h2 className="text-lg font-semibold tracking-tight">Stores</h2>
          <Link
            href="/signup/store"
            className="text-xs text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            Open yours
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {facets.map((facet) => (
            <Link
              key={facet.slug}
              href={"/stores/" + facet.slug}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300"
            >
              <span className="text-sm font-medium">{facet.name}</span>
              <span className="text-xs tabular-nums text-neutral-500">
                {facet.productCount} products
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

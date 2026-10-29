import Link from "next/link";
import { Button, Card, CardTitle } from "@repo/ui";
import { FeaturedHero } from "@/components/featured-hero";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProduct, listStoreFacets, searchProducts } from "@/features/catalog/queries";

export const metadata = { title: "All products" };

type SearchParams = {
  q?: string;
  store?: string;
  sort?: string;
  stock?: string;
  page?: string;
};

const SORTS = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
];

function href(params: SearchParams, overrides: Partial<SearchParams>): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  if (merged.q) search.set("q", merged.q);
  if (merged.store) search.set("store", merged.store);
  if (merged.sort && merged.sort !== "new") search.set("sort", merged.sort);
  if (merged.stock === "in") search.set("stock", "in");
  if (merged.page && merged.page !== "1") search.set("page", merged.page);
  const query = search.toString();
  return query ? "/?" + query : "/";
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const sort = params.sort === "price-asc" || params.sort === "price-desc" ? params.sort : "new";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const inStock = params.stock === "in";
  const q = params.q?.trim() ?? "";
  const store = params.store ?? "";

  const [facets, catalog, bestValue, featured] = await Promise.all([
    listStoreFacets(),
    searchProducts({ q, store, sort, inStock, page, perPage: 12 }),
    searchProducts({ sort: "price-asc", inStock: true, perPage: 8 }),
    getFeaturedProduct(),
  ]);

  // The rail only earns its space if it shows something the grid does not.
  const onPage = new Set(catalog.items.map((item) => item.id));
  const rail = bestValue.items.filter((item) => !onPage.has(item.id)).slice(0, 4);

  const filtered = Boolean(q || store || inStock || sort !== "new");

  return (
    <>
      {!filtered && featured ? <FeaturedHero product={featured} /> : null}

      <main id="catalogue" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-10 pt-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-900">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-neutral-700">
            {store
              ? (facets.find((f) => f.slug === store)?.name ?? "All products")
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

        <form
          action="/"
          className="mt-4 flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-4"
        >
          {q ? <input type="hidden" name="q" value={q} /> : null}

          <label className="flex items-center gap-2 text-xs text-neutral-600">
            Store
            <select
              name="store"
              defaultValue={store}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900"
            >
              <option value="">All stores</option>
              {facets.map((facet) => (
                <option key={facet.slug} value={facet.slug}>
                  {facet.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-neutral-600">
            Sort
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-900"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              name="stock"
              value="in"
              defaultChecked={inStock}
              className="h-3.5 w-3.5 rounded border-neutral-300"
            />
            In stock only
          </label>

          <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
            Apply
          </Button>

          {filtered ? (
            <Link
              href="/"
              className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              Clear
            </Link>
          ) : null}

          <span className="ml-auto text-xs tabular-nums text-neutral-500">
            Page {catalog.page} of {catalog.pages}
          </span>
        </form>

        {catalog.items.length === 0 ? (
          <Card className="mt-8 flex flex-col items-start gap-3">
            <CardTitle>Nothing matched</CardTitle>
            <p className="text-sm text-neutral-600">
              Try a different search term, or clear the filters to see the whole catalogue.
            </p>
            <Link href="/">
              <Button variant="secondary">Clear filters</Button>
            </Link>
          </Card>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {catalog.pages > 1 ? (
          <nav
            aria-label="Pagination"
            className="mt-8 flex items-center justify-between gap-3 border-t border-neutral-200 pt-5"
          >
            {catalog.page > 1 ? (
              <Link
                href={href(params, { page: String(catalog.page - 1) })}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-neutral-900"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1">
              {Array.from({ length: catalog.pages }, (_, index) => index + 1).map((number) => (
                <Link
                  key={number}
                  href={href(params, { page: String(number) })}
                  aria-current={number === catalog.page ? "page" : undefined}
                  className={
                    number === catalog.page
                      ? "rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-md px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100"
                  }
                >
                  {number}
                </Link>
              ))}
            </div>

            {catalog.page < catalog.pages ? (
              <Link
                href={href(params, { page: String(catalog.page + 1) })}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-neutral-900"
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

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
    </>
  );
}

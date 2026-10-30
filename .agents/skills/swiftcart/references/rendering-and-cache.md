# Rendering and caching

## Config that matters

```ts
// next.config.ts
cacheComponents: true,        // "use cache", cacheLife, cacheTag, PPR
partialPrefetching: true,     // links prefetch the shell, never per-user data
experimental: { staleTimes: { dynamic: 30, static: 180 } },
images: { loader: "custom", loaderFile: "./src/lib/image-loader.ts" },
```

## The page shape

Every route is a static shell with suspended holes:

```tsx
export default function Page({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;      // request-time read, inside the hole
  const rows = await listRows(params);    // cached query
  return <ClientTable rows={rows} />;
}
```

Rules:

- No `export const dynamic`. The build must show `◐` for every page; `ƒ` is only for `app/api/*`.
- Cookies, headers, searchParams are read only inside suspended components.
- `loading.tsx` per list segment: mirrors the final layout so navigation never flashes an empty page.

## What is cached

| Read | Cache | Tag |
|---|---|---|
| catalogue search, facets, categories | yes | `products`, `stores`, `featured` |
| product detail, store page | yes | `product(slug)`, `store(slug)` |
| admin products / users / orders / stores | yes | `products`, `users`, `orders`, `stores` |
| dashboard items, inventory | yes | `products`, `inventory(storeId)` |
| store's fulfilment list | yes | `orders`, `store(slug)` |
| cart, shopper `/track`, receipts | **no** | per-user, never shared |
| auth/session, cart count | **no** | request-time by nature |

Per-user caching is the one way to leak data across accounts. If a read depends on the signed-in
user id, either leave it uncached or key the cache on that id and tag it `user:<id>`.

## Writing a cached query

```ts
export async function listRows({ q, page }: { q?: string; page?: number }) {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.products);
  return getDb().select()...;
}
```

- Arguments are part of the key, so pass primitives, not objects with functions.
- Return serialisable data (plain objects/arrays). A `Map` will not survive the cache boundary; the
  admin queries were converted to records for this reason.
- `cacheLife` values: `catalogue: "minutes"`, `detail: "hours"`, `static: "days"`.

## Invalidation

- Server action: `updateTag(tags.products)`.
- Route handler: `revalidateTag(tags.products, "max")`. `updateTag` throws outside an action.
- Invalidate narrowly. A product write touches `products`, `featured`, `store(slug)`; only the ones the
  read declared.

## Skeletons

- `PageSkeleton` for whole pages, `TableSkeleton` for tables, `ProductGridSkeleton` (in `catalogue.tsx`)
  for the grid. They must match the real geometry so results never shift the page.
- `ResultsRegion` owns the swap during pending navigations; see pagination-and-url-state.md.

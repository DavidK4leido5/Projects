---
name: swiftcart
description: Architecture and working rules for the SwiftCart Next.js 16 marketplace in this repo (rendering, cache tags, optimistic mutations, URL-state pagination, hooks, data model). Read before changing any page, query, action, table or component.
---

# SwiftCart

A multi-vendor marketplace. Shoppers browse and check out without an account, stores list and fulfil,
admins operate the marketplace. One Next.js app, Postgres on Neon, images through Cloudinary.

Read this file top to bottom once. It is deliberately the whole map: after it you should not need to
explore the tree to know where something lives or which rule applies.

## 30-second model

```
app/            routes (server components, PPR shells)
components/     UI: shared tables, drawers, cards, hooks consumers
features/<domain>/  queries.ts (cached reads) + actions.ts (server actions)
lib/            cross-cutting: db, cache tags, auth, hooks, media, search params
drizzle/        migrations (staged: add -> backfill -> constrain)
packages/ui     shadcn primitives (never re-implement locally)
packages/shared cn(), formatMoney, formatDate
```

Data flows one way: `page (server) -> feature query ("use cache") -> component`. Writes flow the other
way: `component (client) -> server action -> DB + updateTag -> router.refresh()`.

## Folder map

| Path                | What lives there                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(auth)`    | login, signup, signup/store                                                                                                                                                     |
| `src/app/admin`     | overview, stores, users, products, orders + `queries.ts`, `user-queries.ts`, `order-queries.ts`                                                                                 |
| `src/app/dashboard` | store items, inventory, orders                                                                                                                                                  |
| `src/app/api`       | `admin/products` (bulk import), `catalogue` (mobile paging), `upload`, `images/[...key]`, `health`, `auth/[...path]`                                                            |
| `src/components`    | shared UI. Tables: `product-manager`, `admin/*-table`, `inventory-table`. Shell: `pagination`, `results-region`, `table-skeleton`, `entity-drawer`, `row-menu`, `table-toolbar` |
| `src/features/<d>`  | `queries.ts` cached reads, `actions.ts` server actions                                                                                                                          |
| `src/lib`           | `db/`, `cache.ts` tags, `auth/`, `hooks.ts`, `cart.ts`, `media.ts`, `search-params.ts`, `use-optimistic-params.ts`                                                              |

## Routes

Every page and API route, with who can open it: [references/routes.md](references/routes.md).

## Rendering contract

- `cacheComponents` + `partialPrefetching` are on. Every page is Partial Prerender: the shell is static,
  cookie/searchParams reads sit inside `<Suspense fallback={<PageSkeleton />}>`.
- Never `export const dynamic`. A `ƒ` page route in the build output is a bug.
- `loading.tsx` exists per list segment so client navigations show a shaped skeleton immediately.
- Router stale window: `experimental.staleTimes = { dynamic: 30, static: 180 }` in `next.config.ts`.
- Detail: [references/rendering-and-cache.md](references/rendering-and-cache.md)

## Cache

- Shared reads: `"use cache"` then `cacheLife(lifetimes.x)` and `cacheTag(tags.y)`. Args are the key.
- Per-user reads (cart, shopper `/track`, receipts) are **not** cached.
- Tags live in `src/lib/cache.ts`: `products`, `product(slug)`, `stores`, `store(slug)`, `featured`,
  `orders`, `order(id)`, `users`, `user(id)`, `inventory(storeId)`.
- Writes: `updateTag(tag)` inside a server action. In a **route handler** use `revalidateTag(tag, "max")`;
  `updateTag` throws there.
- Detail: [references/rendering-and-cache.md](references/rendering-and-cache.md)

## Mutations

- Signature: `Promise<{ ok: true } | { ok: false; error: string }>`. Never redirect from an action.
- Client pattern: `useOptimistic` state, `startTransition(async () => { apply(...); const r = await action(); router.refresh(); })`.
  Failure reverts automatically when the transition ends.
- After a write, invalidate only the tags that read actually declares.
- Detail with code: [references/mutations.md](references/mutations.md)

## URL state and pagination

- Search: `router.replace`, debounced 300 ms (250 in table toolbars).
- Filters and page: `router.push`, always `{ scroll: false }`.
- Shared `<Pagination page pages paramName? scrollTargetId? />` renders `|< < 1 2 3 … n > >|`, clickable
  ellipsis, first/last, `aria-current`. It sets the pending flag, and re-anchors the results after commit.
- `<ResultsRegion id skeleton>` swaps its children for the skeleton while pending.
- Catalogue: desktop uses the pager; below `sm` the same virtualised grid appends pages from
  `GET /api/catalogue`. Desktop never fetches on scroll.
- Detail: [references/pagination-and-url-state.md](references/pagination-and-url-state.md)

## Hooks: no useEffect in components

All effects live in `src/lib/hooks.ts` (10 of them, each an external subscription or timer):
`useLatest`, `useMediaQuery` (useSyncExternalStore), `useEventListener`, `useInterval`,
`useBodyScrollLock`, `useElementOffsetTop`, `useNearEnd`, `useUrlCommit`, `useSettlePending`,
`useDebouncedSearchField`.

Components compose these. If you need an effect, add a named hook here first.
Detail: [references/ui-and-hooks.md](references/ui-and-hooks.md)

## UI system

- Primitives come from `@repo/ui` (shadcn vendored). Build with them; never copy a primitive into the app.
- Shared shells: `EntityDrawer` (side sheet), `RowMenu` (grouped overflow menu), `TableToolbar`
  (debounced search + filters + count), `TableSkeleton`, `ProductCard` (compact, image-led, one link),
  `Carousel` (embla-backed track: drag, swipe, loop, snap; chrome stays with the caller).
- Drawer flows: admin users, admin products, store products all use `EntityDrawer`; product form is the
  same component in both roles.

## Data model

`profiles` (role user/store/admin) → `stores` → `products` → `product_images`, `product_variants`.
Carts: `carts` (user or guest token) → `cart_items`.
Orders: `orders` (nullable user, delivery snapshot, `access_token` receipt) → `order_items` →
`order_fulfilments` (one per store) and `order_events` (audit).
Detail: [references/data-model.md](references/data-model.md)

## Auth

- Neon Auth for identity; the role lives in `profiles.role`. `getActor()` returns
  `{ kind: "anonymous" | "user" | "store" | "admin" }`; `requireAdmin`, `requireStoreOwner` guard pages.
- `proxy.ts` protects `/dashboard`, `/admin`, `/orders`; `/cart`, `/checkout` and `/orders/<uuid>`
  receipts are public.
- Ownership is enforced in the WHERE clause. Cross-tenant reads return 404, not 403.

## Media

Uploads go through `/api/upload` → `saveImage` writes object storage **and** Cloudinary. Deletion removes
both. `next/image` uses the custom Cloudinary loader from `next.config.ts`.

## Recipes

**Add a page.** `app/<route>/page.tsx` default export renders `<Suspense fallback={<PageSkeleton />}>`;
the async body reads session/searchParams; add `loading.tsx` with a matching skeleton.

**Add a cached query.** In `features/<d>/queries.ts`: `export async function x(args)` with
`"use cache"; cacheLife(lifetimes.catalogue); cacheTag(tags.y);`. Pass ids in; never read cookies.

**Add a mutation.** In `features/<d>/actions.ts`: `"use server"`, validate, write, `updateTag(...)`,
return `{ ok }` or `{ ok: false, error }`. In the component: `useOptimistic` + transition + `router.refresh()`.

**Add a table.** Server page reads a page of rows and passes them to a client component that renders
`TableToolbar` + `ResultsRegion` + `<Pagination>` + `RowMenu` per row.

**Add a route handler.** `app/api/.../route.ts`; cache invalidation must use `revalidateTag(tag, "max")`.

## Traps already paid for

- Dev server hydrates only at **localhost:3000**, not 127.0.0.1.
- `updateTag` throws in route handlers. Use `revalidateTag(tag, "max")`.
- Migrations are staged: add nullable → backfill → drop/constrain. Drizzle will guess renames otherwise.
- Deleting products/stores leaves orphan objects in the bucket; rows cascade, files do not.
- The hero is an embla carousel; drag, loop and snap are the library's, the arrows and dots are ours.
- Per-user caching is the one way to leak data. Keep those reads uncached.
- Detail: [references/pitfalls.md](references/pitfalls.md)

## Verify

```bash
pnpm lint && pnpm typecheck && pnpm build     # from the repo root
pnpm --filter @repo/swiftcart dev             # http://localhost:3000
```

Build output should show `◐` for every page and `ƒ` only for the six API routes.

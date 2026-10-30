# Pitfalls

Each of these has already cost time in this repo.

## Dev server

- Hydration only works at **http://localhost:3000**. `127.0.0.1` is treated as a cross-origin dev origin,
  HMR fails and no client component hydrates. Playwright must use `localhost`.
- The dev server holds file locks; stop it before rewriting a file the watcher has open.

## Caching

- `updateTag` throws outside a server action. In `app/api/*` use `revalidateTag(tag, "max")`.
- `"use cache"` functions must not read cookies, headers or the session. Pass ids in.
- Returning a `Map` from a cached function breaks serialisation; return a record or array.
- Per-user data must never be shared-cached. Cart, shopper `/track` and receipts stay uncached.

## Rendering

- A `ƒ` page route means a request-time read escaped the Suspense hole. Find it, do not add
  `export const dynamic`.
- The catalogue renders both layout strategies through one virtualised grid; the first server paint uses
  2 columns until `useMediaQuery` resolves. Do not try to guess the viewport on the server.
- The hero is a **cloned track** slider: wrapping relies on the first and last clone slides. Reordering
  slides without updating the clone logic breaks the loop.

## Data

- No transactions. Multi-step writes need compensation (stock claim, media upload, order creation).
- Deleting a product or store removes rows, not storage objects. Orphans accumulate in the bucket.
- `drizzle-kit generate` will ask about renames if you add and drop in the same schema change. Stage it.

## UI

- Radix `AlertDialog` unmounts before a form submit lands; delete from `onClick` inside a transition.
- A clickable table row needs `RowMenu` (it stops propagation) or the row opens behind the menu.
- Skeleton and real rows must share geometry, or pagination shifts the page.
- Autoplay carousels pause on hover and focus; a Playwright click leaves the pointer over the hero and
  therefore "disables" autoplay, which is correct behaviour.

## Scrolling

- Filters must not move the window. The URL-commit hook restores the offset because Next can land a
  searchParams navigation at scroll 0.
- Page changes scroll the results container only.
- A drag on the hero must suppress the click that follows, or swiping opens a product.

## Verification

- `pnpm lint` runs from the repo root only; the app package has no lint script.
- `pnpm build` needs `DATABASE_URL` because prerender reads rows.
- Postgres writes done by scripts bypass tag invalidation; restart dev or wait out `cacheLife`.

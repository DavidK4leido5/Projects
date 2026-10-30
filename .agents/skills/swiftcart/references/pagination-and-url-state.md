# Pagination and URL state

## Contract

| Surface                        | Params                                   |
| ------------------------------ | ---------------------------------------- |
| catalogue `/`                  | `q, store, category, sort, stock, page`  |
| dashboard products / inventory | `q, category, sort, store, filter, page` |
| admin products                 | `q, category, sort, store, page`         |
| admin users                    | `q, role, page`                          |
| admin orders                   | `q, status, page`                        |

- Search writes with `router.replace` (debounced 300 ms; 250 ms in `TableToolbar`). Typing must not add
  history entries.
- Filters and page write with `router.push`, always `{ scroll: false }`, so Back restores the previous view.
- Changing a filter clears `page`.

## Components

```tsx
<Pagination page={page} pages={pages} scrollTargetId="catalogue-results" />
```

- Renders `|< < 1 2 3 … n > >|` plus "Page X of Y". Up to 7 pages shows every number; beyond that, first
  and last plus a window of three, with a clickable ellipsis that jumps half the gap.
- Current page is a button with `aria-current="page"`; edges are disabled buttons.
- On click: `beginPending()` → `router.push(href, { scroll: false })` → after commit, scroll
  `scrollTargetId` into view and `endPending()`.
- The clicked number highlights immediately (jump state keyed to the query string), and a filter reset
  drops the highlight.

```tsx
<ResultsRegion
  id="product-results"
  skeleton={<TableSkeleton rows={20} columns={6} variant="products" />}
>
  {table}
</ResultsRegion>
```

The wrapper keeps the same id and classes in both states, so the pending swap cannot reflow the page.

## Pending store

`src/lib/navigation-pending.ts` holds a module-level flag:
`beginPending()`, `endPending()`, `useNavigationPending()`. It self-clears after 10 s so a dropped
navigation cannot pin a skeleton. Components call `beginPending` before navigating and
`useSettlePending(key)` where `key` is the URL string (or page/pages) to clear it.

## Scroll rules

- Filters and search never move the window. The URL-commit hook restores the previous offset because this
  Next build sometimes lands a searchParams navigation at scroll 0.
- Page changes scroll the **results container** to its top, never the window.
- Drag, swipe and slider gestures are unrelated; keep them inside their component.

## Catalogue specifics

- Desktop: cached page of 12, numbered pager, no fetches on scroll.
- Mobile (<640): the same virtualised grid appends pages from `GET /api/catalogue`, dedupes by id, shows
  "Loading more" and "End of results". DOM stays bounded (<= ~24 cards) no matter how far you scroll.
- The grid virtualises rows with `@tanstack/react-virtual`; columns come from `useMediaQuery` (2/3/4/5).
- The server cannot know the viewport, so the first server paint is the 2-column window; hydration applies
  the real column count. This is the price of one tree.

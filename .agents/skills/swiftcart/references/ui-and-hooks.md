# UI and hooks

## Primitives

Everything comes from `@repo/ui` (shadcn vendored): Button, Card, Input, Label, Checkbox, Textarea,
Badge, Separator, Skeleton, Table, Sheet, AlertDialog, DropdownMenu. Never copy one into the app.
Icons are lucide-react. Class merging uses `cn` from `@repo/shared`.

## Shared components

| Component | Props | Use |
|---|---|---|
| `Pagination` | `page, pages, paramName?, scrollTargetId?, className?` | every list |
| `ResultsRegion` | `id?, className?, skeleton, children` | skeleton swap while pending |
| `TableSkeleton` | `rows?, columns?, variant?: "products" \| "text"` | table placeholders |
| `TableToolbar` | `value, onSearch, placeholder?, filters?, count, countLabel` | table search + filters |
| `EntityDrawer` | `open, onOpenChange, title, description?, footer?, children` | user/store/product detail |
| `RowMenu` | `label?, items: RowMenuItem[]` | overflow actions; stops row-click propagation |
| `ProductCard` | `product` | compact card, one stretched link, no button |

Drawer rule: the admin product drawer and the store product drawer render the same `ProductForm`. Do not
fork it per role.

## Hooks: the only place useEffect lives

`src/lib/hooks.ts`:

| Hook | Use |
|---|---|
| `useLatest(value)` | keep listeners/timers on the freshest callback |
| `useMediaQuery(query)` | `useSyncExternalStore` over matchMedia; server snapshot false |
| `useEventListener(getTarget, type, handler, { enabled, passive })` | window/element events |
| `useInterval(cb, delay \| null)` | autoplay |
| `useBodyScrollLock(active)` | modal/lightbox |
| `useElementOffsetTop(ref)` | virtualiser `scrollMargin` |
| `useNearEnd(index, count, threshold, cb)` | append the next page |
| `useUrlCommit(key, cb)` | run once the URL settles |
| `useSettlePending(key)` | clear the pending flag |
| `useDebouncedSearchField({ value, onCommit, delay })` | input + debounce + external sync + flush |

If a component needs an effect, add a named hook here first. Effects that only mirror props into state
are not allowed; derive during render or lift the state.

`useEffectEvent` is not usable for the debounce callbacks: React forbids calling an Effect Event from a
timer started in a handler.

## Layout

- Header: `site-header` (static) + `SessionNav` (Suspense hole, holds the cart badge).
- Footer: static links.
- Admin and dashboard share the same page width, card radii and muted palette; tables use `py-2.5 text-sm`.

## Accessibility basics

- Every icon button has `aria-label` and `title`.
- Carousels expose `aria-roledescription="carousel"`, `aria-current` on dots.
- Lightbox: Escape closes, +/- zoom, 0 resets, body scroll locked.
- Focus rings come from the primitives; do not remove them.

# Route map

`◐` means Partial Prerender (the only page kind here). Access column: who can open it.

## Storefront

| Route              | Renders                                                                         | Access                |
| ------------------ | ------------------------------------------------------------------------------- | --------------------- |
| `/`                | hero + virtualised catalogue, filters, pager (desktop) / infinite feed (mobile) | public                |
| `/products/[slug]` | gallery + variant picker + add to cart                                          | public                |
| `/stores/[slug]`   | store banner and its products                                                   | public                |
| `/cart`            | cart lines, optimistic quantity and remove                                      | public (guest cookie) |
| `/checkout`        | delivery form or saved-address confirm, success panel in place                  | public                |
| `/orders/[token]`  | read-only receipt                                                               | public with the link  |

## Account

| Route                                | Renders                                                            | Access    |
| ------------------------------------ | ------------------------------------------------------------------ | --------- |
| `/login`, `/signup`, `/signup/store` | auth forms                                                         | public    |
| `/continue`                          | post-sign-in router: merges the guest cart, sends each role onward | signed in |
| `/track`, `/track/[token]`           | role-scoped orders with timeline; store/admin get status controls  | signed in |
| `/orders`                            | redirects to `/track`                                              | signed in |

## Store dashboard

| Route                  | Renders                                                                  | Access      |
| ---------------------- | ------------------------------------------------------------------------ | ----------- |
| `/dashboard`           | items table: search, category, sort, pager, drawer create/edit, row menu | store owner |
| `/dashboard/inventory` | variant stock, low/out filters, optimistic stock edit                    | store owner |
| `/dashboard/orders`    | this store's fulfilment slices, controls, buyer details                  | store owner |

## Admin

| Route             | Renders                                                     | Access |
| ----------------- | ----------------------------------------------------------- | ------ |
| `/admin`          | metric cards, open slices by status                         | admin  |
| `/admin/stores`   | create form, roster with rename/delete icons, order counts  | admin  |
| `/admin/users`    | users table, role filter, drawer, grouped row menu          | admin  |
| `/admin/products` | shared product table across stores, store/category filters  | admin  |
| `/admin/orders`   | compact orders table, fulfilment per slice, drawer, actions | admin  |

## API (`ƒ`)

| Route                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `/api/catalogue`       | JSON page of products for the mobile feed              |
| `/api/admin/products`  | GET list, POST bulk import, PATCH category             |
| `/api/upload`          | image upload → storage + Cloudinary                    |
| `/api/images/[...key]` | serves stored images when Cloudinary is not configured |
| `/api/health`          | database/storage/Cloudinary reachability               |
| `/api/auth/[...path]`  | Neon Auth proxy                                        |

## Access rules

`proxy.ts` protects `/dashboard`, `/admin` and `/orders` (the list). Public even when signed out:
`/cart`, `/checkout`, and `/orders/<uuid>` receipts matched by regex. Everything else falls through.

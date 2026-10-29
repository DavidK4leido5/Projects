# SwiftCart

A storefront where independent stores list what they sell. Browsing, a persisted cart, checkout into
an order, a seller dashboard, and an admin area. No payment is ever taken.

The point is the seams: where data comes from, who is allowed to read it, and what happens when one
of those pieces is swapped out.

## Roles

One account, one role.

| Role    | Can do                                            | Lands on     |
| ------- | ------------------------------------------------- | ------------ |
| `admin` | Manage every store, every user, and every product | `/admin`     |
| `store` | CRUD the products of the one store it owns        | `/dashboard` |
| `user`  | Browse, and keep a cart tied to the account       | `/`          |

## Component layer

Every component comes from shadcn. The vendored source lives in `packages/ui` with a
`components.json`, a CSS variable theme (`@repo/ui/styles.css`), and Radix underneath. Apps import
from `@repo/ui` and never keep a local copy, so the next app in the monorepo inherits the same
primitives. A component that shadcn does not ship is composed from primitives in the same package
rather than written from scratch.

The theme maps shadcn's tokens onto the neutral palette the app already used, so adopting it did not
change the look.

## Item management

`/dashboard` is the only seller screen. It lists items in a shadcn Table with cover, price, stock,
preview count, a Hero badge, and row actions. Adding and editing open the same Sheet; there are no
`/dashboard/products/new` or `/[id]/edit` routes. Deleting goes through an AlertDialog.

Each item carries up to ten previews in `product_images`, ordered, with the first as cover. Uploads
go through `/api/upload`, so every preview lands in object storage and Cloudinary. Removing a preview,
or deleting the item, removes the objects from both stores rather than orphaning them.

### Hero banner standard

| Slot    | Ratio | Reference upload | Accepted range  |
| ------- | ----- | ---------------- | --------------- |
| Desktop | 5:2   | 3264x1312        | 1.6:1 to 3.4:1  |
| Mobile  | 9:16  | 1080x1920        | 0.45:1 to 0.7:1 |

The band is `clamp(300px, 42.4vw, 640px)` tall. At `42.4vw` it is exactly 2.36:1, the ratio of
3168x1344, so that artwork fills it with no crop up to roughly 1500px viewport width. Above that the
height cap engages, the band gets wider than the art, and `object-cover` trims the sides evenly.
Phones show the 9:16 file in a 9:16 frame, so that slot never crops.

Both slots are mandatory while an item is featured, and both are validated in the browser before
upload. The uploaded file is kept at full size; Cloudinary derives every delivered width.

**Delivery.** The `next/image` loader requests the width the slot actually needs: `100vw` at the
device pixel ratio. A 1440px-wide desktop asks for `w_1920` and a retina screen for `w_3840`, so the
rendered image is never upscaled.

## Images

Every image goes through `next/image` with a project-wide custom loader
(`src/lib/image-loader.ts`, wired in `next.config.ts`). The loader rewrites a storage key into a
Cloudinary URL with `f_auto,q_auto,c_fill,w_<width>`, so the CDN negotiates format and size per
device and the Next optimizer never touches the bytes. Without `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
the loader returns the app's own `/api/images/<key>` route instead, which keeps local work possible.

The hero is art-directed with `getImageProps` rather than two `<Image>` elements, because a
`<picture>` needs different `srcset`s per media query without shipping both files. It is full bleed:
9:16 and full width on phones, `clamp(300px,40vw,560px)` tall from `sm` up. On very wide screens the
band gets wider than 5:2, so the sides of a 5:2 banner are cropped slightly; below about 1400px wide
the match is near exact.

## Rendering and caching

`cacheComponents` is on, so the app uses `use cache`, `cacheLife`, `cacheTag`, and partial
prerendering together. No route carries `export const dynamic`.

**Shell versus holes.** Every route prerenders its frame (header chrome, footer, page shell). Anything
cookie-bound sits in a Suspense boundary: the session controls in the header, the catalogue keyed by
`searchParams`, and the body of every authed page. The build reports those routes as partial prerender,
never dynamic.

**Tags are the contract** (`src/lib/cache.ts`). Public reads declare them; every write calls
`updateTag` for the ones it changes, which gives read-your-own-writes inside server actions.

```
products, product:<slug>, stores, store:<slug>, featured, orders, order:<id>
```

**Never cached:** per-user reads (cart, orders, dashboard, admin). They are scoped to the request, so a
shared cache entry would leak one shopper's data to another.

**Prebuild.** `generateStaticParams` covers known product and store slugs; new ones render on first
request and are cached from then on.

**Skeletons** live in `src/components/skeletons.tsx`. Route-level `loading.tsx` files cover the
detail routes, and the Suspense fallbacks cover the streamed holes. A loading state mirrors its own
page and nothing else: the header and footer belong to the layout shell, so they must stay rendered
while a route streams. Anything extra in a `loading.tsx` reads as the shell breaking.

**Operational note.** `db:seed`, `db:reset`, and `db:migrate` write straight to Postgres and bypass
the server actions, so they do not invalidate tags. After running one, restart the server (which clears
the in-process cache) or wait for the cache lifetime to lapse. `next build` now needs `DATABASE_URL`
because it prerenders real rows.

## The catalogue

The landing page is a browse surface, not a poster: a two row header with search, a breadcrumb, a
filter bar, a four column grid, and pagination. Every control is a real query parameter handled in
`searchProducts` (`src/features/catalog/queries.ts`): free text across product and store names, a
store filter, in-stock only, and price or recency sort. Filters compose, so `?q=stoneware&store=atlas-ceramics&sort=price-asc`
is one query.

The rail below the grid only renders when nothing is filtered, because showing unrelated products
under a search result is worse than showing none.

## Media and delivery

Every image is written twice: Neon object storage is the system of record, Cloudinary is the delivery
layer. `saveImage()` in `src/lib/media.ts` is the only path that stores a file, and it enforces both
or neither: if Cloudinary rejects the asset, the object is deleted from the bucket again rather than
leaving the two out of sync.

Uploads land in the `swiftcart` folder in Cloudinary. The public id is derived from the object key
(`products/<id>/<uuid>.png` becomes `swiftcart/products/<id>/<uuid>`), so no extra column is needed and
existing rows start using the CDN as soon as credentials exist.

Delivery URLs carry `f_auto,q_auto,c_fill,w_<n>` plus a `srcset` of 320 to 1600 wide, so the browser
picks a size and Cloudinary picks the format. When Cloudinary is not configured, every surface falls
back to streaming through `/api/images/[...key]` and `/api/health` reports it as unconfigured.

Images uploaded before Cloudinary existed are only in the bucket. `pnpm --filter @repo/swiftcart media:mirror`
copies them across once.

## The hero

A store marks any of its products `featured`. The landing page collects those that also have artwork,
newest first, and renders them as a carousel: autoplay every 5.5s, arrows, dots, arrow-key support,
and pausing on hover or focus. Controls disappear when there is only one slide.

The slide is the image and nothing else. Stores are expected to bake their own type into the artwork,
so the hero never overlays a headline. A featured product with no image is skipped rather than shown
as a labelled placeholder, and a shop with no featured artwork simply starts at the catalogue.

## Layers

```
src/app/            routes and route handlers. No SQL, no storage client.
src/features/       one folder per capability, each owning its queries and server actions.
src/lib/            infrastructure: db client, auth, storage adapter.
src/components/     presentational pieces used across routes.
```

One direction, top to bottom. A page imports a feature. A feature imports lib. lib imports nothing
from the app. Nothing under `src/app` touches Drizzle or S3 directly.

| Folder                  | Owns                                   | Never does         |
| ----------------------- | -------------------------------------- | ------------------ |
| `src/app`               | routing, rendering, HTTP               | queries, uploads   |
| `src/features/auth`     | post-signup provisioning of a profile  | password handling  |
| `src/features/catalog`  | read models for browsing               | writes             |
| `src/features/products` | product mutations, ownership checks    | rendering          |
| `src/features/cart`     | cart mutations and the cart read model | pricing rules      |
| `src/features/admin`    | store, user, and cross-store controls  | rendering          |
| `src/lib`               | db client, auth, storage adapter       | business decisions |

## Three boundaries worth reading

**Identity is hosted, roles are ours.** Neon Auth (Better Auth) owns users, password hashing, and
sessions. It has nowhere to put an app role, so `profiles` mirrors each auth user by id and holds the
role. `src/lib/auth/guards.ts` is the only place a role is decided. It reads the signed session
cookie, loads the profile, and returns a typed actor. Pages call `requireAdmin()`,
`requireStoreOwner()`, or `requireUser()`, each of which redirects instead of returning null.

**Ownership lives in the query.** Product mutations filter with `and(eq(products.id, id),
eq(products.storeId, store.id))`. A store editing another store's product gets a 404, not a 403, so
the route does not confirm that the row exists.

**Storage.** `src/lib/storage.ts` exposes a three method interface and one adapter. Images are never
public bucket URLs; they stream through `/api/images/[...key]`, so changing providers means editing
one file.

## Checkout and stock

Placing an order is the one place that mutates two tables at once. `src/features/orders/actions.ts`
claims stock row by row with a conditional update:

```sql
update products set stock = stock - $qty where id = $id and stock >= $qty
```

Zero rows returned means someone else took the last unit, so the earlier claims are put back and the
shopper is sent to `/cart?error=stock`. The Neon HTTP driver has no transactions, so compensation
stands in for one; the failure mode is under-counted stock after a crash, never an oversell.

The order then stores snapshots: product name, store name, and price at the moment of purchase.
Renaming a product, or deleting it outright, changes nothing in order history. `order_items.product_id`
is nullable with `on delete set null` for exactly that reason.

## Money

Prices are `integer` cents. `formatMoney` is the only place that divides by 100, and it lives in
`@repo/shared` because the next app will need it too.

## Commands

```
pnpm --filter @repo/swiftcart dev
pnpm --filter @repo/swiftcart db:reset      # drops the app schema, demo only
pnpm --filter @repo/swiftcart db:migrate
pnpm --filter @repo/swiftcart db:seed       # 1 admin, 2 stores, 1 shopper, 9 products
pnpm --filter @repo/swiftcart build
pnpm --filter @repo/swiftcart smoke         # runs against a live server
```

Seeded accounts, all with password `demo1234`:

```
admin@swiftcart.dev     admin
demo@swiftcart.dev      store   (Northwind Supply)
shopper@swiftcart.dev   user
```

`next build` needs no database: every route is dynamic and the db client is created lazily.

## Configuration

| Variable                                                                          | Used by               |
| --------------------------------------------------------------------------------- | --------------------- |
| `DATABASE_URL`                                                                    | `src/lib/db`          |
| `NEON_AUTH_BASE_URL`                                                              | `src/lib/auth/server` |
| `NEON_AUTH_COOKIE_SECRET` (32+ chars, ours, never the service's)                  | `src/lib/auth/server` |
| `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `src/lib/storage`     |
| `OBJECT_STORAGE_BUCKET` (optional)                                                | `src/lib/storage`     |

The auth service emits `NEON_AUTH_BASE_URL`; the cookie secret is generated once by us and signs the
session-data cookie the proxy mints. Object storage has no bucket variable in Neon, so
`OBJECT_STORAGE_BUCKET` is only needed when the provisioned bucket is not the one declared in
`neon.ts`.

`pnpm --filter @repo/swiftcart env:report` prints what the app resolves, with secrets masked.

## Known limits

- Deleting a user in the admin area removes the profile, store, products, and cart here, then asks the
  hosted service to remove the identity. That second call needs the admin's role inside Neon Auth,
  which is separate from `profiles.role`. Until the hosted role is set to `admin`, the identity stays
  and the UI reports it.
- No email verification, password reset, or 2FA: there is no email provider wired up.
- Product image upload is reachable only when signed in; the type and size checks live in
  `/api/upload`.

## Out of scope on purpose

Payments, tax, shipping, refunds, email, search, pagination, image resizing, audit logging.
Adding any of them should mean a new feature folder, not a new pattern.

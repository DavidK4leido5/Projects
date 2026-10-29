# SwiftCart

A storefront where independent stores list what they sell. Browsing, a persisted cart, a seller
dashboard, and an admin area. No checkout, no payments.

The point is the seams: where data comes from, who is allowed to read it, and what happens when one
of those pieces is swapped out.

## Roles

One account, one role.

| Role    | Can do                                            | Lands on     |
| ------- | ------------------------------------------------- | ------------ |
| `admin` | Manage every store, every user, and every product | `/admin`     |
| `store` | CRUD the products of the one store it owns        | `/dashboard` |
| `user`  | Browse, and keep a cart tied to the account       | `/`          |

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

Checkout, payments, orders, email, search, pagination, image resizing, audit logging.
Adding any of them should mean a new feature folder, not a new pattern.

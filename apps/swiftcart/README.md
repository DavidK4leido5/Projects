# SwiftCart

A storefront where independent stores open an account and list what they sell. Browse, no checkout.
The point here is the seams: where data comes from, who is allowed to read it, and what happens when
one of those pieces is swapped out.

## Layers

```
src/app/            routes and route handlers. No SQL, no storage client.
src/features/       one folder per capability, each owning its queries and server actions.
src/lib/            infrastructure: db client, auth primitives, storage adapter.
src/components/     presentational pieces used across routes.
```

The rule is one direction, top to bottom. A page imports a feature. A feature imports lib. lib imports
nothing from the app. Nothing under `src/app` touches Drizzle or S3 directly, which is what makes the
data layer testable and the adapter swappable.

| Folder                  | Owns                                | Never does                      |
| ----------------------- | ----------------------------------- | ------------------------------- |
| `src/app`               | routing, rendering, HTTP            | queries, uploads, password work |
| `src/features/catalog`  | read models for browsing            | writes                          |
| `src/features/stores`   | signup, signin, sessions            | product rules                   |
| `src/features/products` | product mutations, ownership checks | rendering                       |
| `src/lib`               | db client, auth, storage adapter    | business decisions              |

## Two boundaries worth reading

**Storage.** `src/lib/storage.ts` exposes a three method interface and one adapter. Object keys are
opaque and owned by the app; images are never exposed as public bucket URLs. They stream through
`/api/images/[...key]`, so changing providers means editing that one file.

**Sessions.** Password hashing is scrypt with a per-user salt, stored as `scrypt$salt$key`. Sessions
live in Postgres, keyed by a random 32 byte token in an httpOnly cookie. `requireStore()` is the only
way a dashboard page gets the current store, and it redirects instead of returning null, so pages
cannot render without a session by accident.

## Money

Prices are `integer` cents in the database. `formatMoney` is the only place that divides by 100, and
it lives in `@repo/shared` because the next app will need it too.

## Commands

```
pnpm --filter @repo/swiftcart dev
pnpm --filter @repo/swiftcart db:generate   # schema change -> SQL in drizzle/
pnpm --filter @repo/swiftcart db:migrate
pnpm --filter @repo/swiftcart db:seed       # two demo stores, demo@swiftcart.dev / demo1234
pnpm --filter @repo/swiftcart build
pnpm --filter @repo/swiftcart smoke         # runs against a live server
```

`db:migrate`, `db:seed` and `smoke` need a reachable database and object storage. `next build` does
not: every route is dynamic and the db client is created lazily, so a build never opens a connection.

## Configuration

Those are the names `neon env pull` writes, because Neon emits the S3 SDK's standard variables:

| Variable                                                                          | Used by           |
| --------------------------------------------------------------------------------- | ----------------- |
| `DATABASE_URL`                                                                    | `src/lib/db`      |
| `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `src/lib/storage` |
| `OBJECT_STORAGE_BUCKET` (optional, defaults to `assets`)                          | `src/lib/storage` |

Object storage has no bucket variable in Neon: the bucket is the one declared in `neon.ts`, so it
needs `OBJECT_STORAGE_BUCKET` only when the provisioned bucket has a different name. The older
`OBJECT_STORAGE_*` names still resolve, and the project also accepts split `PG*` database vars.

`pnpm --filter @repo/swiftcart env:report` prints what the app resolves, with secrets masked.

## Out of scope on purpose

Cart, checkout, payments, orders, email, search, pagination, image resizing, admin moderation.
Adding any of them should mean a new feature folder, not a new pattern.

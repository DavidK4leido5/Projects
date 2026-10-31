> Working on this repo? Read `.agents/skills/swiftcart/SKILL.md` first. It is the architecture map:
> rendering, cache tags, mutations, pagination, hooks, data model and the known traps.

# Projects

Turborepo monorepo. pnpm workspaces, TypeScript everywhere, shared UI and config packages.

## Layout

```
apps/
  swiftcart/    Next.js storefront on Neon Postgres + object storage
  spendwise/    Next.js personal finance app on Neon Postgres, Auth, and object storage
packages/
  config/       tsconfig bases and the ESLint flat config
  shared/       framework-agnostic helpers and types
  ui/           shared React components (shadcn primitives + derived components)
  finance/      pure money/date/calculation module and Zod validators
  db/           Dalorro Drizzle schema, clients, migrations, and seed
```

## Commands

| Command          | Runs                                         |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | every app in watch mode                      |
| `pnpm build`     | `turbo run build`, cached per package        |
| `pnpm typecheck` | `tsc --noEmit` in every package              |
| `pnpm test`      | `turbo run test` (finance + app unit tests)  |
| `pnpm lint`      | ESLint over the whole repo, one process      |
| `pnpm format`    | Prettier write                               |
| `pnpm check`     | lint + typecheck + format check, the CI gate |

Targeted runs: `pnpm --filter @repo/swiftcart dev`, `pnpm --filter @repo/spendwise dev`,
`pnpm --filter @repo/ui typecheck`.

Dalorro setup, Neon provisioning, migrations, seed, and Vercel deployment:
[apps/spendwise/README.md](apps/spendwise/README.md).

## CI/CD

`.github/workflows/ci.yml` runs on pushes to `master`, pull requests, and manual dispatch:
lint, typecheck, format check, Dalorro unit tests, then builds for both Dalorro and SwiftCart.
SwiftCart's build reads its isolated Neon `ci` branch through the `SWIFTCART_DATABASE_URL`
repository secret; Dalorro builds from placeholders because its PPR shells do not query Postgres.

Both Vercel projects (`spendwise` and `swiftcart`) are connected to this GitHub repository and
deploy `master` to production. Other branches are disabled in each app's `vercel.json` until
preview databases and Auth branches exist. Functions for both apps run in `sin1` (Singapore).

## Scheduled reminders

`apps/spendwise/vercel.json` schedules `/api/cron/reminders` daily at 22:00 UTC (06:00 Manila).
The route is closed unless the request carries `Authorization: Bearer $CRON_SECRET`. It calls
`syncAllReminders()`, which evaluates recurring bills and budget thresholds for every user with
settings. The Hobby plan allows one cron run per day; a Pro plan can shorten the schedule without
changing the route.

## Realtime notifications

An insert trigger on `spendwise.notifications` calls `pg_notify` on the
`spendwise_notifications` channel. `/api/notifications/stream` keeps a direct Postgres
connection open with `LISTEN`, filters payloads to the signed-in user, and streams matching rows to
the bell over SSE. This requires `DATABASE_URL_UNPOOLED`, because a pooled PgBouncer connection
cannot hold a session-level `LISTEN`.

Vercel ends the stream at `maxDuration = 60`; `EventSource` reconnects automatically. Cron writes
work even when no tab is open, and an open tab receives the row through the trigger.

## Adding things

**An app:** create `apps/<name>/package.json` with `build` and `dev` scripts. Turbo finds it, no registration step.

**A package:** create `packages/<name>/package.json`, name it `@repo/<name>`, add a `tsconfig.json` extending `@repo/config/tsconfig/base.json`. Add `"typecheck": "tsc --noEmit"` so it joins the check.

## Conventions

- **Just-in-time packages.** `packages/*` ship TypeScript source, not build output: `exports: { ".": "./src/index.ts" }`. No watch builds, no stale `dist`. A consuming Next app must list the package in `transpilePackages`.
- **One version catalog.** All dependency versions live in `pnpm-workspace.yaml` under `catalog`. In a package, write `"react": "catalog:"`. Bumping a version is a one-line change for the whole repo.
- **Config is shared, not copied.** tsconfig bases come from `@repo/config/tsconfig/*`, ESLint from `@repo/config/eslint/*`. The root `eslint.config.mjs` is the only lint entry point.
- **Tailwind lives in the app.** Shared components use utility classes, but the app owns the stylesheet and points Tailwind at the shared source with `@source "../../../packages/ui/src";` in `globals.css`. Adding another shared package with components means adding another `@source` line.

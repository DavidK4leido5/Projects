# Dalorro

Dalorro is a personal finance record book: accounts, transactions, budgets, goals, cash flow, and PDF reports.
There are no bank, card, or payment-provider integrations. Every entry is recorded by the user, and
PDF reports are the primary output. Next.js 16 (App Router, React 19), Neon Postgres with Drizzle,
Neon Auth (Managed Better Auth), Neon Object Storage for receipts, Cloudinary for report branding.

Part of the `projects` Turborepo. Run commands from the repo root unless noted.

## What is implemented

- Email/password sign up, sign in, sign out, forgot/reset password. No social providers.
- Session-protected app shell: shadcn sidebar on desktop, bottom tab bar on mobile, notification bell.
- Dashboard: balance, income, expenses, net, savings rate, six-month cash flow, category donut,
  budgets, goals, upcoming bills, recent activity, quick add.
- Transactions: server-side search/filter/sort/pagination, quick-add dialog (desktop) and drawer
  (mobile), the `n` shortcut, edit, delete with an Undo toast, page-scoped bulk selection with
  delete/change category/add tag, receipt upload, CSV import with column mapping and duplicate
  detection, filtered CSV export, and a TanStack Table DataTable on desktop.
- Accounts: create, archive/restore, computed balances, assets/liabilities/net worth.
- Categories: nested income/expense tree, create/edit, reorder, archive, and delete with explicit
  reassignment of transactions.
- Budgets: monthly per-category and overall limits, subcategory rollup, one-month rollover,
  budget-vs-actual table, month navigation, copy previous month.
- Goals: target amount/date, linked account, contributions, pace, projected completion date,
  contribution history.
- Recurring: daily/weekly/monthly/yearly/custom rules, upcoming bills (including overdue),
  mark-as-paid that records a real transaction and advances the schedule atomically, and
  pause/resume. Nothing posts in the background; reminders refresh when you open the app.
- Reports: six report types, A4/Letter, account/category filters, optional charts and transaction
  detail, in-browser PDF preview, download, report history with regenerate, and CSV export.
- Insights: deterministic rules for spending changes, category jumps, budget pressure, savings
  rate, subscriptions, largest expense, and a 30/60/90-day forecast.
- Notifications: bill due, overdue, budget alert, and goal/system entries; unread badge, read and
  mark-all-read.
- Settings: name, currency, locale, week start, financial-month start, theme, report logo upload
  (Cloudinary), change password, full JSON export, and account deletion.
- PWA: web manifest, installable icons, offline fallback, and a service worker that never caches
  authenticated pages.
- Marketing landing page at `/`: sticky nav, mobile sheet, light/dark themes, live dashboard preview,
  bento features, product tour, PDF report showcase, security notes, FAQ, and legal placeholders.
- Shared calculation module with 53 unit tests; app tests for CSV and PDF; seven Playwright flows.

## Landing page

`/` is public and lives in `src/app/(marketing)`. It checks the session on the server so a signed-in
visitor sees "Go to dashboard" instead of the sign-up buttons; the rest of the page is static content.

- Copy: `src/features/landing/content.ts`
- Mock data: `src/features/landing/mock-data.ts` (six months, category totals that add up, budgets,
  goals, bills, recent activity, report preview)
- Sections: `hero-section.tsx`, `features-section.tsx`, `how-it-works-section.tsx`,
  `tour-section.tsx`, `report-section.tsx`, `security-section.tsx`, `faq-section.tsx`,
  `final-cta.tsx`
- Product previews and the tabbed tour: `src/features/landing/preview/`
- Shared primitives: `BrowserFrame`, `PhoneFrame`, `SectionHeading`, `FeatureCard`, `StepCard`,
  `Accordion` in `packages/ui`
- SEO: `src/app/(marketing)/opengraph-image.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`,
  JSON-LD in the landing page
- Legal placeholders: `/privacy` and `/terms`

The page uses real dashboard chart components with mock data. No screenshots are embedded, and no
database or auth session is needed for the content.

### Before launch

1. Set `NEXT_PUBLIC_APP_URL` to the production origin (canonicals, sitemap, robots, OG).
2. Confirm the landing copy, the OG image, and the footer use the Dalorro name and `dalorro.app`.
3. Replace the placeholder privacy and terms copy with reviewed policies. Update the contact email.
4. Confirm the currency and locale in `mock-data.ts` (`PHP` / `en-PH` by default).
5. Add a real sample PDF if you want a "Download sample" button. The current page does not fake one.
6. Point the CTAs at your real auth routes. They use `/signup` and `/login`; `/sign-up` and
   `/log-in` redirect to them.
7. Remove the demo account before exposing the environment, or change its password.

## Architecture

```
apps/spendwise
  src/app                routes, layouts, route handlers
    (auth)               login, signup, forgot/reset password
    (marketing)          public landing page, privacy, terms, OG image
    (app)                protected dashboard, transactions, accounts, cash flow, settings
    api/auth/[...path]   Neon Auth proxy (origin rewrite + rate limit)
    api/export           scoped JSON export
  src/features/<domain>  queries (server reads) + actions (server mutations) + UI
  src/lib               env, db, auth/session, storage, cloudinary, rate limit, hooks
  src/proxy.ts          route protection (Next 16 middleware)
packages/db            Drizzle schema, HTTP + WebSocket clients, migrations, seed
packages/finance       pure money/date/calculation module and Zod validators (53 unit tests)
packages/ui            shadcn primitives + derived components (StatCard, MoneyInput, ...)
```

Rules this app follows:

- Every query filters by `userId`; ownership is also re-checked in actions before writes.
- Money is an integer in minor units (centavos/cents) with an explicit currency column.
- Transfers are excluded from every income/expense aggregation by the pure calculation module.
- Server Actions return `{ ok: true, data? } | { ok: false, error }`. No redirects from actions.
- UI components come from `@repo/ui`. Feature components live in `src/features`.
- No `any`; environment variables are validated with Zod at module load.

## Demo account (development only)

The seeded test account:

```text
Email:    demo@dalorro.app
Password: Dalorro2026!
```

It has six months of accounts, categories, transactions, budgets, goals, bills, and notifications.
Re-seed it at any time:

```bash
pnpm --filter @repo/db db:seed -- --email=demo@dalorro.app
```

This account exists only for local testing. Delete it before putting a real environment in front of
people:

```bash
neon neon-auth user delete <user-id>
```

```bash
pnpm --filter @repo/db db:seed -- --email=you@example.com
```

Use your own email after signing up. The seed replaces that user's Dalorro rows.

## Neon setup

The repo root is linked to the `spendwise` Neon project in `aws-ap-southeast-1` (Singapore), next to SwiftCart (`.neon`, `neon.ts`). The Vercel project runs its functions in `sin1` as well (`apps/spendwise/vercel.json`), so queries stay in-region. The project declares:

```ts
// neon.ts
auth: true,
buckets: { assets: { access: "private" } },
```

```bash
# once, from the repo root
npm i -g neon@latest        # or: npx neon@latest ...
neon login                  # interactive, opens a browser
neon init -y --org-id <org-id> --project-id <project-id> --branch production \
  --services postgres,object-storage
pnpm add -w @neon/config @neon/env
neon deploy                 # provisions auth + the assets bucket, pulls env
```

`neon deploy` writes `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`,
`NEON_AUTH_JWKS_URL`, and the four `AWS_*` storage variables into the repo-root `.env.local`.
The Next app reads env from its own directory, so copy them across once:

```bash
# PowerShell
Get-Content .env.local | Set-Content apps/spendwise/.env.local -Encoding utf8
# then append Cloudinary + the cookie secret (see .env.example)
```

Generate the auth cookie secret (32+ characters) and add it to `apps/spendwise/.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Cloudinary reuses the SwiftCart credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`). Receipts do **not** go to Cloudinary: they are private objects in Neon
object storage and are read through short-lived presigned URLs. Cloudinary only stores the optional
report logo.

### Development branches

Use a Neon branch per developer instead of writing demo data into production:

```bash
neon branches create --name dev --from production
neon checkout dev            # pins the branch and pulls its env
neon deploy                  # apply the same neon.ts policy to the branch
```

A branch gets its own database, auth users, and bucket contents. Delete it when done.
Migrations always use `DATABASE_URL_UNPOOLED`; the app uses the pooled `DATABASE_URL`.

## Database

```bash
pnpm --filter @repo/db db:generate   # drizzle-kit generate
pnpm --filter @repo/db db:migrate    # applies packages/db/drizzle to the branch
pnpm --filter @repo/db db:seed -- --email=you@example.com
```

All app tables live in the `spendwise` Postgres schema. Neon Auth owns `neon_auth` and is never
modified. Every app row stores `user_id uuid` matching `neon_auth.user.id`; there is intentionally
no cross-schema foreign key, so the app schema stays portable and Auth can be managed separately.
Deleting a user should delete their Dalorro rows in application code (the export route shows the
complete list).

The seed:

1. Finds the most recent Neon Auth user, or the one passed with `--email`.
2. Replaces that user's Dalorro rows with six months of deterministic demo data.
3. Creates five accounts, 15 parent + 20 child categories, ~180 transactions (including monthly
   transfers), current-month budgets, three goals with contributions, six recurring bills, two
   notifications, and one report history row.

Sign up in the app once, then run the seed.

## Environment

| Variable                                                                 | Purpose                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `DATABASE_URL`                                                           | Pooled Neon Postgres URL used by the app                  |
| `DATABASE_URL_UNPOOLED`                                                  | Direct URL used by Drizzle migrations                     |
| `NEON_AUTH_BASE_URL`                                                     | Managed Better Auth URL (includes path)                   |
| `NEON_AUTH_JWKS_URL`                                                     | JWKS for token verification (reserved for Cron/Functions) |
| `NEON_AUTH_COOKIE_SECRET`                                                | 32+ char secret for the signed session cookie             |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`                            | Branch-scoped object-storage credential                   |
| `AWS_ENDPOINT_URL_S3` / `AWS_REGION`                                     | Object-storage endpoint and region                        |
| `OBJECT_STORAGE_BUCKET`                                                  | Bucket name; defaults to `assets` from `neon.ts`          |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Report logo upload                                        |
| `NEXT_PUBLIC_APP_NAME`                                                   | Display name, defaults to Dalorro                         |

Copy `apps/spendwise/.env.example` and fill it in. Never commit `.env.local`.

## Run

```bash
pnpm install
pnpm --filter @repo/spendwise dev     # http://localhost:3001
```

The SwiftCart app owns port 3000. From the repo root, `pnpm spendwise` is an alias.

The Playwright suite signs in with `E2E_EMAIL` / `E2E_PASSWORD` (defaults to the seeded
`demo@dalorro.app` account) and expects the dev server or `E2E_BASE_URL` to be reachable. Install
the browser once with `pnpm --filter @repo/spendwise exec playwright install chromium`.

Checks:

```bash
pnpm --filter @repo/spendwise typecheck
pnpm --filter @repo/finance test       # 53 unit tests
pnpm --filter @repo/spendwise test     # CSV + PDF tests, 20 tests
pnpm --filter @repo/spendwise test:e2e # 7 Playwright flows (needs a seeded demo user)
pnpm --filter @repo/spendwise build
pnpm exec eslint apps/spendwise packages/ui packages/db packages/finance
```

## Deploy on Vercel

1. The GitHub repository is connected to the Vercel project with **Root Directory**
   `apps/spendwise`.
2. Build command: `pnpm --filter @repo/spendwise build`. Install command: `pnpm install`.
3. Add every variable from the table above to **Production**. Preview deployments are disabled in
   `vercel.json` until a preview Neon branch is configured.
4. Point `DATABASE_URL` at the pooled URL, and run migrations from CI or locally against the
   unpooled URL before promoting.
5. Add the deployment origin to Neon Auth trusted domains:
   `neon neon-auth domain add https://your-app.vercel.app`.
6. `.github/workflows/ci.yml` runs lint, typecheck, format, unit tests, and the Dalorro build on
   pushes and pull requests. A push to `master` triggers the Vercel production deployment. To enable
   previews later, add a Neon preview branch and its own Auth/storage env, then allow the branch in
   `vercel.json`.

## Deliberate limits

- Managed Auth's self-service `delete-user` endpoint is disabled on this branch. Account deletion
  therefore verifies the password, removes every Dalorro row and receipt object, and signs the
  user out. The sign-in identity remains with the auth provider. An operator can finish it with
  `neon neon-auth user delete <user-id>`. When Neon enables `delete-user`, the same action deletes
  the identity first and then purges the data.
- Multi-currency storage (`currency`, `exchangeRate`, `baseAmount`) is in the schema, but the UI
  still creates transactions in the selected account's currency. Cross-currency reports fall back
  to the stored amount.
- Receipts are uploaded from quick add and kept privately in object storage. A dedicated receipt
  viewer is not built yet; the attachment rows and presigned URL helper are ready for it.
- There is no scheduler and no automatic posting. Recurring bills are a reminder list; a
  transaction is only created when the user chooses "Mark as paid".
- Budget rollover carries one previous month, not an unbounded chain.
- The in-browser PDF preview relies on the browser's PDF viewer. The download is the reliable path
  in every browser.
- Reminder notifications are refreshed on page load, not pushed. The app has no background worker.

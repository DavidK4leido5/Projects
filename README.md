> Working on this repo? Read `.agents/skills/swiftcart/SKILL.md` first. It is the architecture map:
> rendering, cache tags, mutations, pagination, hooks, data model and the known traps.

# Projects

Turborepo monorepo. pnpm workspaces, TypeScript everywhere, shared UI and config packages.

## Layout

```
apps/
  swiftcart/    Next.js storefront on Neon Postgres + object storage
packages/
  config/       tsconfig bases and the ESLint flat config
  shared/       framework-agnostic helpers and types
  ui/           shared React components
```

## Commands

| Command          | Runs                                            |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | every app in watch mode                         |
| `pnpm build`     | `turbo run build`, cached per package           |
| `pnpm typecheck` | `tsc --noEmit` in every package                 |
| `pnpm test`      | `turbo run test` (no package defines tests yet) |
| `pnpm lint`      | ESLint over the whole repo, one process         |
| `pnpm format`    | Prettier write                                  |
| `pnpm check`     | lint + typecheck + format check, the CI gate    |

Targeted runs: `pnpm --filter @repo/swiftcart dev`, `pnpm --filter @repo/ui typecheck`.

## Adding things

**An app:** create `apps/<name>/package.json` with `build` and `dev` scripts. Turbo finds it, no registration step.

**A package:** create `packages/<name>/package.json`, name it `@repo/<name>`, add a `tsconfig.json` extending `@repo/config/tsconfig/base.json`. Add `"typecheck": "tsc --noEmit"` so it joins the check.

## Conventions

- **Just-in-time packages.** `packages/*` ship TypeScript source, not build output: `exports: { ".": "./src/index.ts" }`. No watch builds, no stale `dist`. A consuming Next app must list the package in `transpilePackages`.
- **One version catalog.** All dependency versions live in `pnpm-workspace.yaml` under `catalog`. In a package, write `"react": "catalog:"`. Bumping a version is a one-line change for the whole repo.
- **Config is shared, not copied.** tsconfig bases come from `@repo/config/tsconfig/*`, ESLint from `@repo/config/eslint/*`. The root `eslint.config.mjs` is the only lint entry point.
- **Tailwind lives in the app.** Shared components use utility classes, but the app owns the stylesheet and points Tailwind at the shared source with `@source "../../../packages/ui/src";` in `globals.css`. Adding another shared package with components means adding another `@source` line.
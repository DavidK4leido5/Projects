# Working in this repo

SwiftCart is a Turborepo with one app (`apps/swiftcart`) and three packages (`packages/ui`,
`packages/shared`, `packages/config`). Read the skill before touching anything:

**`.agents/skills/swiftcart/SKILL.md`**

It is the map: folder layout, rendering contract, cache tags, mutation pattern, pagination, data model,
and the traps that have already cost time. It points at short references for the details. Reading it
takes a few minutes and replaces exploring the tree.

## Non-negotiables

1. Every page route builds as `◐` (PPR) or static. No `export const dynamic`, no `ƒ` page routes.
2. Shared reads use `"use cache"` + `cacheLife` + `cacheTag`. Per-user reads stay uncached.
3. Mutations are optimistic and return `{ ok }` or `{ ok: false, error }`. No redirects from actions.
4. `useEffect` lives only in `src/lib/hooks.ts`. Components compose hooks.
5. URL is the state for search, filters and pages.
6. `pnpm lint`, `pnpm typecheck`, `pnpm build` must pass before you call anything done.

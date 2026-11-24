# Layers and dependency rules

The codebase is judged by how easy it is to read, change and delete. The rules
below are the project-specific form of the principles in
[style-and-principles.md](../style-and-principles.md). They are enforced by
review and by the ESLint/dependency-cruiser configs in the frontends.

## Backend

```
route → controller → service → repository → database
```

| Layer | May do | Must not |
|---|---|---|
| `*.routes.ts` | Map paths to controllers, attach middleware | Contain logic |
| `*.controller.ts` | Parse request, call one service method, shape response | Touch Prisma or own business rules |
| `*.service.ts` | Rules, orchestration, transactions, cross-module calls | Import `express`, read `req`/`res` |
| `*.repository.ts` | All Prisma queries for the module | Contain business rules |
| `*.schemas.ts` | Validate input at the boundary | Import services |
| `index.ts` | Define the module's public surface | Re-export everything by default |

Other modules import only from `modules/<name>/index.ts`; deep imports such as
`modules/x/x.repository` are defects. Cross-module calls go service to service.
A circular import is a defect: extract the shared piece into a third module or
`utils/` instead of forcing a barrel.

`server.ts` composes the app. It holds middleware order, route mounting and
startup only. Prisma appears only in repositories and the single client in
`infrastructure/prisma.ts`. Configuration comes only from `config/env.ts`,
validated at startup; no other file reads `process.env` for application config.

Known exception: `server.ts` and `infrastructure/health.ts` still import media
helpers by path. Routing them through `media/index.ts` would create a cycle, so
the direct import is kept deliberately (`ARCH-5`). Portfolio files are frozen.

## Frontend

```
page → component → hook → API client → shared primitives / tokens
```

- A feature folder owns its pages, components, hooks, API wrappers and types.
  Route-level pages stay thin.
- All data access goes through React Query hooks. Components receive data via
  props and do not call the HTTP client or fetch in `useEffect`.
- Anything used by two or more features moves to `shared/`. A feature never
  imports another feature's internals; import its public surface or lift the
  piece to `shared/`.
- `shared/` never imports a feature. This is checked by `.dependency-cruiser.cjs`
  and the ESLint layering rules. A shared consumer of a feature API is inverted
  by moving the helper to `shared/api` and having the feature delegate to it.
- Colours, spacing, radii and typography come from `shared/tokens.*`. No raw
  palette classes or hex values in components.

## Cohesion over line count

There is no line limit. Split a file when it mixes layers, contains independent
concepts that change for different reasons, is reused or should be, forces a
reader through unrelated code, or needs half the test mocks for one behaviour.
Do not split because a file feels long, and never split mechanically into
`part1.ts` / `helpers2.ts`. Cohesive parsers, state machines, schema catalogs and
large single-purpose UI components stay intact.

Prefer many small pure functions, early returns and short functions whose names
say what they do. `utils.ts`, `helpers.ts` and `common.ts` are not dumping
grounds; group helpers by subject.

## What the cleanup changed and why

- Frontend: seven components/pages were moved off direct API calls onto React
  Query hooks; six `shared → feature` imports were inverted; a 13-file web
  import cycle was broken by moving route-prefetch loaders into an App-owned
  registry; eleven one-line admin `api.ts` barrels were replaced with direct
  imports of their `api/index` public path.
- Backend: public controllers now call `public.service` instead of repositories;
  GitHub Prisma access moved into `github.repository.ts`; `process.env` reads
  were centralised in `config/env.ts`; auth middlewares throw typed errors
  handled centrally; the internal CodeChef tick was protected.
- Dead code was removed only after repo-wide proof, including dynamic, string,
  route, query-key and barrel usage. Items that could be external contracts or
  operational tools were kept and listed for human review.

When a rule cannot be followed without changing behaviour or creating a cycle,
stop and document the exception rather than forcing the change.

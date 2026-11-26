# Documentation

This directory describes the Self Introduction Portal as it is built, not as
it was planned. When code and a document disagree, the code wins and the
document should be corrected in the same change (`DOC-1` in `AGENTS.md`).

## Start here

| Document | What it answers |
|---|---|
| [system-architecture.md](./system-architecture.md) | What the system is, its processes, data flow and external systems |
| [architecture/layers.md](./architecture/layers.md) | The dependency rules every change must respect |
| [architecture/backend.md](./architecture/backend.md) | Modules, request flow, middleware, jobs, errors and config |
| [architecture/frontend.md](./architecture/frontend.md) | The two apps, routing, data flow, tokens and UI conventions |
| [architecture/database.md](./architecture/database.md) | Prisma, migrations, indexes, retention and open schema questions |
| [api-and-data.md](./api-and-data.md) | Route conventions, contracts, envelopes and endpoint catalogue |
| [security.md](./security.md) | Authentication, authorization, secrets and privacy rules |
| [operations.md](./operations.md) | Build, checks, health probes, scheduled work and runbooks |
| [testing.md](./testing.md) | Test tooling, commands, coverage expectations and known gaps |
| [style-and-principles.md](./style-and-principles.md) | Engineering principles, naming, comments and hard limits |

`decisions/` holds short ADRs: why a decision was made, not how the code works.
`runbooks/` holds step-by-step operational procedures for GitHub sync and the
video cache. Read those when you are performing the operation, not when you are
learning the architecture.

## Rules that are not negotiable

- Layer dependencies point one way. Backend: route → controller → service →
  repository → database. Frontend: page → component → hook → API client →
  shared primitives. See [layers.md](./architecture/layers.md).
- Secrets, real student data and spreadsheets never enter source, logs, tests,
  fixtures or documentation.
- `web/src/features/portfolio/` and `backend/src/modules/portfolio/` are frozen
  and must not be changed by general cleanup work.
- No CSS gradients anywhere. Flat, solid fills only.
- Database migrations are new files only; applying them is a human step.

## Design system

- `shared/tokens.mjs` + `shared/tokens.css` are the single source of truth for
  colour, spacing, radius, type scale and elevation. Both `web/` and
  `admin-client/` read them through `shared/tailwind-preset.mjs`. Components
  read semantic tokens (`--brand`, `--surface`, `--text`, `--border-edge`, …),
  never raw hex or a second palette. Regenerate with `npm run tokens`.
- The legacy `docs-redesign/REPORT.md` (a cached redesign plan referencing a
  `DESIGN.md` that no longer exists) was removed. Design decisions live in the
  code and in `docs/decisions/` ADRs, not in off-repo plans.

## Verification

Run the checks for every package you touch before reporting work as done:

```sh
cd backend && npx tsc --noEmit && npm run lint && npm test && npx prisma validate
cd web && npx tsc --noEmit && npm run lint && npm test && npm run build
cd admin-client && npx tsc --noEmit && npm run lint && npm test && npm run build
npm run tokens:check && npm run check:contrast && node tools/check-utilities.mjs
```

Do not run `npm run build` in `backend` as a substitute for `npx tsc`: its
`prebuild` step can run migrations when a database URL is configured.
See [testing.md](./testing.md) for the exact CI commands and caveats.

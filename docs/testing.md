# Testing and verification

Run checks for every package you touch and report the real output (`TEST-5`, `TEST-6`). "Not run" is acceptable; a claimed pass that was not observed is not.

## Commands

| Package | Typecheck / build | Tests |
|---|---|---|
| backend | `cd backend && npx tsc --noEmit` | `cd backend && npx vitest run [file]`; full suite `cd backend && npm test` (`vitest run`) |
| web | `cd web && npx tsc --noEmit`, then `cd web && npm run build:web` (alias of `npm run build` = `tsc && vite build`) | `cd web && npm test` (`vitest run`); watch `cd web && npm run test:watch` |
| admin-client | `cd admin-client && npx tsc --noEmit`, then `cd admin-client && npm run build` (`tsc && vite build`) | `cd admin-client && npm test` (`vitest run`); watch `cd admin-client && npm run test:watch` |
| tokens | `npm run tokens:check` at the repo root | n/a; `npm run check:contrast`, `npm run check:utilities` |
| whole repo | `npm run build` (admin → web → backend) | `npm test` (backend → web → admin), `npm run lint` |

Both `npx vitest run [file]` and `npm test` are documented/defined; use the file form for a focused regression test. `AGENTS.md` also names `cd admin-client && npm run build:admin`; that script exists only at the repo root (`npm run build:admin` → `npm run --prefix admin-client build`), so from inside `admin-client/` use `npm run build`.

Local-only browser check: `cd web && npm run test:e2e` (`playwright test`). It is not part of CI.

## Layout and tooling

- **Vitest** in all three packages (`^5.0.1` backend, `^4.1.11` in both frontends). Frontends use jsdom, `globals: true`, `@/` alias, and include `src/**/*.{test,spec}.{ts,tsx}`. `web/vitest.config.ts` excludes `tests/` so Playwright specs do not run under Vitest.
- Setup files: `web/src/test/setup.ts` and `admin-client/src/test/setup.ts` load `@testing-library/jest-dom/vitest`, set React's act environment, stub `matchMedia`, `ResizeObserver`, `scrollIntoView` (and `IntersectionObserver` in web), clear both storages before each test, then `cleanup()` and restore/clear mocks after each test.
- Backend unit/route tests use Vitest with `supertest`; CI runs them against a real Postgres service. Migration and schema-drift checks are CI-only unless a local database is provisioned.
- Frontend tests sit next to the code they cover (`__tests__/` or a `tests/` folder inside the feature, plus `src/shared/**/*.test.ts*`). Use `vi.mock` at the module boundary; keep assertions on behavior, not implementation.
- **Playwright SSO smoke:** `web/tests/sso-smoke.spec.ts` with `web/playwright.config.ts` (`testDir: ./tests`, dev server on 5173 plus built backend on 5001). It mints a token locally to exercise `GET /api/student/google/callback` → `/login?token=…` → dashboard, and skips itself when the local signing secret is unavailable. It reads a local backend env file for that secret and contains identity-shaped fixture values: treat the fixture as human-review material (SEC-5), do not copy it into other tests, and do not expect it to run in CI or on a machine without the local backend.

## Required coverage

- Authorization failures (401/403), invalid input and field-level `details`, empty data, boundaries (pagination, limits, missing ids) and concurrent updates where they matter (`TEST-3`).
- Every fixed bug gets a failing-first regression test (`TEST-2`). Mock the external provider, not the behavior under test.
- Synthetic data only (`TEST-4`, `SEC-5`). No names, roll numbers, emails, rosters or credentials from real students.
- Frontend view states: loading, error with retry, empty with a next action, success. Session bootstrap distinguishes "signed out" from "server unavailable" and must not turn a 500 into a logout.
- Backend: typed errors and the shared response envelope (`requestId`), server-side ownership checks, transaction rollback on failure, and internal-job authentication.

## Regression tests added in Phases 2–4

Recorded in `docs/_work/phase-2-architecture.md` and `docs/_work/phase-4-deadcode.md` (verified by the lead at the time; not re-run by this documentation task):

| Area | Coverage |
|---|---|
| CodeChef internal secret | Phase 2 added the `INTERNAL_SYNC_SECRET` check to the backend tick with five regression tests (`backend/tests/codechef.test.ts`); the tick is no longer unauthenticated. |
| Auth error envelopes | Phase 2 moved auth middleware failures to typed errors handled centrally, preserving the `requestId` envelope (`backend/tests/auth.error-envelope.test.ts`). Frontend normalization is covered in `admin-client/src/shared/api/client.test.ts` (`code`, `details`, `requestId`, 401 vs 500 vs network) and the session decision branches. |
| Public controller delegation | Phase 2 made public controllers delegate to `public.service.ts`; see `backend/tests/public.controller.delegation.test.ts` alongside the route-surface tests. |
| Error sanitization | `backend/tests/errorHandler.sanitization.test.ts` covers the rule that provider/SQL details are not exposed to clients; the frontend renders safe messages via `ApiError`. |
| CodeChef mock gate | Phase 4 gated fixtures behind `import.meta.env.DEV` in both apps; six tests in `web/src/features/codechef/api/index.test.ts` and `admin-client/src/features/codechef/api/index.test.ts` assert production reads the API even when `VITE_CODECHEF_MOCK=true`. |
| Route consolidation | `admin-client/src/features/activity-log/consolidation.test.tsx` asserts `/admin/activity` redirects to the single audit page and the sidebar lists it once. |

Phase 2 notes record four new frontend test files after the hook/dependency-inversion work; the Phase 4 notes record 267 web and 77 admin tests passing after dead-code removal, and 793 backend tests. These are historical results, not new runs.

## CI: what actually runs

From `.github/workflows/ci.yml` (jobs are scoped by changed paths; `ci-ok` is the single required status check):

| Job | Commands |
|---|---|
| backend | `npm ci --ignore-scripts`, `npx prisma generate`, `npx prisma validate`, `npx tsc`, `npm run lint`, `npx prisma migrate deploy`, `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL" --exit-code`, `npm test`, `node scripts/verify-env-guard.js`, `node scripts/verify-esm-interop.js` |
| web | `npm ci --ignore-scripts`, `npm run lint`, `npm test`, `npm run build`, then from the repo root `node tools/check-bundle-size.mjs web/dist` |
| admin | `npm ci --ignore-scripts`, `npm run lint`, `npm test`, `npm run build` |
| design | `node tools/build-tokens.mjs --check`, `node tools/check-contrast.mjs`, `node tools/check-utilities.mjs` |
| migrations (PRs only) | `node tools/check-migrations.mjs "origin/${{ github.base_ref }}"` |
| security | tracked-secret scan, then `npm audit --omit=dev --audit-level=high` in each package as an advisory (`\|\| echo` warns instead of failing) |

CI does **not** run dependency-cruiser, and it does not run the Playwright smoke. Import-cycle checks are local/manual. The Phase 1 note saying CI skips lint and that `check-utilities.mjs` is non-blocking is stale: the current workflow runs lint in all three packages and has no `continue-on-error` on the design checks.

## Coverage gaps and debt

Phase 1 flagged untested areas: web `public-profile`, `codechef`, `events`, `voting`; admin `students`, `codechef`, `email-automation`, `github`, `resources`; backend email automation, voting rules/concurrency, the CodeChef tick, and the learning-home feed. Phases 2–4 added the targeted tests above, so those areas now have partial coverage, not full behavioral suites. Add tests when touching them.

Pre-existing lint warnings are debt, not failures: Phase 4 recorded 0 errors / 137 warnings (web), 0 errors / 103 warnings (admin) and 461 warnings (backend) after cleanup. Phase 1 also recorded a stale token build and 14 utilities with no generated CSS; those were addressed in later phases and are enforced by the design job now. Report failures caused by your change separately from existing debt (`TEST-7`).

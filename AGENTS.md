# AGENTS.md — Engineering Standards for AI Coding Agents

Applies to every agent working in this monorepo: `backend/`, `web/`, `admin-client/`, `shared/`.
This file is the single source of truth for how code is written here. Read it fully before changing anything. If a rule here conflicts with a habit of yours, the rule wins.

Rules carry IDs (`ARCH-3`, `ERR-5`) so they can be searched and cited. When you deviate from a rule, say which one and why in your final report.

## Contents

1. Quality bar
2. Project map
3. Working method
4. Architecture
5. File size and cohesion
6. Reuse and duplication
7. Dead code
8. Error handling standard
9. API contracts
10. Data and database
11. Security and privacy
12. Frontend standards
13. Performance
14. Naming and code style
15. Testing and verification
16. Hard limits (never do)
17. Documentation
18. Self-review checklist
19. Final report format

---

## 1. Quality bar

The goal is a codebase a new engineer can navigate in an afternoon and extend without fear. It must not read as generated code. These are the tells to avoid:

- Giant files that mix unrelated responsibilities.
- The same logic written two or three times with small differences.
- Files named `New`, `Old`, `V2`, `Copy`, `Final`, `Temp`, `Backup`.
- Commented-out code, unused exports, unused files, empty `catch` blocks.
- Comments that narrate the code (`// loop over users`, `// Step 1`), or emoji in code.
- Inconsistent naming and error shapes between modules.
- `any`, `as any`, `// @ts-ignore`, magic numbers, magic strings.
- Mock, demo, or placeholder data reachable in production paths.
- Several different ways to do the same thing (two Prisma clients, two API clients, three error formats).

`QUAL-1` One way to do each thing. Before adding a mechanism, find the existing one and use it. If the existing one is bad, fix it in place and migrate callers; do not add a second.
`QUAL-2` Code is judged by whether it is easy to read, change, and delete. Cleverness is a cost.
`QUAL-3` Leave every file you touch cleaner than you found it, but only inside the scope of the task (see `WORK-6`).

## 2. Project map

```
backend/            Express + Prisma + TypeScript (modular monolith)
  prisma/             schema.prisma, migrations/ (immutable), seed.ts
  src/
    server.ts           app composition only: middleware order, route mounting, startup
    config/             env.ts (validated env), constants.ts
    modules/<name>/     one folder per business domain (see ARCH-2)
    middleware/         cross-cutting HTTP middleware (auth, rate limits, upload, errorHandler)
    infrastructure/     adapters to external systems (database client, email provider)
    jobs/               scheduled work (node-cron)
    utils/              small generic helpers (AppError, asyncHandler, caches, parsers)
  tests/              vitest tests
web/                Student and public site (React 18 + Vite + TypeScript + Tailwind + React Query)
  src/features/<name>/    pages, components, hooks for one domain
  src/shared/             api client, ui primitives, hooks, lib, layout, utils
  src/context/            app-wide providers (session, theme)
admin-client/       Admin portal (same stack, same layout as web)
  src/features/<name>/    pages, components, hooks for admin features
  src/shared/             api client, ui primitives, hooks, lib, layout, utils
shared/             design tokens (tokens.css / tokens.mjs) used by both frontends
tools/              token build, contrast and utility checks
docs/               decisions/ (ADRs), architecture/, perf/, runbooks/
```

Existing domain modules: `admin, announcements, auth, email, events, github, learning-courses, learning-home, learning-progress, learning-quizzes, learning-reports, media, moderation, portfolio, public, students, voting`.
Frontend features (web): `auth, dashboard, directory, events, github, learning, notifications, portfolio, profile, public-profile, resume, teams, video, voting`.
Frontend features (admin-client): `activity-log, analytics, announcements, email-automation, events, github, learning, moderation, registrations, roles, settings, storage, students`.
Path alias in the frontends: `@/*` maps to `src/*`.

If this map and the filesystem disagree, trust the filesystem, then fix this map in the same change.

## 3. Working method

`WORK-1` Inspect before you build. Read the files that own the behavior you are changing, plus their tests and their callers. Reading widely is encouraged; guessing is not.
`WORK-2` Search for an existing solution before writing a new one (order in section 6).
`WORK-3` Plan in two or three sentences for any non-trivial change: what changes, which modules are touched, what could break.
`WORK-4` Implement the smallest design that is also the right design. Fixing a root cause beats patching a symptom. If the root cause sits outside the task, say so in the report instead of silently widening scope.
`WORK-5` Verify with real commands (section 15) and report the real results.
`WORK-6` Scope: change what the task requires and anything the change makes wrong. Do not reformat, rename, or restructure unrelated code. A dedicated cleanup task is the exception, and it follows the process in `CLEAN-*` below.
`WORK-7` If a requirement is ambiguous in a way that changes the architecture, ask one focused question. Otherwise choose the reasonable option, and write the assumption in the report.
`WORK-8` Never invent files, APIs, env vars, schema fields, or test results. If you have not seen it, look it up.

## 4. Architecture

### Backend: layered modules

`ARCH-1` Request flow is `route → controller → service → repository → database`. Dependencies point downward only.
`ARCH-2` Each domain lives in `backend/src/modules/<name>/`:

| File | Responsibility | Must not |
|---|---|---|
| `<name>.routes.ts` | Map HTTP paths to controller methods, attach middleware | Contain logic |
| `<name>.controller.ts` | Parse request, call one service method, shape the response | Touch Prisma, contain business rules |
| `<name>.service.ts` | Business rules, orchestration, transactions, calls to other modules | Import `express`, read `req`/`res` |
| `<name>.repository.ts` | All Prisma queries for this module | Contain business rules |
| `<name>.schemas.ts` | Request validation schemas | Import services |
| `<name>.types.ts` | Types shared inside the module | Contain runtime logic |
| `index.ts` | The module's public surface (what other modules may import) | Re-export everything by default |

A small module keeps these files flat. A module with several sub-areas (like `admin` or `public`) groups them into `controllers/`, `services/`, `repositories/` folders named by sub-domain, not by line count.

`ARCH-3` Other modules import only from a module's `index.ts`. Never deep-import `modules/x/x.repository`.
`ARCH-4` Prisma is used only inside repositories. Controllers and services never call `prisma.*`.
`ARCH-5` Cross-module calls go service to service through the public `index.ts`. Circular imports are a defect; extract the shared piece into a third module or into `utils/`.
`ARCH-6` `server.ts` composes the app. It contains no business logic.
`ARCH-7` External systems (Google Drive, GitHub, Resend, SSO) are wrapped in one adapter each. Business code depends on the adapter's interface, so the provider can be mocked or replaced.
`ARCH-8` Background jobs live in `jobs/`, call services, and contain no queries of their own.
`ARCH-9` Configuration comes only from `config/env.ts`, validated at startup. Do not read `process.env` anywhere else.
`ARCH-10` One Prisma client instance for the whole backend. If two exist, remove one.

### Frontend: features and shared

`ARCH-11` A feature folder (`features/<name>/`) owns its pages, components, hooks, and feature-specific types. Route-level page components stay thin: they compose feature components and hooks.
`ARCH-12` Data access goes through hooks (`useX`) built on React Query and the shared API client. Components do not call the HTTP client directly and do not fetch inside `useEffect`.
`ARCH-13` Anything used by two or more features moves to `shared/`. A feature never imports from another feature's internals; use its public export or lift the piece to `shared/`.
`ARCH-14` Presentational components receive data through props. Hooks hold logic, components hold markup.
`ARCH-15` `web/` and `admin-client/` follow the same folder conventions. Cross-app visual constants live in `shared/tokens.*`, not copied between apps.

## 5. File size and cohesion

There is no line limit. Length is not the problem; mixed responsibilities are. Judge each file by cohesion.

`SIZE-1` A file should have one reason to change. If you can describe it only with "and", it is probably two files.
`SIZE-2` Split a file when at least one of these is true:
  - It mixes layers (HTTP handling plus business rules plus queries).
  - It contains several independent concepts that change for different reasons.
  - Parts of it are reused elsewhere, or should be.
  - A reader must scroll through unrelated code to understand the part they need.
  - Its tests have to mock half the world to cover one behavior.
`SIZE-3` Do not split a file when:
  - It is one cohesive unit: a state machine, a parser, a large type or schema catalog, a lookup table, a component with one clear job and a lot of markup.
  - Splitting would only create tiny files that always change together, or force readers to jump between five files to follow one flow.
  - The only reason is that it feels long.
`SIZE-4` Never split mechanically (`part1.ts`, `helpers2.ts`, `utils.ts` grab-bags). Every extracted file is named after what it does: `computeProfileCompletion.ts`, `mediaUrl.ts`.
`SIZE-5` When you split, keep behavior identical, keep the public import path working (or update every caller in the same change), move the related tests with the code, and run the checks.
`SIZE-6` Prefer many small pure functions to long functions with nested branching. A function does one thing, and its name says what. Early returns beat deep nesting.
`SIZE-7` Components follow the same logic: extract a sub-component when it has its own state, its own reuse, or its own name worth giving. Do not extract just to shorten the parent.
`SIZE-8` `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts` are not allowed as dumping grounds. Group helpers by subject (`dates.ts`, `pagination.ts`).

## 6. Reuse and duplication

`DRY-1` Search order before writing anything new:
  1. The same module, then the same feature.
  2. `shared/` (frontend) or `utils/`, `middleware/`, `infrastructure/` (backend).
  3. Other modules or features that solved a similar problem.
  4. Only then write new code, in the place the next developer would look for it.
`DRY-2` If you find the same logic in a second place, extract it before adding a third copy. Two similar places can be tolerated briefly; three cannot.
`DRY-3` Reuse means one implementation with parameters, not a copy with edits. Do not force unrelated cases into one abstraction; a wrong abstraction is worse than duplication.
`DRY-4` Canonical single implementations (do not re-implement; extend the existing one):
  - HTTP errors: `AppError` and the central `errorHandler` (section 8).
  - Async route wrapping: `asyncHandler`.
  - Pagination parsing and response shape (section 9).
  - Media and file URL building (section 11, `SEC-4`).
  - Frontend API client in `shared/api`.
  - Query keys, toasts, modals, buttons, inputs, skeletons, empty and error states in `shared/ui`.
  - Colors, spacing, radii and typography from design tokens.
`DRY-5` Types shared by backend and a frontend are defined once and imported, not retyped on each side. If they cannot share a package yet, keep one authoritative definition and mirror it deliberately, with a comment pointing to the source.
`DRY-6` Constants, limits, and status strings are defined once and imported. No magic numbers or repeated string literals for statuses, roles, or limits.

## 7. Dead code

`DEAD-1` Remove code that is unused. Delete it; do not comment it out and do not rename it `_unused`.
`DEAD-2` Before deleting, prove it is unused: search every import and reference across all three packages, check dynamic and string-based usage (route names, query keys, env var names), and confirm with the type checker after removal.
`DEAD-3` Unused files, exports, parameters, dependencies, env vars, routes, CSS classes, and database fields all count. Database columns and migrations are never deleted as "dead code" without an explicit migration task.
`DEAD-4` Barrel `index.ts` files exist only where they define a module's public surface (`ARCH-3`). Remove barrels that merely re-export.
`DEAD-5` Leftover legacy folders and duplicate implementations from past refactors are defects. When a feature has moved to `modules/` or `features/`, the old location is deleted in the same change.
`DEAD-6` `TODO` and `FIXME` need an owner or an issue reference, or they are removed. Do not leave "temporary" code.
`DEAD-7` No `console.log` in committed code. Use the logger (`ERR-12`).

## 8. Error handling standard

One error model, end to end: thrown once at the source, translated once at the boundary, shown once to the user.

### Backend

`ERR-1` Failures are thrown as typed errors. Define subclasses of `AppError` in `utils/appError.ts` (extend that file; do not create a second error system):

| Class | HTTP | Code (default) | Use for |
|---|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` | Bad input, with field details |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Missing or invalid session |
| `ForbiddenError` | 403 | `FORBIDDEN` | Authenticated but not allowed |
| `NotFoundError` | 404 | `NOT_FOUND` | Missing resource |
| `ConflictError` | 409 | `CONFLICT` | Duplicate or state conflict |
| `RateLimitError` | 429 | `RATE_LIMITED` | Too many requests |
| `UpstreamError` | 502/503 | `UPSTREAM_FAILURE` | Drive, GitHub, email provider failures |

Domain-specific codes (`ALREADY_VOTED`, `EVENT_CLOSED`) are allowed, are `UPPER_SNAKE_CASE`, and are listed in one place per module (`<name>.errors.ts`) so they can be found and reused.

`ERR-2` Services and repositories throw. Controllers do not catch just to re-send an error; they let it propagate.
`ERR-3` Every async handler is wrapped in `asyncHandler`. A handler that can reject without it is a defect.
`ERR-4` The central `errorHandler` middleware is the only place that turns an error into an HTTP response. Controllers never write `res.status(500).json(...)` for a failure. The legacy `httpError` helper in `middleware/apiError.ts` is deprecated: migrate its callers to thrown `AppError`s and delete it.
`ERR-5` Response envelope for every error, unchanged keys plus additive ones so existing clients keep working:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Human-readable, safe to show to the user.",
  "details": [{ "field": "email", "message": "Must be a valid email" }],
  "requestId": "req_8f3a..."
}
```

`details` is present only for validation failures. `requestId` is always present.
`ERR-6` Never expose `err.message`, stack traces, SQL, Prisma text, file paths, or provider responses to the client in production. Unknown errors become `INTERNAL_SERVER_ERROR` with a generic message. The detailed error goes to the log with the same `requestId`.
`ERR-7` Map known infrastructure errors in one place (the error handler or a mapper it calls): Prisma `P2002` to 409, `P2025` to 404, `P2003` to 409, Multer limits to 400 with a clear code, JWT errors to 401, provider timeouts to 503.
`ERR-8` Validate input at the boundary with the module's schemas, before the service runs. Validation failures return all field errors at once, not one at a time.
`ERR-9` Never swallow errors. `catch {}` and `.catch(() => {})` are forbidden. If a failure is intentionally non-fatal (thumbnail generation, an email send), catch it, log it with context at `warn`, and make the non-fatal decision explicit in a comment explaining why.
`ERR-10` Wrap failures from external systems at the adapter: convert provider errors into `UpstreamError` with a stable code. Services never see raw SDK errors.
`ERR-11` Use transactions for multi-step writes. A failure leaves data unchanged, never half-written.
`ERR-12` Logging: one structured logger (JSON in production), levels `error | warn | info | debug`. Each request gets a `requestId` (accept an incoming header or generate one), attached to every log line and returned in the response. Log: who (user id, never email or PII), what (route, module, operation), outcome, duration. Never log secrets, tokens, passwords, or personal data.
`ERR-13` Expected client errors (4xx) log at `info` or `warn`; unexpected errors (5xx) log at `error` with the stack.
`ERR-14` Health: `/health` (process up) and `/ready` (database and critical dependencies reachable) stay accurate and cheap.

### Frontend

`ERR-15` The shared API client converts every failed response and network failure into one `ApiError` type: `{ code, message, status, details?, requestId? }`. Components never parse raw axios errors.
`ERR-16` User-facing text comes from a single code-to-message mapping with sensible fallbacks, not from `error.message` of the server. Network and timeout errors have their own friendly messages and a retry action.
`ERR-17` Every data view handles four states explicitly: loading (skeleton, not blank), error (message plus retry), empty (honest empty state), success. No view renders nothing on failure.
`ERR-18` An app-level `ErrorBoundary` and a route-level boundary exist so a crashing component never blanks the whole shell. The shell (header, navigation) keeps working.
`ERR-19` Field-level validation errors from `details` render inline next to the fields. Non-field errors use the shared toast. Never use `alert()` or `console.error` as user feedback.
`ERR-20` React Query is configured once with sane defaults for retries (no retry on 4xx) and global error handling for 401 (redirect to sign-in) and 403. Mutations show success and failure feedback through the shared toast.
`ERR-21` Async buttons are disabled while pending, show a pending state, and cannot double-submit.

## 9. API contracts

`API-1` Routes are nouns, plural, kebab-case. Verbs only for real actions (`POST /events/:id/publish`).
`API-2` Status codes mean what they say: 200 read or update, 201 create, 204 delete, 400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 429 rate limited.
`API-3` List endpoints are paginated with `page` and `limit` (limit has a hard maximum) and return the total count so the client can render pages. No unbounded list.
`API-4` Search is one `search` parameter where possible, with filters as separate named parameters.
`API-5` Responses expose stable DTOs shaped for the client, never raw database rows. Internal identifiers and heavy columns (`Bytes`, storage file ids) are excluded by explicit `select`.
`API-6` Changing an existing response shape requires keeping the old fields working until every consumer is updated in the same change. Do not break clients silently.
`API-7` Cacheable public reads set `Cache-Control` deliberately. Anything personal is `private` or `no-store`.

## 10. Data and database

`DB-1` Every query selects the fields it needs. No `select *` behavior on wide tables, and never load binary columns (thumbnails) in list queries.
`DB-2` No N+1: fetch related data with `include`/`select` or one batched `findMany` plus an in-memory map.
`DB-3` Every filter, sort, and join used on a hot path has an index. Add indexes through a migration, justified by a real query.
`DB-4` Schema changes are new migration files only. Existing migrations are never edited. Destructive changes need an explicit task and a data plan.
`DB-5` Uniqueness and integrity are enforced by the database (`@@unique`, foreign keys), never only by a check in code. Handle the resulting `P2002` as a normal conflict (`ERR-7`).
`DB-6` Multi-step writes use `prisma.$transaction`.
`DB-7` Bulk writes use `createMany`/`updateMany` or batching, not a loop of awaited single writes.
`DB-8` Runtime uses the pooled connection string; migrations use the direct one (`directUrl`). Keep connection limits sized for the host.
`DB-9` Long-lived data grows only with retention in mind: log-like tables get a cleanup policy.

## 11. Security and privacy

`SEC-1` Authorization is enforced on the server for every protected operation, by middleware plus an ownership check in the service. Hiding a button is not security.
`SEC-2` Validate and sanitize all input at the boundary. Use parameterized queries only (Prisma). No string-built SQL.
`SEC-3` Secrets and private config stay on the server. Production refuses to start with default or missing secrets.
`SEC-4` Never expose storage identifiers (Google Drive file or folder ids) or direct storage URLs to clients. Clients receive opaque, app-owned URLs (for example `/api/public/media/<type>/<recordId>`); the server resolves the real file and streams it. Any response, query result, log, or frontend code containing a raw Drive id or a `drive.google.com` link is a defect.
`SEC-5` Student personal data (names, roll numbers, emails, rosters, credentials) never enters the repository, logs, tests, fixtures, or screenshots. Test data is synthetic.
`SEC-6` Rate-limit authentication, uploads, search, and any public endpoint that reaches the database.
`SEC-7` Uploads are validated by size and by real content (magic bytes) against an allowlist, not by extension or declared type.
`SEC-8` Session tokens live in httpOnly, secure, sameSite cookies. Do not put tokens in `localStorage` or URLs.
`SEC-9` Public pages expose only what the owner has chosen to publish. Visibility toggles are honored in the query itself, not filtered in the UI.
`SEC-10` Security headers (CSP, HSTS, `X-Content-Type-Options`, frame protection) are set centrally.

## 12. Frontend standards

`UI-1` Use design tokens for color, spacing, radius, typography, and shadows. No hardcoded palette classes (`bg-slate-900`, `text-rose-400`) or hex colors in components. If a needed token does not exist, add it to `shared/tokens.*` and rebuild tokens (`npm run tokens`).
`UI-2` Build from shared primitives (Button, Input, Modal, Toast, Skeleton, EmptyState, ErrorState). Do not hand-roll a second version of any of them.
`UI-3` Layouts are responsive by default. Mobile first, with breakpoints for larger screens. No fixed pixel widths for page structure, no horizontal page scroll. Wide tables scroll inside their own container.
`UI-4` On small screens dialogs are bottom sheets; on larger screens they are centered panels. Touch targets are at least 44px.
`UI-5` Every interactive element has an accessible name, a visible focus state, and works with the keyboard. Icon-only buttons have labels.
`UI-6` Motion is functional and restrained: short transitions for state changes, nothing decorative, and `prefers-reduced-motion` is respected. Do not add an animation library to a view that does not need one.
`UI-7` Forms: one validation approach, inline field errors, disabled-while-pending submit, and clear success feedback.
`UI-8` Server state lives in React Query. Local component state is for UI-only concerns. Avoid global state unless two distant parts of the tree truly share it. Query keys come from one factory per feature.
`UI-9` No mock or placeholder data in rendered output. Empty data shows a real empty state.
`UI-10` Dark and light themes both work through tokens. A component that only looks right in one theme is a defect.

## 13. Performance

`PERF-1` Routes are code-split. Public pages must not pull in authenticated app code.
`PERF-2` Images: correct dimensions, modern format, `loading="lazy"` below the fold, `decoding="async"`, and thumbnails in lists instead of full files.
`PERF-3` Heavy media (video, PDF) loads on demand, not on page load. Use `preload="none"` and a poster.
`PERF-4` Parallelize independent requests. Never chain awaits that do not depend on each other.
`PERF-5` Cache with intent: React Query `staleTime` defaults for most data; short `Cache-Control` for public reads; versioned URLs (content id in the URL) for long-lived immutable assets so a replaced file is never served stale.
`PERF-6` Debounce search inputs, cancel superseded requests, and require a minimum query length.
`PERF-7` Do not add a dependency for something the platform or an existing dependency already does. New dependencies need a one-line justification in the report, including size impact on frontends.
`PERF-8` Measure before optimizing. Report before and after for performance changes.

## 14. Naming and code style

`STYLE-1` Files: React components `PascalCase.tsx`, hooks `useThing.ts`, everything else `camelCase.ts` or `kebab-case` consistently per package. Backend module files use `<module>.<role>.ts`. Match the neighbors.
`STYLE-2` Names say what a thing is or does: `getPublicProfile`, `isEventOpen`, `studentRepository`. Booleans start with `is/has/can/should`. Functions are verbs, types and components are nouns. No abbreviations beyond the common (`id`, `url`, `dto`).
`STYLE-3` TypeScript strict. No `any`; use `unknown` and narrow, or define the type. No non-null assertions (`!`) to silence the compiler without a reason. Export types for public contracts.
`STYLE-4` Comments explain why, constraints, and non-obvious decisions. They never restate the code. Delete comments that have gone stale.
`STYLE-5` Use async/await, not promise chains. Use `const`. Prefer immutable updates. Keep functions short and flat.
`STYLE-6` Imports: external first, then internal aliases, then relative. No circular imports. Use the `@/` alias in the frontends instead of long `../../..` chains.
`STYLE-7` One export style per file kind: components and hooks use named exports unless the router needs a default for lazy loading.
`STYLE-8` Follow the formatter and linter configuration. Do not mix formatting changes into logic changes.

## 15. Testing and verification

`TEST-1` Every behavior change ships with tests at the right level: unit tests for business rules, integration tests for API and database behavior (vitest and supertest in `backend/tests`), component and hook tests in the frontends, and end-to-end tests for critical journeys.
`TEST-2` Every fixed bug gets a regression test that fails without the fix.
`TEST-3` Test authorization failures, invalid input, empty data, boundaries, and concurrent updates where they matter.
`TEST-4` Tests use synthetic data only (`SEC-5`).
`TEST-5` After changes, run the checks for each package you touched, and report the actual output:

| Package | Typecheck / build | Tests |
|---|---|---|
| backend | `cd backend && npx tsc --noEmit` | `cd backend && npx vitest run [file]` |
| web | `cd web && npx tsc --noEmit` and `npm run build:web` | `cd web && npm test` |
| admin-client | `cd admin-client && npx tsc --noEmit` and `npm run build:admin` | `cd admin-client && npm test` |
| tokens | `npm run tokens:check` | n/a |

`TEST-6` Never claim a check passed unless you ran it and saw it pass. If you could not run something (missing environment, blocked network), say exactly that. "Not run" is acceptable; a false "passed" is not.
`TEST-7` Fix failures caused by your change. Pre-existing failures you notice are reported, not hidden and not silently fixed in unrelated code.

## 16. Hard limits (never do)

- **Git:** never commit to `main`, never push, never force-push, reset, rebase, or switch branches unless explicitly told to. Work on the current branch and leave changes uncommitted unless asked to commit.
- **Secrets and data:** never read, print, copy, or commit `.env*`, keys, tokens, credentials, rosters, or any spreadsheet containing student data (`*.xlsx`). Never add student personal data to any file.
- **Database:** never run `prisma migrate`, `db push`, `prisma:seed`, `roster:import`, or destructive SQL against any shared database. Never edit an existing migration. Creating a new migration file is allowed when a task needs a schema change; applying it is a human step.
- **Integrity:** never disable or weaken auth, CORS, rate limits, validation, or security headers to make something work.
- **Scope:** never delete features, routes, or data to make a task easier. Never replace real functionality with mock data.
- **Honesty:** never mark unfinished work as done, never fabricate output.

## 17. Documentation

`DOC-1` Keep this file accurate. When you change the architecture, folder layout, error model, or a standard, update this file in the same change.
`DOC-2` Record each significant architectural decision as a short note in `docs/decisions/NNNN-title.md`: context, decision, consequences. One page maximum.
`DOC-3` Keep `.env.example` complete and current for every env var the code reads, with a short comment per variable.
`DOC-4` Each module may have a short `README.md` only if its purpose or public surface is not obvious from its files. Do not write documentation that repeats the code.

## 18. Self-review checklist

Before reporting, check your own diff against this list. Fix anything that fails.

- [ ] Does it do what was asked, and nothing that breaks adjacent behavior?
- [ ] Did I search for an existing implementation first (`DRY-1`)? Is any logic now duplicated?
- [ ] Is every new file in the layer and folder where the next developer would look?
- [ ] Does each file and function have one clear responsibility (`SIZE-1`)?
- [ ] Are errors thrown as typed errors, handled centrally, with no swallowed failures (`ERR-*`)?
- [ ] Is every list paginated and every query selecting only what it needs (`DB-*`, `API-3`)?
- [ ] Is authorization enforced on the server (`SEC-1`)? Is any storage id or personal data exposed (`SEC-4`, `SEC-5`)?
- [ ] Do loading, error, empty, and success states all exist for new views (`ERR-17`)?
- [ ] Tokens and shared primitives used, no hardcoded colors (`UI-1`, `UI-2`)?
- [ ] No dead code, commented-out code, `console.log`, `any`, magic values, or leftover duplicates?
- [ ] Do comments explain why instead of narrating?
- [ ] Do tests cover the change, and did I actually run the checks (`TEST-5`, `TEST-6`)?
- [ ] Did I update docs, `.env.example`, and this file if the change required it?

## 19. Final report format

End every task with a short report:

1. **What changed:** the behavior, in two or three sentences.
2. **Files:** created, modified, deleted (grouped by package).
3. **Verification:** each command run and its real result; anything not run, with the reason.
4. **Assumptions and deviations:** any rule bent, with its ID and why.
5. **Found but not fixed:** pre-existing problems noticed outside the scope.

---

## Appendix: cleanup tasks (`CLEAN-*`)

A cleanup task is a behavior-preserving restructure. These rules override `WORK-6` for the duration of the task.

`CLEAN-1` Record the baseline first: typecheck, tests, and build results for every package, before touching anything.
`CLEAN-2` Work in phases, one concern per phase (dead code, duplication, error standard, structure, naming). Verify after each phase; do not stack phases before verifying.
`CLEAN-3` Behavior must not change. If a change would alter observable behavior, stop and report it instead of doing it.
`CLEAN-4` Delete only what is proven unused (`DEAD-2`). Prove duplication by reading both copies before merging them.
`CLEAN-5` Split files by responsibility (`SIZE-2`), never to hit a number. Leave cohesive large files alone (`SIZE-3`).
`CLEAN-6` When a legacy location is replaced, delete it and update every caller in the same phase.
`CLEAN-7` Finish with a diff summary: files removed, files merged, duplicates eliminated, and the before and after of the baseline checks.

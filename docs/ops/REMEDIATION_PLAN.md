# Remediation Plan — Phases, Ownership, Exit Criteria

Source: repo audit of `web/`, `admin-client/`, `backend/` (see §0 baseline).
Status legend: `PENDING` · `IN PROGRESS` · `DONE` · `BLOCKED`

Every phase runs **two agents in parallel** with **disjoint file ownership**. A file may be edited by
exactly one agent per phase. Phases run sequentially because later phases depend on earlier decisions.

Hard rules for every agent (from `AGENTS.md` §16): work on the current branch, never commit/push,
never run `prisma migrate` / `db push` / `seed`, never edit an existing migration, never weaken auth,
never read `.env*`, never invent file paths or test results.

---

## 0. Baseline (recorded before touching anything) — DONE

| Check | Result |
|---|---|
| `backend npx tsc --noEmit` | 0 errors |
| `web npx tsc --noEmit` | 0 errors |
| `admin-client npx tsc --noEmit` | 0 errors |
| `backend vitest run` | 52 files / 493 tests pass |
| `web vitest run` | 16 files / 170 tests pass |
| `admin-client vitest run` | 4 files / 24 tests pass |
| `eslint` web / admin / backend | 0 / **2** / **1** errors |
| `npm run tokens:check` | up to date |

Regression gate for every phase: all three typechecks clean, all three test suites green,
no new lint errors.

---

## Phase 1 — Server resilience (stop the bleeding) — DONE

**Result:** `backend/src/infrastructure/processGuards.ts` installed from `server.ts`; 48 handlers across
5 route files wrapped in `asyncHandler`; `getAdminEvents` no longer throws from `catch`; public/media/auth
failure paths now throw typed `AppError`s. Verification: `tsc` 0 errors, **54 files / 508 tests pass**,
eslint 1 error (pre-existing `quizzes.grader.ts`), net −192 lines.

**Why:** one failed events query can terminate the Node process; 93 route handlers are missing
`asyncHandler`.

| Agent | Owns | Work |
|---|---|---|
| **1A** | `backend/src/server.ts`, `backend/src/infrastructure/processGuards.ts` (new), `backend/tests/processGuards.test.ts` (new), `backend/src/modules/events/events.routes.ts`, `backend/src/modules/public/public.routes.ts`, `backend/src/modules/media/media.routes.ts`, `backend/src/modules/auth/auth.routes.ts`, `backend/src/modules/students/routes/video.routes.ts` | Add `unhandledRejection` / `uncaughtException` guards that log via the structured logger and shut down cleanly. Wrap every handler in the 5 non-admin route files in `asyncHandler` (93 − 51 admin = 42 routes). |
| **1B** | `backend/src/modules/events/events.controller.ts`, `backend/src/modules/public/controllers/*.ts`, `backend/src/modules/media/*.controller.ts`, `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/students/controllers/video.controller.ts` | Remove the `throw`-inside-`catch` at `events.controller.ts:38`. Replace manual `res.status(4xx/5xx)` failure responses with thrown typed `AppError`s so the central `errorHandler` is the only place that writes a failure. Never leak `err.message`. Add/extend tests. |

**Exit:** `GET /admin/api/events` failure no longer produces an unhandled rejection; a rejected
handler reaches `errorHandler`; new test proves both.

---

## Phase 2 — Broken endpoints (the 404 cluster) — DONE

**Result:** moderation generalised to `/:type/:id` for decide / visibility / delete / request-changes across all
5 types incl. a new `GET /moderation/projects`; `POST /roles/assign`, `POST /storage/ensure-viewer-permissions`
(wraps existing `driveService.ensureAllFilesViewerAccess()`), `GET /submissions/export` added.
Admin client: queue survives a single failing call (`Promise.allSettled`), dead change-request + projects
methods removed, exports on one helper.
Verification: backend `tsc` 0 / **56 files · 545 tests**, admin `tsc` 0 / **10 files · 49 tests**,
eslint unchanged (1 backend, 2 admin pre-existing errors).

**Carried forward:** `GithubProjectsTable` renders GitHub-repo fields but was fed portfolio-project rows.
Real source is `githubApi.getGithubShowcasedProjects()` → `/admin/api/portal/github/projects`. Fixed in Phase 3B.

**Why:** moderation queue never loads; 6 admin actions silently 404.

**Binding contract (both agents implement exactly this):**

| Method + path | Body / query | Response |
|---|---|---|
| `GET /admin/api/moderation/projects` | – | `{ items: ModerationProjectItem[] }` |
| `PATCH /admin/api/moderation/:type/:id` | decision payload | same shape the old per-type routes returned |
| `PATCH /admin/api/moderation/:type/:id/visibility` | `{ isPublic }` | `{ success }` |
| `DELETE /admin/api/moderation/:type/:id` | – | `{ success }` |
| `POST /admin/api/moderation/:type/:id/request-changes` | `{ note? }` | `{ success }` |
| `POST /admin/api/roles/assign` | `{ adminId, roleId }` | `{ success, assignment }` |
| `POST /admin/api/storage/ensure-viewer-permissions` | – | `{ success, message, count, failed }` (wraps existing `driveService.ensureAllFilesViewerAccess()`) |
| `GET /admin/api/submissions/export?eventId=` | – | xlsx; `/admin/api/export/excel` keeps working as an alias |

`:type` ∈ `videos \| resumes \| certificates \| achievements \| projects`.

| Agent | Owns | Work |
|---|---|---|
| **2A (backend)** | `backend/src/modules/moderation/moderation.routes.ts`, `backend/src/modules/moderation/moderation.controller.ts`, `backend/src/modules/moderation/*.service.ts`, `backend/src/modules/admin/admin.routes.ts`, `backend/src/modules/admin/controllers/roles.controller.ts`, `backend/src/modules/admin/controllers/storage.controller.ts`, `backend/tests/moderation*.test.ts` | Add `GET /moderation/projects`; generalise decision to `PATCH /moderation/:type/:id` for all 5 types; add `PATCH /moderation/:type/:id/visibility`; add `DELETE /moderation/:type/:id`; serve `request-changes` on the same mount the client uses. Add `POST /roles/assign`. Add `POST /storage/ensure-viewer-permissions` (or remove the client method — see 2B). Add `GET /submissions/export` as an alias of `exportSubmissions`. |
| **2B (admin client)** | `admin-client/src/features/moderation/api/index.ts`, `admin-client/src/features/moderation/hooks/useModeration.ts`, `admin-client/src/features/registrations/api/index.ts`, `admin-client/src/features/roles/api/index.ts`, `admin-client/src/features/storage/api/index.ts`, `admin-client/src/features/settings/api/index.ts` | Decouple the moderation queue from the projects call (`Promise.allSettled` or separate query) so one 404 can't blank the page. Point the submissions export at the canonical route. Delete the uncalled `change-request` methods. Normalise all role calls onto one prefix. |

**Exit:** moderation page loads; approve/reject/hide/delete work for all five types; every exports
card resolves; role assignment succeeds; no client method targets a non-existent route.

---

## Phase 3 — Route surface cleanup (shadowing) — DONE

**Result:** academic-year mounted once; duplicate path definitions removed — dead `adminSettingsRouter`
(`/settings`, `/skills`), dead `adminPortalVotingRouter`, shadowed `portalModerationRouter.get('/moderation')`,
and the shadowed `getPortalStudents` list (client list uses the roster; detail uses `/portal/students/:id`).
`GithubProjectsTable` now receives GitHub-repo rows from `githubApi.getGithubShowcasedProjects()`, typed as
`GithubShowcasedProject` instead of `any`.
New guards: `backend/tests/routeSurface.test.ts` replays **89** client `METHOD path` pairs and requires
**401/403, never 404**; `server.mounts.test.ts` pins the single academic-year mount.
Verification: backend `tsc` 0 / **58 files · 637 tests**, admin `tsc` 0 / **10 files · 47 tests**,
eslint unchanged (1 backend, 2 admin pre-existing).

**Why:** `adminPortalRouter` is mounted twice; four paths are defined by two routers; academic-year
is mounted at two bases.

**Decisions (binding for this phase, revised after measuring the client surface):**
- The admin client calls **45 distinct paths**, listed by method in `backend/tests/routeSurface.test.ts`.
  Both `adminPortalRouter` mounts stay: the client uses both `/admin/api/...` (announcements,
  analytics-by-alias) and `/admin/api/portal/...` (events, roles, settings, github). The duplicate
  mount is *not* the bug — duplicate path *definitions* are.
- `adminSettingsRouter` `/settings` + `/skills` are dead (client uses `/admin/api/portal/settings`) — delete.
- `adminPortalVotingRouter` is shadowed on every path the client uses by `adminVotingRouter` — delete.
- `portalModerationRouter.get('/moderation')` is shadowed by `adminModerationRouter` — delete.
- Student list: verify the shape `features/students` consumes, then delete the losing implementation.
- Academic year: single mount at `/admin/api/academic-year`; the `/api/admin/academic-year` duplicate goes.
- **Carried forward:** `useModeration.githubProjects` is fed portfolio rows but `GithubProjectsTable`
  renders GitHub-repo fields; source it from `githubApi.getGithubShowcasedProjects()`.

| Agent | Owns | Work |
|---|---|---|
| **3A** | `backend/src/server.ts`, `backend/tests/routeSurface.test.ts` (new) | Single academic-year mount + a comment documenting the two-mount alias. New test: for every `METHOD path` the admin client calls, an unauthenticated request must return **401/403, never 404** — the permanent guard against dead routes. |
| **3B** | `backend/src/modules/admin/{admin.routes.ts,admin.controller.ts,services/*.ts,index.ts}`, `backend/src/modules/moderation/{moderation.routes.ts,index.ts}`, `backend/src/modules/voting/{voting.routes.ts,index.ts}`, `admin-client/src/features/moderation/{api,hooks,types.ts}` | Delete `adminSettingsRouter` `/settings` + `/skills`, `adminPortalVotingRouter`, `portalModerationRouter.get('/moderation')`, and the losing `/students` implementation. Point `githubProjects` at `githubApi.getGithubShowcasedProjects()` and type it. |

**Exit:** route-surface test passes; no duplicated `METHOD path` under `/admin/api`.

---

## Phase 4 — Admin error-handling normalisation — DONE

**Result:** all **41** registrations in `admin.routes.ts` wrapped in `asyncHandler` (was 38 unwrapped), with a
statement-aware regression test that fails on any future unwrapped route. All **42** manual failure writes across
the 7 admin controllers replaced by thrown typed `AppError`s — only `res.status(416)` (range semantics) remains.
No response body carries `err.message`. `alreadyPromoted` preserved via `AppError.extra`.
Verification: `tsc` 0, **60 files · 658 tests pass**, eslint 1 pre-existing error.
Also hardened `validation.service.test.ts` with a 30 s per-test timeout: a cold `import('file-type')` (ESM) can
exceed the 5 s default and made the suite fail intermittently — reproduced once, green on every re-run.

**Carried forward:** admin success bodies still return raw Prisma rows in places (`updateSubmission`,
`deleteSubmission`, `getPortalStudentDetail`, `getSubmissionDetail` expose `driveFileId`) — `API-5` + `SEC-4`.
Needs its own DTO task; scheduled as Phase 7C below.

| Agent | Owns | Work |
|---|---|---|
| **4A** | `backend/src/modules/admin/admin.routes.ts`, `backend/tests/adminRoutes*.test.ts` | Wrap all admin handlers in `asyncHandler`. (`middleware/apiError.ts` no longer exists — `httpError` was already removed; nothing to delete. Correct this note when the phase starts.) |
| **4B** | `backend/src/modules/admin/controllers/*.ts`, `backend/src/modules/admin/services/*.ts` (only where a signature changes) | Replace manual failure responses with thrown `AppError` subclasses. Remove every `message: err.message` on a 4xx/5xx body. Return DTOs only, never raw rows. |

**Exit:** zero `res.status(500|400|404|403)` failure writes left in admin controllers; no `err.message`
in a response body; admin test suite green.

---

## Phase 5 — Dead code deletion — DONE

**Result:** 51 source files deleted (~1,400 lines) plus ~60 dead declarations and barrel re-exports in the backend.

| Package | Files deleted | Reachability after |
|---|---|---|
| `web` | 36 | `DEAD: 2` — only `test/setup.ts` + `vite-env.d.ts` (config-referenced) |
| `admin-client` | 7 | `DEAD: 2` — same two config files |
| `backend` | 8 (incl. `portfolio.repository.ts` 151 lines) | `DEAD: 1` — `types/compression.d.ts` (an ambient declaration, correctly kept) |

Backend unused-export candidates fell 142 → 57, and every remaining one is a locally-used declaration
with a redundant `export` keyword (not dead code) except `mediaRouter`, kept deliberately.
Verification: `tsc` 0 in all three packages, **backend 60 files · 658 tests**, **web 16 · 170**,
**admin 9 · 40**, eslint **0 errors in web and admin**, 1 pre-existing error in backend, `build:web` and
`build:admin` both succeed.

**Deliberate non-deletions (reported, not done):** `mediaRouter` is never mounted — wire-or-delete is a product
decision; `resend` is now an unused dependency; `emailEnabled` kept because it is the only consumer of
`RESEND_API_KEY`; `web/src/shared/lib/motion.ts` is live (only many of its exports are unused).

**Carried forward:**
- `admin-client/src/services/api.test.ts` (7 tests) covered `getMe` failure propagation — the module was dead,
  but the *behaviour* is real and is now untested. Ported in Phase 6A.
- `platformIcons.tsx` and `test/setup.ts` are byte-identical between the two frontends. They are separate Vite
  build roots with no shared TS package, so de-duplicating them means building a workspace package — out of scope.
  Documented as accepted duplication instead.

| Agent | Owns | Work |
|---|---|---|
| **5A (backend)** | all of `backend/src` + `backend/tests` | Delete the dead `students.controller.ts` barrel. Delete `modules/portfolio/portfolio.repository.ts` (20 of 23 exports unreferenced; services use Prisma directly). Delete `modules/github/services/github.api.service.ts` if the class is unreferenced. Remove `REVIEW_PROS`/`REVIEW_CONS` from `config/constants.ts`. Prune the unreferenced repository functions in `admin/repositories/{settings,students,stats}.repository.ts`, `students/students.repository.ts`, `moderation/moderation.repository.ts` (the four `findPortal*` helpers). Delete matching tests. |
| **5B (frontend)** | all of `web/src`, `admin-client/src` | Delete the 35 unreachable `web` files (24 barrels, `src/types/index.ts`, `components/GithubInstructions.tsx`, `shared/lib/motion.ts` if fully unreferenced, `shared/layout/MoreSheet.tsx`, `features/portfolio/hooks/useProjects.ts`, `features/portfolio/types.ts`) and the 6 unreachable `admin-client` files (4 barrels, `services/api.ts`, `features/learning/components/YouTubePreview.tsx`). Never delete `src/test/setup.ts`, `src/vite-env.d.ts`, or `*.d.ts`. Report unused `package.json` deps instead of removing them. |

**Exit:** import-graph scan reports zero unreachable source files; typecheck + tests green.

---

## Phase 6 — Duplicate consolidation — IN PROGRESS

**Measured:** `features/activity-log` ships **two** full implementations — `ActivityLogPage` (route `/admin/activity`,
raw `useEffect` fetch through `api.ts`, a 1-line shim for `api/index.ts`) and `AuditLogsPage` (route `/admin/audit-logs`,
React Query through `useActivityLogs`), with **two** sidebar entries. Learning mock data is gated only on
`VITE_LEARNING_MOCK === 'true'`, so a production build that sets that variable renders 402 lines of fixtures.
Backend: **13 services** import Prisma directly; the portfolio module is the largest single offender (4 services, 30 calls).

| Agent | Owns | Work |
|---|---|---|
| **6A (frontend)** | `admin-client/src/features/activity-log/**`, `admin-client/src/App.tsx`, `admin-client/src/shared/layout/Sidebar.tsx`, `web/src/features/learning/api/index.ts`, `admin-client/src/features/learning/api/index.ts`, `admin-client/src/shared/api/**` (new test only) | One activity-log implementation: keep `AuditLogsPage` + `useActivityLogs`, delete `ActivityLogPage`/`ActivityLogView`/the `api.ts` shim, keep `/activity` as an alias route, one sidebar entry. Gate learning fixtures behind `import.meta.env.DEV`. Port the 7 deleted `getMe` cases onto `shared/api`. |
| **6B (backend)** | `backend/src/modules/portfolio/**` (services, new `portfolio.repository.ts`, `index.ts`), `backend/tests/**` | Move all 30 `prisma.*` calls out of the 4 portfolio services into one repository (`ARCH-4`), preserving `$transaction` boundaries exactly. No behaviour or signature change. The 3 GitHub services (41 calls) are reported, not refactored here. |

**Exit:** one implementation per domain; no `prisma` import in a service that has a repository;
typecheck + tests green.

---

## Phase 7 — Standards, security, docs, final gate — PENDING

| Agent | Owns | Work |
|---|---|---|
| **7A** | the 3 lint-error files, `admin-client/src/features/moderation/hooks/useModeration.ts`, `admin-client/src/features/moderation/components/ModerationReviewModal.tsx`, `web/.env.production` (report only, do not read contents) | Fix `eqeqeq` ×2 and `no-useless-assignment` ×1. Remove raw `drive.google.com` link construction (SEC-4) in favour of an app-owned media URL. Replace tracked `web/.env.production` with `.env.example` guidance (never print values). |
| **7B** | `docs/ops/REMEDIATION_PLAN.md` (status column), `docs/decisions/0004-admin-route-surface.md` (new), `docs/decisions/0005-error-model-conformance.md` (new), `AGENTS.md` (only if §2 map drifted) | Record the two decisions, update phase statuses, refresh the project map if folders changed. |

**Final gate (orchestrator, not an agent):** all three `tsc --noEmit`, all three `vitest run`,
`eslint src` for all three packages, `npm run tokens:check`, `npm run build:web`, `npm run build:admin`,
`npm run build:backend`. Report real output.

---

## Work split summary (2 agents per phase, equal weight)

| Phase | Agent A | Agent B |
|---|---|---|
| 1 | infra guard + 42 route wraps | 5 controller families |
| 2 | 9 backend route/controller fixes | 6 admin client API modules |
| 3 | `server.ts` + route-surface test | 4 duplicate definitions + 1 client path |
| 4 | 51 route wraps + delete `apiError` | ~17 admin controllers |
| 5 | backend deletions + 77 exports | frontend deletions + 21 exports |
| 6 | admin activity-log + shared dupes + fixtures | portfolio/github service refactor |
| 7 | lint errors + SEC-4 + env hygiene | ADRs + status + docs |

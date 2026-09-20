# Design: Scalable + Agile Self-Introduction Portal

Date: 2026-09-20
Status: Approved (interactive design session)

## 1. Objective

Rearchitect the Self-Introduction Portal for institution-scale reliability, low operational
load, and a handoff-friendly agile workflow. Confirmed realistic scale: one institution, ~400
students/season, one peak upload window, 1-3 admins. "Scalable" here means a clean growth
story without a distributed build; "agile" means CI/CD safety nets, tracked migrations, ADRs,
tests, and documentation for the person maintaining this next.

Decisions were locked through a design interview (see ADRs in Section 8). No further
requirements gathering is expected before implementation.

## 2. Non-Functional Requirements

### Performance
- API p95 < 300ms for JSON endpoints.
- Video streaming via the existing Google Drive proxy is acceptable (clips <= 25MB,
  seasonal traffic). No CDN/edge in scope now (see ADR-005).
- Database queries < 50ms on the indexes that already exist.

### Scalability
- Concurrent users: < 100 typical, < 600 at peak harness. Requests/sec: low tens.
- Data volume: < 100GB media (Drive) + < 1M DB rows. No vertical scaling work required.
- Growth path to media-service split is ADR'd as "do-not-build-now" (ADR-005).

### Availability
- Seasonal target ~99.5%. Render free/hobby cold-starts are acceptable during off-season.
- RPO <= 24h via Supabase backups/PITR; RTO <= 24h via documented restore runbook.
- `/health` (liveness) and `/ready` (DB + Drive reachability) endpoints for Render checks.

### Security
- HTTPS only; CORS allowlist already enforced server-side.
- Student identity: Google Workspace SSO restricted to `sasi.ac.in` (see ADR-001).
- Students carry PII (name, roll number, email, video of face). Handled as internal
  institution data; no external compliance tier applies. Data-handling note maintained in docs.
- bcrypt stays for admin auth; student `passwordHash` is removed (ADR-001).

### Maintainability
- Promote-based deploys via Render (staging -> prod) and Netlify branch URLs.
- Structured, greppable logs; documented env matrix; `.env.example`.
- Every decision with alternatives documented as an ADR.

### Cost
- $0-25/mo: Netlify free + Render free/hobby + Supabase free tier.

## 3. Architecture (target state)

### 3.1 Buildables (unchanged layout)
- `web` — Vite + React student portal. Deployed to Netlify.
- `admin-client` — Vite + React admin UI, built into `backend/public/admin`, served by
  the backend at `/admin`.
- `backend` — Express + Prisma (TypeScript) API. Deployed to Render.
- No monorepo migration. AI-driven maintenance and a sole maintainer favor three simple,
  independently buildable projects (ADR-004).

### 3.2 Identity: student SSO (the core change)
Current student auth (rollNo + password == rollNo) is replaced entirely.

- Login flow: `web` redirects to Google OAuth 2.0 with `hd=sasi.ac.in`,
  `scope=openid email profile`.
- Backend exchanges the authorization code at Google and **server-side verifies** the
  returned id_token: `aud` matches our client id, `iss` is Google, and the email ends
  with `@sasi.ac.in` (plus `hd` where present). Verification must be server-side only;
  the frontend never trusts client-side claims.
- Lookup: the verified email is matched **exactly** against `Student.email`.
  - Found -> mint a student JWT (`sub = student.id`, not rollNo) per the existing
    Bearer-token scheme. Same token shape as today; only the identity source changes.
  - Not found -> 403 "This college email is not registered" (allowlist behavior).
- Emails are the allowlist. The roster sheet (Section 4) is the only source of allowed
  emails. No email is ever derived or fabricated (explicit requirement).
- Students whose email cell is blank keep `email = NULL` and cannot log in until the
  sheet is re-imported. **SSO-only cutover**: the old rollNo/password path is removed,
  no break-glass fallback (locked decision).
- Student JWT lifetime/refresh behavior unchanged from current implementation.

### 3.3 Schema changes (Prisma)
- `Student`:
  - `+ email String? @unique` (null allowed, i.e. the 26 blanks),
  - `- passwordHash` (removed),
  - `rollNo`, `name`, `year`, `section`, `branch`, `createdAt` unchanged.
- Other models (`Event`, `Submission`, `AdminUser`, `EmailLog`, `DriveFolderCache`,
  `ActivityLog`) unchanged.
- Admin auth (username/password, bcrypt, httpOnly cookie) unchanged.

### 3.4 Database platform
- New Supabase instance, cold start (ADR-002). Old instance is disposable.
- Tracked migrations from day one of implementation: `prisma migrate dev` creates the
  baseline, committed SQL history, `prisma migrate deploy` applied at deploy time.
- DATABASE_URL uses the shared pooler (verified working):
  `postgresql://postgres.sfcqhkbynjxcksogcnwa:<pw>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
  (password stored in backend env, never in code).
- Note: the `db.<ref>.supabase.co` direct endpoint is IPv6-only; `DIRECT_URL` should be
  set for environments with IPv6 reachability if `migrate` ever needs the direct
  connection. Session pooler (5432) is used for runtime and migrations by default.

### 3.5 Media pipeline (unchanged)
- Uploads go to Google Drive via `drive.service.ts` (OAuth or service account). DB stores
  only Drive file references and paths. Verified end-to-end (student upload -> Drive ->
  admin list -> admin video streaming) in 2026-09-20 testing.
- Streaming proxy through the backend remains. Egress/caching optimization is
  explicitly deferred as an ADR'd escape hatch (ADR-005).

### 3.6 New backend endpoints
- `GET /api/student/google/authorize` — 302 to Google consent (challenge/state handling).
- `GET /api/student/google/callback?code=...&state=...` — code exchange + verification +
  JWT issuance.
- Existing `/api/student/me`, `/api/student/submission*` unchanged in shape.
- Remove `/api/student/login`.

### 3.7 Student portal (web) changes
- `StudentLogin` becomes a single "Sign in with your college email" button initiating the
  Google flow. Login screen redesign (ELITE Light theme) is already in place and kept.
- `/login` route (or equivalent) receives the returned token and stores it exactly as the
  current session (`ita_student_session`), reusing `setStudentToken`.
- Dashboard profile shows the student's email alongside the existing details.

## 4. Data & Roster Import

### 4.1 Source of truth
`Students_Master_List.xlsx` (repo root). Sheet `Students`, 404 data rows, columns:
`email | rollNo | name | year | section | branch`.
- Emails: name-based local parts, domain `@sasi.ac.in`, 378 filled, **26 blank**.
- Blanks are written as `NULL` and left alone until a future sheet update.

### 4.2 Import mechanism
- Idempotent `backend/scripts/import-roster.{ts|js}`: reads the committed sheet, upserts
  students keyed by `rollNo`, updates `email` (fills new, clears none), never fabricates
  emails. Re-runnable any time the sheet changes.
- `prisma:seed` is replaced by `import-roster` (students) plus a small env-known seed for the
  `Event` and `AdminUser` rows.
- Admin "Upload roster" screen is an optional future iteration (noting sizes to V1).

## 5. Environments & CI/CD

### 5.1 Environments
| Env | web | backend | db |
|-----|-----|---------|----|
| Local | `vite dev` (5173) | `ts-node`/`npm start` (5001) | new Supabase (same) |
| Staging | Netlify preview | Render staging service | same Supabase |

Prod DB is shared initially; a separate staging DB is recommended when multiple events
run concurrently (noted, not required for V1).

### 5.2 GitHub Actions (on PR, branch-triggered)
1. Install all three projects.
2. `tsc` typecheck + `vite build` for `web` and `admin-client`, `tsc` build for `backend`.
3. Run backend Vitest suite + Playwright web smoke (Google mocked).
4. `prisma migrate diff`/`migrate deploy` drift check against the migrate SQL.
5. On merge to master: Netlify web production build (existing `netlify.toml`),
   Render staging deploy, admin-client rebuild into backend.

### 5.3 Render
Staging service + production service. Promotion = tagged release re-deployed. Migration
hook runs `prisma migrate deploy` before the app boots (or as an explicit release step).

## 6. Testing Strategy

- **Backend (Vitest + supertest)**:
  - `drive.service`: Drive/OAuth mocked; file ops + streaming path.
  - `validation.service`: type sniffing.
  - SSO: Google tokeninfo/code exchange mocked; assert 403 for non-sasi.ac.in, unknown
    emails, and tampered tokens; assert 200 + JWT for a known email.
  - Admin review flow (list, media stream, review, delete).
- **Web (Playwright, Google OAuth mocked)**:
  - SSO login -> dashboard renders full profile (name, rollNo, year, section, email).
  - Upload happy path + invalid-file rejection (existing behaviors).
- **E2E acceptance criteria for iteration end** are enumerated in each implementation plan.

## 7. Agile Workflow & Handoff Artifacts

- Short, A/B/C iterations with a Definition-of-Done:
  1. `tsc` + build green for all projects touched,
  2. tests pass,
  3. env matrix / `.env.example` updated,
  4. ADR written when a decision or its trade-offs change,
  5. runbook updated if ops steps change.
- `docs/` gains: ADRs (Section 8), runbooks (restore, roster import, promotion, Drive
  re-auth), onboarding (`README` top-to-bottom), OpenAPI contract at repo root.
- `.nvmrc` pins the Node version; `.env.example` covers every secret name.

## 8. Architecture Decision Records (draft contents)

**ADR-001 — Student identity is Google Workspace SSO, SSO-only.**
Context: password roster was weak and brittle; institution runs Google Workspace on
`sasi.ac.in`. Decision: OAuth 2.0 + server-side id_token verification restricted to the
college domain; emails from the roster are the only allowlist; no rollNo/password fallback.
Consequences: 26 empty-email students are locked out until their emails are supplied and
re-imported; an OAuth client must be approved in the college's Google Cloud console
(external dependency, tracked in the implementation plan). Alternatives considered:
password-OTP via Resend (deliverability dependency), keeping passwords (weak).

**ADR-002 — Move to a new Supabase instance, cold start.**
Context: previous project DB used an old Supabase project; migrating was unwarranted
since payloads are re-importable from the roster sheet. Decision: new Ref
`sfcqhkbynjxcksogcnwa` (ap-south-1), schema built up via first tracked migration.
Consequences: nothing carried over; clean migration history is created instead of
reverse-engineered.

**ADR-003 — Prisma track migrations from the start.**
Context: prod schema previously drifted via `db push`. Decision: `migrate dev` baseline +
committed SQL + `migrate deploy` in release. Consequences: reproducible envs; migration
gate in CI.

**ADR-004 — Keep three separate buildables; no monorepo.**
Context: sole/rotating maintainer, AI-assisted edits, doc-heavy handoff. Decision: no
Turbo/Nx consolidation. Consequences: duplicated config across projects is accepted in
exchange for simpler local setups and lower onboarding surface.

**ADR-005 — Do not build the media-service split or CDN now.**
Context: traffic (~500 clips/season) does not justify a queue + worker + signed-URL
pipeline. Decision: keep the Drive streaming proxy; carve/document the boundary in
`drive.service.ts` so a later split is confined. Consequences: Render proxying of video
bytes remains a known ceiling; revisit when traffic, events, or egress costs grow.

## 9. Iteration Roadmap

- **It-0 Scaffold**: GitHub Actions workflow; `docs/` ADR + runbook + onboarding skeletons;
  `.nvmrc`, `.env.example`; Prisma migration baseline on new Supabase; `import-roster`
  script + event/admin seed; `/health` `/ready`; `Student.email` schema.
- **It-1 SSO**: Google OAuth authorize + callback + server-side verify; JWT `sub=id`;
  web login button + redirect + token store; `/api/student/login` removed.
- **It-2 Tests + gaps**: Vitest/supertest + Playwright suites (Google mocked); 26-blank
  UX note; admin review assets confirmed against new DB.
- **It-3 Handoff**: runbooks, onboarding, OpenAPI contract, promotion runbook, final
  DoD pass.

Each iteration ends with the Definition-of-Done review before the next begins.
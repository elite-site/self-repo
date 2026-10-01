# ELITE Self Introduction Portal

Submission and admin portal for **ELITE Self Introduction** (IT Department, Years 2–4,
Sections A/B). A student signs in once with their college Google Workspace account, fills in
a profile, uploads a short self-introduction video, resume, projects, achievements and
certificates, and coordinators review, shortlist, publish results and send email from the
admin panel. Everything published here is rendered into a public student directory with no
login required.

The repository is a three-project npm monorepo (no npm workspaces — each project owns its
own `package-lock.json`) plus shared design tokens and a small token/icon toolchain.

---

## Table of contents

- [At a glance](#at-a-glance)
- [How the system fits together](#how-the-system-fits-together)
- [Repository map](#repository-map)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
  - [1. Environment files](#1-environment-files)
  - [2. Install](#2-install)
  - [3. Database: generate, migrate, seed](#3-database-generate-migrate-seed)
  - [4. Run the dev servers](#4-run-the-dev-servers)
  - [Admin login](#admin-login)
  - [Signing in as a student](#signing-in-as-a-student)
- [Environment variable reference](#environment-variable-reference)
- [The roster](#the-roster)
- [Google Drive: real and mock](#google-drive-real-and-mock)
- [Student authentication](#student-authentication)
- [Admin authentication](#admin-authentication)
- [Uploads and size limits](#uploads-and-size-limits)
- [Email](#email)
- [Data model](#data-model)
- [API surface](#api-surface)
- [Caching and media delivery](#caching-and-media-delivery)
- [Rate limiting](#rate-limiting)
- [Security and privacy](#security-and-privacy)
- [Tests](#tests)
- [Builds and verification scripts](#builds-and-verification-scripts)
- [Design tokens](#design-tokens)
- [Deployment](#deployment)
- [Operations runbook index](#operations-runbook-index)
- [Architecture decision records](#architecture-decision-records)
- [Secret inventory](#secret-inventory)
- [Known gaps and pending manual steps](#known-gaps-and-pending-manual-steps)
- [Contributing rules for agents](#contributing-rules-for-agents)

---

## At a glance

| Component | Tech | Role | Dev port | Deploys to |
|---|---|---|---|---|
| `web` | Vite + React 18 + TypeScript + Tailwind | Student portal and public directory | `http://localhost:5173` | **Vercel** |
| `admin-client` | Vite + React 18 + TypeScript + Tailwind | Admin UI, base path `/admin/` | `http://localhost:5175` | Built into `backend/public/admin`, no separate deploy |
| `backend` | Express + Prisma 5 + TypeScript | REST API, admin static serving, Drive, email | `http://localhost:5001` | **Render** (free tier) |

Supporting directories:

| Path | Purpose |
|---|---|
| `shared/` | Design tokens as CSS, JS and a Tailwind preset — the single source for colour, spacing and type |
| `tools/` | Token build, contrast check, utility check, icon build, font vendoring |
| `scripts/dev.js` | Runs all three dev servers together |
| `docs/` | Runbooks, ADRs, onboarding, OpenAPI, migration spec |
| `.github/workflows/ci.yml` | The build + test gate on every PR and push to `main` |
| `Students_Master_List.xlsx` | Roster source of truth (sheet `Students`) |
| `.nvmrc` | Pins Node 24 |

---

## How the system fits together

```
  Student / public visitor                Coordinator
            │                                  │
            ▼                                  ▼
   ┌────────────────────┐            ┌──────────────────────┐
   │  web (Vercel)      │            │  admin-client        │
   │  :5173 dev         │            │  :5175 dev           │
   └─────────┬──────────┘            └──────────┬───────────┘
             │  HTTPS /api                     │  HTTPS /admin/api
             └───────────────┬──────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │  backend (Render)     │
                  │  :5001                │
                  │                      │
                  │  /api/*      student  │──► Google Drive (media)
                  │  /admin/*    admin    │──► Resend (email)
                  │  /api/public/* public │──► Supabase Postgres
                  │                      │
                  │  serves /admin SPA   │
                  └──────────────────────┘
```

The student SPA and the admin SPA are separate builds. `admin-client` is compiled with a
`/admin/` base path and written into `backend/public/admin`, so the Express process serves
the admin UI itself and there is no second deployment to keep in sync. Only two things are
deployed: `web` (Vercel) and `backend` (Render).

Student media (video, resume, certificates, achievement proofs, photos) is stored in Google
Drive, never as blobs in Postgres. The database holds the Drive file ids plus a cached
thumbnail for list views; the bytes live in Drive and are streamed or redirected through the
API.

---

## Repository map

```
.
├── web/                              # Student portal + public directory -> Vercel
│   ├── src/
│   │   ├── pages/                    # Route-level pages (Dashboard, Profile, VideoPage,
│   │   │                             #   EventsPage, VotingPage, TeamsPage, PortfolioPage,
│   │   │                             #   ResumePage, public/PublicStudentProfilePage, ...)
│   │   ├── components/               # Shared UI (Navbar, Footer, PhotoCropModal,
│   │   │                             #   PublicVideoShowcase, layout/StudentLayout, ...)
│   │   ├── context/SessionContext.tsx  # One /me fetch for the whole app
│   │   ├── components/Toast.tsx      # Global toast provider + useToast()
│   │   ├── services/api.ts           # axios client, getApiBaseUrl, resolveMediaUrl
│   │   ├── hooks/  utils/  types/    # Support code
│   │   └── index.css                 # Safe-area vars, dvh helpers, 16px mobile inputs
│   ├── index.html                    # viewport-fit=cover
│   └── vite.config.ts                # Dev proxy, react vendor chunk
│
├── admin-client/                     # Admin UI -> built into backend/public/admin
│   ├── src/
│   │   ├── pages/                    # Analytics, AuditLogs, Moderation, AdminEvents,
│   │   │                             #   Exports, Settings, EmailTemplateEditor,
│   │   │                             #   VotingManagement, EventRegistrations,
│   │   │                             #   StudentDetail
│   │   ├── components/               # Tables, modals, SubmissionDetailModal
│   │   ├── services/api.ts           # Admin API client
│   │   ├── context/                  # Admin auth context
│   │   └── types/
│   ├── index.html                    # viewport-fit=cover
│   └── vite.config.ts                # base: /admin/, react vendor chunk
│
├── backend/                          # Express + Prisma + TypeScript API -> Render
│   ├── prisma/
│   │   ├── schema.prisma             # 26 models
│   │   ├── migrations/               # Tracked SQL history (7 migrations)
│   │   └── seed.ts                   # Event, admin user, roster import
│   ├── scripts/
│   │   ├── db-setup.ts               # Interactive first-run DB helper
│   │   ├── import-roster.ts          # Read Students_Master_List.xlsx -> DB
│   │   ├── roster-parser.ts          # Spreadsheet parsing
│   │   ├── get-oauth-token.ts        # Mint/refresh the Drive OAuth token
│   │   ├── migrate-if-configured.js  # prebuild: prisma migrate deploy if configured
│   │   ├── verify-env-guard.js       # Fails a production build on dev secrets
│   │   └── verify-esm-interop.js     # Checks ESM/CJS interop of the build output
│   ├── src/
│   │   ├── server.ts                 # Entry point, helmet, compression, CORS, mounts
│   │   ├── config/
│   │   │   ├── env.ts                # All env access + production secret guard
│   │   │   ├── constants.ts
│   │   │   └── staticAssets.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts               # Admin: httpOnly cookie + JWT
│   │   │   ├── studentAuth.ts        # Student: SSO JWT + cookie
│   │   │   ├── rateLimiter.ts        # Per-identity limiters
│   │   │   ├── upload.ts             # Multer limits + MIME filters
│   │   │   ├── errorHandler.ts       # Production-safe error responses
│   │   │   └── apiError.ts
│   │   ├── routes/                   # See "API surface"
│   │   ├── services/                 # sso, drive, email, validation, activity,
│   │   │                             #   announcement, notification, limits, academicYear
│   │   ├── jobs/announcementScheduler.ts
│   │   ├── lib/prisma.ts             # Shared client + pool right-sizing
│   │   └── utils/
│   │       ├── ttlCache.ts           # Bounded TTL cache with single-flight
│   │       └── rangeParser.ts
│   ├── tests/                        # Vitest + supertest suites (28 files)
│   └── storage/mock-drive/           # Local mock Drive (gitignored)
│
├── shared/                           # tokens.css, tokens.mjs, tailwind-preset.mjs
├── tools/                            # build-tokens, check-contrast, check-utilities,
│                                     # build-icons, migrate-classes, vendor-fonts
├── scripts/dev.js                    # Runs all dev servers together
├── docs/                             # See "Operations runbook index"
├── Students_Master_List.xlsx         # Roster (sheet "Students")
├── netlify.toml                      # Legacy web host config (superseded by Vercel)
├── vercel.json                       # Web build + SPA rewrite + asset caching
├── AGENTS.md                         # Rules for AI coding agents
└── .nvmrc                            # Node 24
```

---

## Prerequisites

- **Node 24.** Run `nvm use`; the repo pins the version in `.nvmrc`. npm is the only
  supported package manager — do not create a `yarn.lock` or `pnpm-lock.yaml`.
- **A Supabase Postgres project.** A fresh instance is recommended (cold start, ADR-0002).
  Use two connection strings: the transaction pooler (port `6543`) for the API runtime, and
  the direct connection (port `5432`) for Prisma migrations and CLI work.
- **A Google Cloud project** with two OAuth clients approved in the college Workspace domain:
  - A **Drive** OAuth client (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`) whose
    refresh token is minted by `npm run get-token` (runbook:
    [`docs/runbooks/drive-reauth.md`](docs/runbooks/drive-reauth.md)). A shared upload folder
    id is set as `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
  - A **Google Workspace SSO** OAuth 2.0 **Web** client
    (`GOOGLE_SSO_CLIENT_ID` / `GOOGLE_SSO_CLIENT_SECRET`) whose **Authorized redirect URI is
    exactly** `GOOGLE_SSO_REDIRECT_URI`. That URI must be the backend route that exchanges the
    authorization code — `https://<render-host>/api/student/google/callback` in production.
    `STUDENT_APP_LOGIN_URL` is the SPA page students land on afterwards.
- **A Resend API key** for admin email (shortlists, thank-you notes, announcements).

A first local run needs none of the Google or Resend credentials: the backend falls back to a
local mock Drive and skips email.

---

## Local setup

### 1. Environment files

```bash
cp backend/.env.example backend/.env
```

`web/.env.example` and `admin-client/.env.example` also exist. The web dev server works
without one — it falls back to `http://localhost:5001/api` — but create it if you want a
different backend.

Edits you must make in `backend/.env`:

| Variable | What to put there |
|---|---|
| `DATABASE_URL` | Runtime Postgres URL. Prefer the transaction pooler on port **6543** for production traffic; 5432 is fine locally. |
| `DIRECT_URL` | Direct, non-pooler URL on port **5432**. Prisma migrations and the CLI need this — the pooler cannot run DDL. |
| `PORT` | Keep **5001**. Both Vite dev proxies and the web API fallback assume it. |
| `ALLOWED_ORIGIN` | Comma-separated CORS list. `http://localhost:5173` should be in it. |
| `JWT_SECRET` / `STUDENT_JWT_SECRET` | Any long random strings for local work. |
| `GOOGLE_SSO_REDIRECT_URI` | `http://localhost:5001/api/student/google/callback` locally. |
| `STUDENT_APP_LOGIN_URL` | `http://localhost:5173/login` locally. |

Leave the `GOOGLE_*` and `RESEND_API_KEY` values blank for a first run. The Drive client then
operates in mock mode against `backend/storage/mock-drive` (gitignored), and email calls
become no-ops with a log line.

If you need to point the pool at something specific, note that an explicit `connection_limit`
in `DATABASE_URL` wins over the value the backend computes. See
[Deployment](#deployment) for why the computed value is small.

### 2. Install

```bash
cd backend   && npm ci
cd ../web    && npm ci
cd ../admin-client && npm ci
```

Or from the repo root: `npm run install:all`.

`backend`'s `postinstall` also installs `admin-client` and `web`, so a bare `npm ci` inside
`backend/` is enough for a full checkout. It only installs missing dependencies — it does not
upgrade.

### 3. Database: generate, migrate, seed

```bash
cd backend
npm run prisma:generate     # prisma generate
npm run prisma:migrate      # prisma migrate dev — creates + applies a dev migration
npm run prisma:seed         # event, admin user, and the roster import
```

For a from-scratch database without the interactive prompts, `npm run db:setup` walks through
creating the database, applying migrations and seeding.

The seed ends with a roster summary like:

```
✓ 404 students imported
✓ 26 students have no email yet (kept NULL — locked out of SSO until re-import)
```

`prisma:seed` imports the roster for you. When the spreadsheet changes later, run
`npm run roster:import` instead of a full re-seed — see
[`docs/runbooks/roster-import.md`](docs/runbooks/roster-import.md).

Migrations are tracked SQL and are never edited after the fact. Adding a schema change means
`prisma migrate dev --name <descriptive_name>`, which writes a new timestamped folder.
Production applies them with `prisma migrate deploy` (see [Deployment](#deployment)).

### 4. Run the dev servers

Three terminals, or all three at once:

```bash
npm run dev            # from the repo root — runs backend + web + admin-client
```

Individually:

```bash
cd backend        && npm run dev    # API      -> http://localhost:5001  (/health, /ready)
cd web            && npm run dev    # portal   -> http://localhost:5173
cd admin-client   && npm run dev    # admin UI -> http://localhost:5175/admin
```

`/health` is liveness. `/ready` is readiness — it reports 503 until both the database and
Drive respond, which is what a load balancer or Render's health check should poll.

### Admin login

The seed creates an `AdminUser` from `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD`
(defaults `ADMIN` / `ADMIN123`). Sign in at `http://localhost:5001/admin` (or the admin dev
server at `http://localhost:5175/admin`).

**Change the password after first login.** There is no self-service reset; to rotate it, set
new `ADMIN_DEFAULT_*` values in `backend/.env` and re-run `npm run prisma:seed`.

### Signing in as a student

There is no roll-number or password student login. The student portal shows a single
"Sign in with your college email" button which starts Google Workspace SSO against
`GOOGLE_SSO_HD` (default `sasi.ac.in`). After the callback the backend checks the returned
email against the roster; only an allowlisted address gets a session.

This means **local SSO testing requires real Google credentials** in `backend/.env`. With mock
mode there is no sign-in path, so the rest of the app is not reachable as a student unless you
seed a session some other way.

---

## Environment variable reference

Everything is read through `backend/src/config/env.ts`. Routes and services never touch
`process.env` directly, which is what lets the production secret guard work — see
[`verify:env-guard`](#builds-and-verification-scripts).

### Server

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5001` | Both Vite dev proxies assume 5001. |
| `NODE_ENV` | `development` | `production` turns on the strict env guard and generic error messages. |
| `ALLOWED_ORIGIN` | — | Comma-separated CORS allowlist. `ALLOWED_ORIGINS` is accepted as an alias. |
| `ADMIN_SESSION_COOKIE_NAME` | `pc_admin_session` | Admin auth cookie name. |

### Database

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Runtime connection. Pooler port 6543 for concurrency. |
| `DIRECT_URL` | Direct connection for migrations and CLI. Falls back to `DATABASE_URL`. |

### Secrets

| Variable | Used for |
|---|---|
| `JWT_SECRET` | Admin JWT signing. |
| `STUDENT_JWT_SECRET` | Student SSO JWT and OAuth state. Falls back to `JWT_SECRET`. |
| `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` | Seed-time admin account only. |

`config/env.ts` lists four production guard checks — `DATABASE_URL`, `JWT_SECRET`,
`STUDENT_JWT_SECRET` and `ADMIN_DEFAULT_PASSWORD`. If `NODE_ENV=production` and any of them
still holds its development fallback, the process refuses to start. This is why
`verify:env-guard` exists as a build step.

### Google Drive

Two credential styles are supported; the OAuth pair wins when present.

| Variable | Notes |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Drive OAuth client. |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Minted by `npm run get-token`; rotate per the reauth runbook. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service-account fallback. Literal `\n` in the key is converted to real newlines on read. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Shared upload folder. |

### Google Workspace SSO

| Variable | Default | Notes |
|---|---|---|
| `GOOGLE_SSO_CLIENT_ID` / `GOOGLE_SSO_CLIENT_SECRET` | — | Web client in Google Cloud. |
| `GOOGLE_SSO_REDIRECT_URI` | `http://localhost:5001/api/student/google/callback` | Must match the console entry exactly. |
| `GOOGLE_SSO_HD` | `sasi.ac.in` | Hosted domain constraint. |
| `STUDENT_APP_LOGIN_URL` | `http://localhost:5173/login` | Post-callback landing page. |

### Email and limits

| Variable | Default | Notes |
|---|---|---|
| `RESEND_API_KEY` | — | Blank disables sending. |
| `EMAIL_FROM_ADDRESS` | `Self Introduction <elite@sasi.ac.in>` | Verified sender. |
| `MAX_IMAGE_SIZE_MB` | `15` in `.env.example`, `10` in code | Photos and portfolio images. |
| `MAX_VIDEO_SIZE_MB` | `25` | Default ceiling for intro videos. An admin value in portal Settings overrides it. |
| `MAX_VIDEO_SIZE_HARD_CAP_MB` | `100` | Absolute ceiling on a buffered upload body, regardless of the setting above. |
| `EVENT_YEAR` | `2026` | Academic year used for events and cohort logic. |

### Boot-time maintenance

Both are opt-in because both write to the database or to Drive on every boot.

| Variable | Default | Effect |
|---|---|---|
| `AUTO_MIGRATE_PENDING` | `false` | Run pending migrations at boot. |
| `SYNC_DRIVE_PERMISSIONS` | `false` | Re-apply viewer permissions across Drive on boot. |

---

## The roster

`Students_Master_List.xlsx` at the repo root is the allowlist. Sheet `Students`. It is read by
`backend/scripts/import-roster.ts` via `roster-parser.ts` and is the default input for
`npm run roster:import`.

- A row with an email becomes a `Student` who can complete SSO.
- A row with a **blank** email cell produces `email = NULL` and that student **cannot sign
  in** until the sheet is edited and re-imported. The seed reports how many rows are in this
  state; it is a normal outcome, not a failure.
- Editing the sheet and re-importing is idempotent — students are matched on roll number and
  updated in place.

The spreadsheet contains personal data (names, roll numbers, college emails). Do not commit
changes to it casually, do not paste its contents into issues, tests, fixtures or docs, and
do not print it. The file is intentionally tracked: the import tooling and the roster
runbook depend on its presence.

---

## Google Drive: real and mock

All uploads go to Drive. The Drive service has two backends behind one interface:

- **OAuth (primary).** A refresh token is exchanged for an access token on demand and the
  uploads land in `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
- **Mock (fallback).** With no credentials, files are written under
  `backend/storage/mock-drive/` and served back by the same code paths. This is what makes a
  credential-free first run possible.

The service-account credential style is a third supported path and takes effect when OAuth is
not configured.

Permissions: after an upload, the backend grants reader access so the file can be viewed
without a Drive login. It first attempts an `anyone` grant and falls back to a
`domain`-restricted grant if the Workspace policy blocks link sharing. That fallback is
deliberate and load-bearing — a domain grant is **not** anonymously readable, so the media
layer tracks the two cases separately. See [Caching and media delivery](#caching-and-media-delivery).

Thumbnails: list endpoints never select the `thumbnail` column. A WebP frame is generated once
on upload (and regenerated on every video re-upload) and served by a dedicated thumbnail
endpoint, so listing 200 students does not pull 200 image blobs out of Postgres.

---

## Student authentication

Google Workspace SSO only, per [ADR-0001](docs/architecture/adr-0001.md). There is no
roll-number login and no student password. The flow:

1. The SPA posts to the SSO start endpoint on the backend.
2. Google redirects to `GOOGLE_SSO_REDIRECT_URI` with a code.
3. The backend exchanges the code, verifies the returned email's domain against
   `GOOGLE_SSO_HD`, and checks the address against the roster.
4. An allowlisted address gets a student JWT, set as an httpOnly cookie and returned for
   header-based use.

`studentAuth` middleware guards every `/api/student/*` route and resolves the student id onto
the request. All student-scoped queries are filtered by that id — no student endpoint may
return another student's data.

The `web` app fetches `/me` exactly once per page load through `SessionContext`, and every
page reads that payload instead of re-requesting. On a 401/403 the token is cleared and the
student is returned to sign-in; a 5xx or network failure shows a retry screen rather than
faking a logout, so a server blip never looks like a session loss.

---

## Admin authentication

Unchanged and deliberately conventional: username + password, bcrypt comparison, a signed
JWT in an httpOnly cookie, and `auth` middleware on every admin route. There is no
self-service password reset — rotation is a seed-time operation.

`admin-client` is served from the same origin as the API under `/admin/`, so the admin cookie
is first-party and needs no CORS exception for credentials.

---

## Uploads and size limits

`backend/src/middleware/upload.ts` owns all of this. Validation is enforced server-side on
type and size; the client-side checks in the portal are a convenience, not the control.

| Upload | Accepted | Limit |
|---|---|---|
| Intro video | Video mimetypes | `MAX_VIDEO_SIZE_MB` (default 25), absolute cap `MAX_VIDEO_SIZE_HARD_CAP_MB` (100) |
| Resume | `application/pdf` only | 10 MB |
| Certificate | PDF, JPG, PNG | 10 MB |
| Photo | Images | `MAX_IMAGE_SIZE_MB` |
| Achievement proof | Images and PDF | 10 MB |

Video validation also checks duration and, where Drive provides it, the container/codec, via
`src/services/validation.service.ts`. A student whose video is rejected server-side sees the
specific reason — which is why those messages are surfaced as toasts rather than only inline.

On re-upload the previous Drive file is deleted only after the new one is stored, and the
thumbnail is regenerated every time, so a replaced video can never leave a stale preview
behind.

---

## Email

`src/services/email.service.ts` talks to Resend. It is used for shortlists, thank-you notes,
announcements and the notification digests. Templates live in `EmailTemplate` /
`EmailAutomation` and are editable from the admin UI (`EmailTemplateEditor`).

With `RESEND_API_KEY` blank, sending is skipped with a log line rather than failing a request,
so local development never needs a key and never sends mail.

`src/jobs/announcementScheduler.ts` runs the announcement and reminder work on a timer. It
writes to the database and to Drive, which is why `AUTO_MIGRATE_PENDING` and
`SYNC_DRIVE_PERMISSIONS` are opt-in at boot.

---

## Data model

26 Prisma models. Grouped by what they are for:

**Identity and access**
`Student` (name, roll number, `email` — nullable, status, year, section),
`StudentProfile` (bio, photo, links), `Skill` / `StudentSkill` / `SkillRequest` (skill tags,
including LeetCode and CodeChef), `AdminUser`, `Role` / `RolePermission` /
`RoleAssignment` (admin permission model).

**Submissions and media**
`Submission` (the per-student submission state machine), `IntroVideo` (drive id, thumbnail,
moderation status, `isPublic`), `Resume` (drive id, filename, size, moderation state,
`isPublic`, `isActive`), `Certificate`, `Achievement` / `AchievementCategory`, `Project`,
`ChangeRequest` (admin-requested revisions).

**Events**
`Event` (name, slug, year, status, plus scheduling and eligibility fields: description, type,
registration window, event date, eligibility years, minimum profile completion, team
constraints, notification preferences), `EventRegistration` / `RegistrationAnswer` /
`RegistrationFormField`, `Team` / `TeamMember` / `TeamInvitation`.

**Engagement**
`VotingCampaign` / `VotingCandidate` / `Vote`, `Notification`, `Announcement`, `EmailTemplate`
/ `EmailAutomation` / `EmailAutomationRun`, `EmailLog`.

**Operations**
`ActivityLog` (admin audit trail), `DriveFolderCache` (avoids re-resolving Drive folders),
`PortalSettings` (admin-tunable limits such as the video ceiling).

**Enums.** `EventStatus` is `DRAFT | OPEN | CLOSED | ARCHIVED`; content models use a content
status of `PENDING | APPROVED | REJECTED` plus a separate `isPublic` flag, which is why hiding
something and having it approved are separate decisions.

Migrations (tracked, never edited after creation):

```
20260920055533_init
20260925122054_add_student_status_and_graduation
20260925201500_intro_video_public_visibility
20261001143500_add_leetcode_and_codechef_to_profile
20261001150000_add_perf_indexes
20261001223000_add_event_scheduling_fields
```

The last two are additive and not yet applied to production — see
[Known gaps](#known-gaps-and-pending-manual-steps).

---

## API surface

Mounted in `backend/src/server.ts`. Middleware is never optional on a data route.

| Mount | File | Auth | Contents |
|---|---|---|---|
| `/api` | `public.routes.ts` | none | Public event listing/detail, public media proxy (`/public/media/:type/:fileId`, thumbnails), auto-provisioning of the default event |
| `/api/public/students` | `public.students.routes.ts` | none | Public directory, public profile by roll number, skills index — filtered to approved and published content |
| `/api/public/videos` | `public.videos.routes.ts` | none | Approved + published intro video showcase and stream |
| `/api/student` | `student.routes.ts` | `studentAuth` | SSO start/callback, `/me`, intro video upload/stream/delete, resume, photo |
| `/api/student/profile` | `student.profile.routes.ts` | `studentAuth` | Profile read/write |
| `/api/student/portfolio` | `student.portfolio.routes.ts` | `studentAuth` | Projects, achievements, certificates, visibility toggles |
| `/api/student/events` | `student.events.routes.ts` | `studentAuth` | Event list, detail, register |
| `/api/student` | `student.interactions.routes.ts` | `studentAuth` | Voting, notifications, registrations and cancellation, teams and invitations |
| `/admin` | `admin.auth.routes.ts` | none | Admin login/logout/session |
| `/admin/api` | `admin.api.routes.ts` | `auth` | Submissions, moderation, stats, audit logs, exports, email, settings, students |
| `/admin/api/portal` | `admin.portal.routes.ts` | `auth` | Event CRUD and status transitions, portal administration |
| `/admin/api/academic-year` and `/api/admin/academic-year` | `admin.academic-year.routes.ts` | `auth` | Academic year configuration |

The full request/response contract is in [`docs/openapi.yaml`](docs/openapi.yaml). When a
route's shape changes, that file changes with it.

---

## Caching and media delivery

The public read paths are the ones a whole campus hits at once, so they are the ones tuned
for a single small instance.

**Video does not pass through the API.** `GET /api/public/media/video/:id` and the showcase
`/stream/:id` answer with a `302` to Drive's CDN rather than piping bytes. A 25 MB video
proxied through the process costs an inbound Drive read plus an outbound write per viewer, so
concurrent viewers compete for the instance's bandwidth regardless of database speed. The
redirect hands the transfer to Drive.

Two guards keep that safe:

- It only applies to `video`. PDFs and images stay proxied, because this route is also what
  renders a resume inside an iframe and Drive's `export=download` disposition would turn
  inline viewing into a download.
- The redirect only fires when the file id was resolved from our own database row (not from
  the URL) **and** Drive has confirmed an `anyone` grant. Confirmation is cached: positives
  for ten minutes, negatives for sixty seconds so an asynchronous post-upload grant can still
  correct a premature "no". Anything unconfirmed falls back to streaming through the service
  account, which always works. A domain-only grant is never treated as public, because an
  anonymous browser would get a 403 from Drive.

**Public reads are cached in-process** with `backend/src/utils/ttlCache.ts`: the student list
for 20s, a single profile for 30s, skills for 300s, the video showcase for 30s. The windows
are short on purpose — they match the `Cache-Control` the endpoints already sent, and they
bound how long an approval takes to become visible publicly. `wrap()` is single-flight, so a
burst of simultaneous misses on a cold key runs one loader rather than N.

Only the raw query result is cached, never the assembled response. URL shaping therefore stays
in one place instead of being frozen into whatever it looked like when the cache was written.

**The database pool is sized for one core.** `buildDatabaseUrl` in `backend/src/lib/prisma.ts`
sets `connection_limit=5` and `statement_cache_size=20`. A Postgres connection is used by one
query at a time, so on a 0.1-core instance connections beyond roughly one per core buy no
throughput — they just add contention. The previous values implied 2,000 cached prepared
statements inside a 500 MB heap. `pool_timeout` stays at 15s, and an explicit
`connection_limit` in `DATABASE_URL` still wins.

**List endpoints never select blobs.** Thumbnail bytes come from the thumbnail endpoint, not
from the row, in both the student-facing and the admin moderation queues.

---

## Rate limiting

`backend/src/middleware/rateLimiter.ts` keys limiters by identity, not by IP:

| Limiter | Limit | Scope |
|---|---|---|
| `generalApiRateLimiter` | 1,000 per 5 min | All `/api` routes. Skips `/health` and `/ready`. |
| `submissionRateLimiter` | 10 per minute | Video and file uploads. |

Identity is the authenticated student id or admin id, falling back to a **decoded token**
pre-auth, and only then to the IP. This matters on a campus: an entire year behind one NAT
IP shares a single bucket, so IP-only limiting would lock out legitimate students. Uploads
are limited per student for the same reason.

When no identity can be established, the limiter falls back to `x-forwarded-for`. That header
is client-supplied, so it is the weakest link in the scheme — it is a fallback for anonymous
traffic, not a security boundary.

---

## Security and privacy

This project handles identifiable student data: names, roll numbers, college email addresses,
face photographs and face video. Treat the roster and every submission as internal
institutional data.

**House rules, enforced by review:**

- No secrets in git. `backend/.env` is gitignored; `.env.example` carries names and
  placeholders only. Secrets live in `backend/.env` and in the Render/Vercel environment.
- Never read, print or log student names, emails, roll numbers or tokens.
- Never weaken auth, CORS, cookie flags, JWT handling or rate limiting to make something work.
  A red test is information; a disabled check is a vulnerability.
- Every student endpoint is scoped to the authenticated student's id. No endpoint may expose
  another student's data.
- All input is validated on the server — body, params, query and uploads. Never trust the
  client, including a client-declared mimetype.
- Nothing renders user content as raw HTML. There is no `dangerouslySetInnerHTML` over user
  data.
- Production responses never carry stack traces or driver messages. The shared error handler
  returns a generic string under `NODE_ENV=production`; individual routes must not catch and
  echo `err.message` themselves, because that bypasses the handler.
- No analytics, trackers or third-party scripts. Not in the portal, not in the admin UI, not
  via a `<script>` tag in either `index.html`.
- Keep the repository private. Do not copy roster or submission data into public channels, and
  delete exported admin spreadsheets when they are no longer needed.
- Uploaded files keep their type and size validation, and their bytes live in Drive rather
  than in the database.

`AGENTS.md` at the repo root encodes these rules for AI coding agents, including a
credit-discipline section and a list of files that must never be edited or run without explicit
permission. Read it before delegating work on this repo.

---

## Tests

```bash
cd backend && npx vitest run                  # or: npm test (same)
cd backend && npx vitest run tests/<file>     # one file, narrower is better
cd web      && npx vitest run
```

Backend is Vitest + supertest: SSO service and routes, the roster parser, video validation,
blank-email lockout, the public read filters, media proxying including Range/206, thumbnail
generation and cache invalidation, the events payload validator, concurrency and pool
configuration, and the announcement scheduler.

Web and admin-client run Vitest for component and routing tests.

Playwright e2e lives in `web` (`npm run test:e2e`) and needs a running backend against a seeded
database with `dist/` built. The SSO smoke spec is secret-gated and skips when
`STUDENT_JWT_SECRET` is unset. It is not part of CI and should not be run without being asked.

CI (`.github/workflows/ci.yml`) runs on every PR and on push to `main`: backend `npm ci` →
`prisma generate` → build → test, plus a production build of `web` and `admin-client`. CI is
the safety net after a change, not a substitute for a narrow local check.

---

## Builds and verification scripts

Run from the repo root. Prefer the narrowest target that covers your change.

| Command | What it does |
|---|---|
| `npm run build:backend` | `tsc` in `backend` |
| `npm run build:web` | Vite production build of the portal |
| `npm run build:admin` | Installs admin deps if needed, builds into `backend/public/admin` |
| `npm run build` | All three, in that order |
| `npm run test:backend` / `test:web` / `test:admin` | Vitest in one project |
| `npm test` | All three suites |
| `npm run tokens` | Regenerate `shared/tokens.*` and the Tailwind preset |
| `npm run tokens:check` | Fail if the generated token output is stale |
| `npm run check:contrast` | WCAG contrast check over the token set |
| `npm run check:utilities` | Flag ad-hoc utility usage that bypasses tokens |
| `npm run verify:tokens` | `tokens:check` + `check:contrast` |
| `npm run verify:all` | All four token/utility/icon checks |
| `npm run verify:env-guard` | Build, then prove the production env guard rejects dev secrets |
| `npm run verify:esm-interop` | Build, then check ESM/CJS interop of the output |
| `npm run prisma:generate` | `prisma generate` |
| `npm run prisma:migrate` | `prisma migrate dev` — needs permission, writes a migration |
| `npm run prisma:seed` | Seeds; writes real data |
| `npm run roster:import` | Re-imports the spreadsheet |

Database-touching commands (`prisma:migrate`, `prisma:seed`, `roster:import`, `db:setup`)
write to real data. Do not run them against production, and do not run them without being
asked.

---

## Design tokens

`shared/` is the single source for colour, spacing and type. `shared/tokens.css` and
`shared/tokens.mjs` are the definitions; `shared/tailwind-preset.mjs` maps them into Tailwind
utilities. `tools/build-tokens.mjs` generates the outputs and `tools/check-contrast.mjs`
enforces WCAG contrast.

Both frontends consume the tokens through the Tailwind preset. In application code: use token
utilities, do not hardcode hex values, and do not edit `shared/tokens.*` for a one-off visual
adjustment. If a token genuinely needs to change, change the definition and run
`npm run tokens`, then `npm run verify:tokens`.

`tools/build-icons.py` builds the icon set and `tools/vendor-fonts.py` vendors the font files.
Fonts are vendored deliberately — the portals do not call out to a font CDN.

---

## Deployment

Two deployments. Nothing else needs to exist in production.

### `web` → Vercel

Configured by `vercel.json` at the repo root:

- Build command `npm run --prefix web build`, output `web/dist`, framework `vite`.
- A catch-all rewrite to `/index.html` so client-side routes deep-link.
- `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`, which is safe because
  Vite content-hashes those filenames.

`VITE_API_BASE_URL` must be set in the Vercel environment to
`https://<render-host>/api`. With no value the build falls back to
`http://localhost:5001/api` and production breaks in a way that looks like a backend outage.

`netlify.toml` is still in the repo from the earlier hosting arrangement. It is not what
deploys today.

### `backend` → Render

Root directory `backend`.

| Setting | Value |
|---|---|
| Build | `npm install && npx prisma generate && npm run build && npm run build:admin` |
| Pre-deploy / release | `npx prisma migrate deploy` |
| Start | `node dist/server.js` |
| Health check | `/ready` (503 until both the database and Drive respond) |

`prebuild` also runs `scripts/migrate-if-configured.js`, which applies pending migrations when
`DATABASE_URL` is present. The Render release step is the authoritative one.

Production environment must include:

- `NODE_ENV=production` — otherwise the env guard never fires.
- `ALLOWED_ORIGIN` containing the Vercel production URL, and nothing else that is not
  intended.
- `GOOGLE_SSO_REDIRECT_URI=https://<render-host>/api/student/google/callback` and
  `STUDENT_APP_LOGIN_URL=https://<web-prod>/login`.
- `DATABASE_URL` on the pooler port (6543) and `DIRECT_URL` on the direct port (5432), both
  in the same region as the Render service. A cross-region pooler is the single most common
  cause of a slow or timing-out free-tier instance.
- `JWT_SECRET` and `STUDENT_JWT_SECRET` set to real random values, and `ADMIN_DEFAULT_PASSWORD`
  changed from its development default — the env guard refuses to boot otherwise.
- `NODE_OPTIONS=--max-old-space-size=384` on the start command, so V8 collects under a 500 MB
  limit rather than letting the process grow until the platform kills it.

Free-tier specifics worth remembering: one instance, roughly 0.1 core and 500 MB of RAM.
Anything that holds a socket open per viewer is expensive here, which is the entire reason
video is redirected to Drive rather than streamed. A cold start also means the first request
after a deploy pays JIT and connection setup; `/ready` exists so the platform does not route
to the process before it can answer.

---

## Operations runbook index

| Topic | Document |
|---|---|
| New maintainer orientation | [`docs/onboarding.md`](docs/onboarding.md) |
| Deploys, migrations, promotion | [`docs/runbooks/deploy.md`](docs/runbooks/deploy.md) |
| Database backup and restore | [`docs/runbooks/restore.md`](docs/runbooks/restore.md) |
| Editing and re-importing the roster | [`docs/runbooks/roster-import.md`](docs/runbooks/roster-import.md) |
| Refreshing the Drive OAuth token | [`docs/runbooks/drive-reauth.md`](docs/runbooks/drive-reauth.md) |
| API contract | [`docs/openapi.yaml`](docs/openapi.yaml) |
| Frontend page inventory | [`docs/FRONTEND_PAGES.md`](docs/FRONTEND_PAGES.md) |
| Portal migration specification | [`docs/PORTAL_MIGRATION_SPEC.md`](docs/PORTAL_MIGRATION_SPEC.md) |
| CI definition | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Rules for AI coding agents | [`AGENTS.md`](AGENTS.md) |

Runbooks are for the situation, not for reading. Open one when the task is that situation.

---

## Architecture decision records

`docs/architecture/` holds the decisions and their reasons. They are historical records — read
them, do not edit them.

| ADR | Decision |
|---|---|
| `adr-0001` | Google Workspace SSO as the only student login; no roll-number or password auth |
| `adr-0002` | Supabase Postgres, fresh instance, cold start accepted |
| `adr-0003` | Tracked SQL migrations, never edited after creation |
| `adr-0004` | The admin client is a buildable compiled into the backend, not a separate deploy |
| `adr-0005` | The media ceiling and how uploads are bounded |

---

## Secret inventory

No secrets live in git. This table records where each one is owned so a rotation knows where
to look.

| Secret | Stored in | Owner |
|---|---|---|
| `DATABASE_URL` (includes the DB password) | `backend/.env`, Render env | maintainer (Supabase dashboard) |
| `DIRECT_URL` | `backend/.env`, Render env | maintainer |
| `JWT_SECRET` | `backend/.env`, Render env | maintainer |
| `STUDENT_JWT_SECRET` | `backend/.env`, Render env | maintainer |
| `ADMIN_SESSION_COOKIE_NAME` | `backend/.env`, Render env | maintainer (a name, not a secret, but keep it consistent) |
| `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` | `backend/.env` only | maintainer |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | `backend/.env`, Render env | maintainer (Google Cloud) |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | `backend/.env`, Render env | maintainer; rotate via `npm run get-token` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `backend/.env`, Render env | maintainer (Google Cloud) |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | `backend/.env`, Render env | maintainer |
| `GOOGLE_SSO_CLIENT_ID` / `GOOGLE_SSO_CLIENT_SECRET` | `backend/.env`, Render env | maintainer (Google Cloud) |
| `GOOGLE_SSO_REDIRECT_URI`, `GOOGLE_SSO_HD`, `STUDENT_APP_LOGIN_URL` | `backend/.env`, Render env | maintainer |
| `RESEND_API_KEY` | `backend/.env`, Render env | maintainer (Resend) |
| `VITE_API_BASE_URL` | Vercel env | maintainer — not a secret, but a wrong value breaks production |

Non-secret configuration in the same files: `PORT`, `NODE_ENV`, `ALLOWED_ORIGIN`,
`MAX_*_SIZE_MB`, `EVENT_YEAR`, `EMAIL_FROM_ADDRESS`, `AUTO_MIGRATE_PENDING`,
`SYNC_DRIVE_PERMISSIONS`.

---

## Known gaps and pending manual steps

Things a maintainer has to do that no code change can do for them. Listed so they are not
rediscovered during an incident.

- **Two migrations are written but not applied.** `20261001150000_add_perf_indexes` and
  `20261001223000_add_event_scheduling_fields` exist on `main` and are applied by
  `npx prisma migrate deploy` on the next deploy. Until the event one is applied, admin event
  create and edit return 500.
- **`VITE_API_BASE_URL` and the Vercel `/api` rewrite.** Setting `VITE_API_BASE_URL=/api` and
  adding a rewrite ahead of the SPA catch-all in `vercel.json`
  (`{"source": "/api/(.*)", "destination": "https://<render-host>/api/$1"}`) makes the API and
  media same-origin, which is what Chrome requires to render its full PDF toolbar in an
  iframe. Both halves are needed; without the env var the rewrite is never hit. The trade-off
  is one extra hop for API JSON and PDFs — video is unaffected, because it is redirected to
  Drive before it leaves the API.
- **The PDF toolbar is a browser policy, not a server bug.** `Content-Disposition: inline` and
  `application/pdf` are already correct. Chrome downgrades its PDF viewer to download-only for
  cross-origin frames, which is the symptom when the portal and the media are on different
  origins.
- **`NODE_OPTIONS=--max-old-space-size=384`** is not yet on the Render start command. There is
  no `render.yaml` in the repo, so this is a dashboard setting.
- **Database region.** Confirm Render and Supabase are both in `ap-south-1` and that
  `DATABASE_URL` uses the pooler port while `DIRECT_URL` uses the direct port.
- **Stale thumbnails.** The video thumbnail regenerates on the next re-upload, but rows that
  predate that fix keep their old frame until the student uploads again. A one-off backfill
  clearing the `thumbnail` column would make them regenerate lazily.
- **Two pre-existing backend test failures** are unrelated to current work and were failing
  before it: a certificate-filter assertion in `public.students.routes.test.ts` that expects a
  Prisma query shape without the `take`/`select` the route now uses, and a thumbnail
  serialisation assertion in `thumbnails.test.ts` that expects the raw buffer to be stripped.

---

## Contributing rules for agents

`AGENTS.md` is the binding document for AI coding agents working in this repository, and it
overrides default behaviour. The short version:

- Do exactly what was asked. Smallest change that solves the problem. No opportunistic
  refactors, renames or reformatting of untouched code.
- Read only what the task needs. Use the project map in `AGENTS.md` to jump straight to a file
  instead of exploring the repository.
- Do not run tests, builds or verification scripts unless asked, and then run only the
  narrowest one that covers the change.
- Never run migrations, seeds, roster imports, or anything that writes real data without
  explicit permission.
- Never read, print or commit `backend/.env`, secrets, `Students_Master_List.xlsx`, or
  anything under `backend/storage/`.
- Never edit existing migrations, lockfiles, CI config, `vercel.json`, `netlify.toml` or the
  ADRs without permission.
- Never commit unless asked, stage specific files rather than `git add -A`, and never push
  without being asked.
- Unrelated bugs go on a "noticed, not fixed" list rather than being fixed silently.

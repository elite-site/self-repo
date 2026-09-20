# ELITE Self Introduction Portal

Submission + admin portal for **ELITE Self Introduction** (IT Department, Years 2–4,
Sections A/B). Students sign in once with their college Google Workspace account, upload a
short self-introduction video, and coordinators review, shortlist, and email results from
the admin panel.

## At a glance

| Component | Tech | Role | Dev port | Deploys to |
|---|---|---|---|---|
| `web` | Vite + React | Student portal (Google SSO sign-in + upload) | `http://localhost:5173` | Netlify |
| `admin-client` | Vite + React | Admin UI, built into `backend/public/admin`, served at `/admin` | `http://localhost:5175` | built by the backend (no separate deploy) |
| `backend` | Express + Prisma (TypeScript) | REST API + admin static serving + Drive + email | `http://localhost:5001` | Render |

Student identity is **Google Workspace SSO only** (`@sasi.ac.in`). The roster file at the
repo root, `Students_Master_List.xlsx`, is the single allowlist of allowed emails; a student
whose email cell is blank has `email = NULL` and cannot sign in until the sheet is edited
and re-imported. There is **no rollNo/password student login anymore**. Admin auth
(username/password + bcrypt + httpOnly cookie) is unchanged.

## Repo map

```
.
├── web/                      # Student portal (Vite + React) -> Netlify
│   └── src/components/StudentLogin.tsx   # "Sign in with your college email" button
├── admin-client/             # Admin UI (Vite + React, base /admin/) -> backend/public/admin
├── backend/                  # Express + Prisma + TypeScript API -> Render
│   ├── prisma/
│   │   ├── schema.prisma     # Event, Submission, Student, AdminUser, EmailLog, DriveFolderCache, ActivityLog
│   │   └── migrations/       # tracked SQL (baseline 20260920055533_init)
│   ├── scripts/              # db-setup, import-roster, get-oauth-token
│   ├── src/routes/           # public, student (SSO), admin.auth, admin.api
│   ├── src/services/         # sso, drive, validation, activity
│   └── tests/                # Vitest + supertest suites
├── docs/                     # runbooks/, onboarding, ADRs, OpenAPI (see "Docs")
├── Students_Master_List.xlsx # roster source of truth (sheet "Students", 404 rows)
├── netlify.toml              # web build + publish config
├── .github/workflows/ci.yml  # PR / main CI gate
└── .nvmrc                    # Node 24
```

## Prerequisites

- **Node 24** (`nvm use`; the repo pins `.nvmrc`). npm is the only package manager.
- A **Supabase Postgres** project. A fresh instance is recommended (cold start, ADR-002);
  the password lives only in `backend/.env`.
- **Google Cloud console**, two OAuth clients approved in the college domain:
  - a _Drive_ OAuth client (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`) with a
    Drive folder for uploads; the refresh token is minted with `npm run get-token`
    (runbook: `docs/runbooks/drive-reauth.md`);
  - a _SSO OAuth 2.0 Web client_ (`GOOGLE_SSO_CLIENT_ID` / `GOOGLE_SSO_CLIENT_SECRET`) with
    **Authorized redirect URI = `GOOGLE_SSO_REDIRECT_URI`** (e.g. `https://<web>/login` in
    production).
- A **Resend** API key for admin email (winner / thank-you).

## Local setup

### 1. Environment

```bash
cp backend/.env.example backend/.env
```

Required edits:

- `DATABASE_URL` - the Supabase pooler URL (session mode, port 5432), e.g.
  `postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`.
- `PORT` - set **5001** in `backend/.env`. The admin dev proxy and the web API fallback
  both assume 5001; `.env.example` ships 5000 as a placeholder.
- `ALLOWED_ORIGIN` - comma-separated CORS list; `http://localhost:5173` is always included
  by default.
- Leave the `GOOGLE_*` values blank for a first run: the backend falls back to **local mock
  Drive** (`backend/storage/mock-drive`, gitignored), so uploads work before real Drive
  credentials exist.
- `ADMIN_DEFAULT_*` only matter at seed time - see Admin login below.

`web/.env.example` and `admin-client/.env.example` exist; the web dev server works without
one (it falls back to `http://localhost:5001/api`).

### 2. Install

```bash
cd backend && npm ci        # backend + (postinstall) admin-client deps
cd ../web && npm ci
```

### 3. Database: create, migrate, seed

```bash
cd backend
npm run prisma:generate     # prisma generate
npm run prisma:migrate      # prisma migrate dev — applies migrations/20260920055533_init
npm run prisma:seed         # event + admin user + roster import (404 students)
```

Expected seed tail:

```
✓ 404 students imported
✓ 26 students have no email yet (kept NULL — locked out of SSO until re-import)
```

`prisma:seed` imports the roster for you. When the sheet changes later, run
`npm run roster:import` instead (runbook: `docs/runbooks/roster-import.md`).

### 4. Run the dev servers (three terminals)

```bash
cd backend && npm run dev          # API       -> http://localhost:5001  (/health, /ready)
cd admin-client && npm run dev     # admin UI  -> http://localhost:5175/admin
cd web && npm run dev              # portal    -> http://localhost:5173
```

### Admin login

The seed creates an `AdminUser` from `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD`
(defaults `ADMIN` / `ADMIN123`). Sign in at `http://localhost:5001/admin` (or the admin dev
server). **Change the password after first login** - there is no self-service reset; re-run
`npm run prisma:seed` with new `ADMIN_DEFAULT_*` values to rotate.

## Tests

- Backend (Vitest + supertest): `cd backend && npm test` - SSO service/routes, roster
  parser, video validation, blank-email lockout.
- Web e2e (Playwright): `cd web && npm run test:e2e` - needs the backend running against a
  seeded DB with `dist/` built; the SSO smoke spec is secret-gated (skips when
  `STUDENT_JWT_SECRET` is unset).
- CI: `.github/workflows/ci.yml` builds all three projects and runs the backend suite on
  every PR and on push to `main`.

## Deploy (summary - see `docs/runbooks/deploy.md`)

- **Netlify - web (prod).** Repo-root `netlify.toml` (`base = "web"`,
  `npm ci && npm run build`, publish `dist`, catch-all SPA rewrite) publishes `main`.
  **Set `VITE_API_BASE_URL`** to `https://<render-service>.onrender.com/api` - with no
  value the build falls back to `http://localhost:5001/api`, which would break production.
- **Render - backend + admin.** Root directory `backend`.
  - Build: `npm install && npx prisma generate && npm run build && npm run build:admin`
  - Pre-deploy / release: `npx prisma migrate deploy`
  - Start: `node dist/server.js`
  - Health: `/health` (liveness), `/ready` (DB + Drive readiness; 503 until both respond).

  `ALLOWED_ORIGIN` on Render must include the Netlify production URL, and the prod env must
  override `GOOGLE_SSO_REDIRECT_URI` and `STUDENT_APP_LOGIN_URL` with the production login
  path.

## Secret inventory

No secrets live in git: `backend/.env` is gitignored and `.env.example` holds only
names/placeholders. All entries below are owned by the maintainer; the **Supabase DB
password exists only in `backend/.env` (local) and the Render service env**.

| Secret | Where stored | Who owns |
|---|---|---|
| `DATABASE_URL` (Supabase pooler URL, incl. password) | `backend/.env`, Render env | maintainer (Supabase dashboard) |
| `JWT_SECRET` (admin JWT) | `backend/.env`, Render env | maintainer |
| `ADMIN_SESSION_COOKIE_NAME` (admin session cookie) | `backend/.env`, Render env | maintainer |
| `STUDENT_JWT_SECRET` (SSO JWT + OAuth state) | `backend/.env`, Render env | maintainer |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (Drive) | `backend/.env`, Render env | maintainer (Google Cloud console) |
| `GOOGLE_OAUTH_REFRESH_TOKEN` (Drive access) | `backend/.env`, Render env | maintainer - rotate via `npm run get-token` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (Drive fallback) | `backend/.env`, Render env | maintainer (Google Cloud console) |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | `backend/.env`, Render env | maintainer |
| `RESEND_API_KEY` (admin email) | `backend/.env`, Render env | maintainer (Resend dashboard) |
| `GOOGLE_SSO_CLIENT_ID` / `GOOGLE_SSO_CLIENT_SECRET` (student login) | `backend/.env`, Render env | maintainer (Google Cloud console) |
| `GOOGLE_SSO_REDIRECT_URI`, `GOOGLE_SSO_HD`, `STUDENT_APP_LOGIN_URL` | `backend/.env`, Render env | maintainer |
| `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` (seed-time admin) | `backend/.env` only | maintainer |

Non-secret config in the same file: `PORT`, `NODE_ENV`, `ALLOWED_ORIGIN`, `MAX_*_SIZE_MB`,
`EVENT_YEAR`, `EMAIL_FROM_ADDRESS` (default `Self Introduction <elite@sasi.ac.in>`).
Videos are capped at `MAX_VIDEO_SIZE_MB` (default 25).

## Docs

- `docs/onboarding.md` - 30-minute new-maintainer path.
- `docs/runbooks/deploy.md` - CI gates, Netlify/Render deploys, migration step, promotion.
- `docs/runbooks/restore.md` - Supabase backup/RPO + restore procedure.
- `docs/runbooks/roster-import.md` - editing the Excel roster and re-importing.
- `docs/runbooks/drive-reauth.md` - refreshing the Drive OAuth token.
- `docs/openapi.yaml` - API contract for the student + admin endpoints.
- `docs/architecture/adr-0001..0005.md` - SSO, Supabase cold start, tracked migrations,
  buildables, media ceiling decisions (ADR-001..005).
- `docs/superpowers/specs` + `docs/superpowers/plans` - design + implementation history for
  this iteration.
- `.github/workflows/ci.yml` - the CI definition.

## Data handling

Students are identifiable (name, roll number, college email, a video of the face). Treat
the roster and submissions as internal institutional data: keep this repo private, never
copy the roster into public channels, don't share Drive links outside the coordinators, and
delete exported admin spreadsheets when no longer needed.
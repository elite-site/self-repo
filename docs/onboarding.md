# Onboarding: 30-Minute New-Maintainer Path

Everything to go from no access to a running portal and a deployed first change, in about
30 minutes. The portal = three projects in one repo: `web` (student portal, Netlify),
`admin-client` (admin UI, served by the backend at `/admin`), and `backend`
(Express + Prisma API, Render).

## 0. Read first (2 min)

- `README.md` - repo map, setup, secret inventory, deploy summary.
- `docs/architecture/adr-0001..0005.md` - why the portal is an SSO-only Google Workspace app
  on a cold-start Supabase instance with tracked migrations.
- `docs/runbooks/*.md` - deploy, restore, roster import, Drive re-auth. Note the **26
  roster students with blank emails are locked out** by design until the sheet is updated.

## 1. Clone + environment (3 min)

```bash
git clone <this-repo> && cd self-intro-portal
nvm use                                    # Node 24 (.nvmrc)
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

- `DATABASE_URL` - Supabase pooler URL (port 5432), password from the Supabase dashboard.
- `PORT` - set `5001` (the dev tooling assumes it; `.env.example` ships 5000).
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` and
  `GOOGLE_SSO_CLIENT_ID` / `GOOGLE_SSO_CLIENT_SECRET` from the college Google Cloud console
  (Drive client + SSO web client).
- `GOOGLE_OAUTH_REFRESH_TOKEN` - minted by `npm run get-token`
  (see `docs/runbooks/drive-reauth.md`).
- `RESEND_API_KEY` - Resend dashboard.

Leave Drive/SSO values blank for mock-mode development: uploads land in
`backend/storage/mock-drive` instead of Google Drive.

## 2. Install + migrate + seed (8 min)

```bash
cd backend
npm ci                    # installs backend + admin-client (postinstall)
npm run prisma:generate
npm run prisma:migrate    # applies migrations/20260920055533_init
npm run prisma:seed       # 404 students + admin + event
```

Seed tail to expect: `404 students imported` and `26 students have no email yet`.

```bash
cd ../web && npm ci
```

## 3. Run it (5 min)

Three terminals:

```bash
cd backend && npm run dev            # API -> http://localhost:5001  (/health, /ready)
cd admin-client && npm run dev       # admin -> http://localhost:5175/admin
cd web && npm run dev                # portal -> http://localhost:5173
```

- Admin login: `ADMIN` / `ADMIN123` (from `ADMIN_DEFAULT_*` at seed time) at
  `/admin`. Change it after first login.
- Student login is Google SSO (`@sasi.ac.in`) restricted to roster emails - with mock Drive
  and a local SSO client, a roster email can sign in and upload.

## 4. Run the checks (5 min)

```bash
cd backend && npm test               # Vitest suite
cd web && npm run test:e2e           # Playwright smoke (needs seeded DB + built dist)
```

## 5. Deploy your first change (7 min)

1. Branch -> change -> push -> open a PR. CI (`.github/workflows/ci.yml`) builds all three
   projects and runs the backend tests; the PR is mergeable only when green.
2. Merge to `main`.
   - **Netlify (web):** auto-deploys `main` from `netlify.toml` (`base = "web"`, publish
     `dist`). Ensure the production `VITE_API_BASE_URL` points at the Render API.
   - **Render (backend/admin):** sees a new deploy; its pre-deploy step runs
     `npx prisma migrate deploy`, build runs
     `npm install && npx prisma generate && npm run build && npm run build:admin`, start is
     `node dist/server.js`.
3. Verify: `curl https://<render>/ready` returns `{"status":"ok","db":"ok","drive":"ok"}`,
   the Netlify site signs in, and `/admin` works. Full steps + staging->prod promotion in
   `docs/runbooks/deploy.md`.

## 6. Where the knowledge lives

- **Runbooks:** `docs/runbooks/{deploy,restore,roster-import,drive-reauth}.md`.
- **Decisions:** `docs/architecture/adr-0001..0005.md`.
- **API contract:** `docs/openapi.yaml`.
- **This iteration's design + plan:** `docs/superpowers/specs/` and
  `docs/superpowers/plans/`.
- **Secrets:** see the inventory table in `README.md`; the Supabase password exists only in
  `backend/.env` and the Render env.
- **Roster ground truth:** `Students_Master_List.xlsx` (repo root) -> import with
  `npm run roster:import`.
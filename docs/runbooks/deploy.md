# Deploy Runbook

This portal deploys from GitHub `main`. The pipeline: PR -> CI gate -> merge ->
Netlify web production + Render (backend/admin staging, then promotion to prod).

## 1. PR: CI gates

`.github/workflows/ci.yml` runs on every pull request and on push to `main`:

1. `backend`: `npm ci`, `npx prisma generate`, `npm run build` (tsc), `npm test` (Vitest).
2. `web`: `npm ci && npm run build`.
3. `admin-client`: `npm ci && npm run build`.

A PR is mergeable only when all three are green. CI does **not** deploy; deploys happen on
the platforms below.

## 2. Merge to main

### Netlify (web, production)

Repo-root `netlify.toml` is the whole config:

```toml
[build]
  base = "web"
  command = "npm ci && npm run build"
  publish = "dist"
```

- Netlify watches `main` and auto-deploys the published `web/dist` with the catch-all SPA
  rewrite to `/index.html`.
- Set the production build env var: `VITE_API_BASE_URL=https://<render-service>.onrender.com/api`.
  Without it the build falls back to `http://localhost:5001/api` and breaks in production.

### Render (backend + admin, staging first)

If a **staging service** is wired to `main`, the merge triggers a staging deploy. Any
production deploy is a promotion (step 4). Review the config below once per service.

#### Service settings (both staging and prod)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install && npx prisma generate && npm run build && npm run build:admin` |
| Pre-deploy (migration) | `npx prisma migrate deploy` |
| Start command | `node dist/server.js` |
| Health check (liveness) | `GET /health` |
| Health check (readiness) | `GET /ready` (returns 200 only when DB **and** Drive respond, else 503) |

The `build:admin` step installs `../admin-client` and compiles it into
`backend/public/admin`, which the backend serves at `/admin`. The admin bundle is never
deployed to Netlify.

#### Environment

Mirror `backend/.env` values into the Render service env. Minimum set:

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
JWT_SECRET, ADMIN_SESSION_COOKIE_NAME, STUDENT_JWT_SECRET
GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_DRIVE_ROOT_FOLDER_ID
RESEND_API_KEY, EMAIL_FROM_ADDRESS
GOOGLE_SSO_CLIENT_ID, GOOGLE_SSO_CLIENT_SECRET, GOOGLE_SSO_HD, STUDENT_APP_LOGIN_URL
GOOGLE_SSO_REDIRECT_URI=https://<render-api>/api/student/google/callback (the backend route that exchanges the code)
ALLOWED_ORIGIN=https://<netlify-prod>.netlify.app
PORT=5000 (or any public port Render assigns)
```

Notes:

- Staging and prod each need `GOOGLE_SSO_REDIRECT_URI` set to their own Render API callback
  (`https://<render-api>.onrender.com/api/student/google/callback`) and `STUDENT_APP_LOGIN_URL`
  set to their own Netlify login page; the app origin must be in `ALLOWED_ORIGIN`.
- The migration step (`prisma migrate deploy`) is the only way schema changes reach the
  deployed DB - never run `prisma db push` against prod.

## 3. Smoke the staging deploy

1. `curl -s https://<staging>.onrender.com/ready` - expect `{"status":"ok","db":"ok","drive":"ok"}`.
2. Log in to the staging admin at `https://<staging>.onrender.com/admin`.
3. On a staging Netlify preview branch, complete a Google sign-in and upload a small video;
   confirm the file appears in admin review and streams.

## 4. Promote staging to prod

There is no `render.yaml` in the repo; promotion is driven from the Render dashboard.

1. Open the Render **production** service -> Deploys.
2. Deploy the same commit currently verified on staging (or auto-deploy if production is
   wired to a branch).
3. The pre-deploy step runs `npx prisma migrate deploy` before the new app boots.
4. Watch the deploy log for `Running release command` and the "Ready" state.

## 5. Post-deploy verification

```bash
curl -s https://<prod>.onrender.com/health
curl -s https://<prod>.onrender.com/ready     # db + drive both "ok"
```

1. Production Google sign-in works end to end (roster email -> dashboard).
2. Admin (`https://<prod>.onrender.com/admin`) login and a submission list render.
3. Netlify site loads and calls the production API (check the Network tab for the
   production origin, not `localhost:5001`).

## Rollback

- Netlify: Deploys -> pick the previous production deploy -> "Publish".
- Render: Deploys -> select the previous successful deploy -> "Rollback". Schema migrations
  already applied are **not** rolled back - see `docs/runbooks/restore.md` if a migration
  needs to be unwound.

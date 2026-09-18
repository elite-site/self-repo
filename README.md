# ELITE Self Introduction Portal

Standalone submission + admin portal for **ELITE Self Introduction** (IT Department, Years 2–4, Sections A/B).

## Structure

```
self-intro-portal/
├── backend/      Express + Prisma + TypeScript API (port 5001)
├── admin-client/ React admin workspace (served at /admin by backend)
└── web/          Public submission site (Vite dev port 5177)
```

## Constraints

- Applicants: **Year 2–4**, **Section A/B**, **Branch IT only**.
- One **video** per applicant: `mp4/mov/webm`, max **80 MB**.
- One entry per roll number and per email (409 conflict response).
- Admin-side features: login, stats, applicants table, video review, member selection, email dispatch (winner / thank-you), activity audit log, Excel export.

## Setup

Database (Supabase — same project as parent, **isolated `self_intro` schema** so tables never collide with the parent's `public` tables):

```bash
cp backend/.env.example backend/.env   # edit values (or use backend/.env with your creds)
npm run db:setup && npx prisma db push && npm run prisma:seed
```

`db:setup` ensures the schema named in your `DATABASE_URL` (`?schema=self_intro`) exists. `prisma db push` then creates the portal's tables/enums inside that schema only.

Local dev:

```bash
cd backend
npm install                   # also builds admin-client via postinstall
npm run dev                   # API on http://localhost:5001
```

Admin panel: `http://localhost:5001/admin` (built output). During development:

```bash
cd admin-client
npm run dev                   # Vite on http://localhost:5175 (proxies /admin to :5001)
```

Public site:

```bash
cd web
npm install
npm run dev                   # Vite on http://localhost:5177
```

## Deployment

### Render (backend + admin)
- Root Directory: `backend`
- Build: `npm install && npx prisma generate && npm run build && npm run build:admin`
- Start: `node dist/server.js`
- Env: use the same env vars as `backend/.env`. `DATABASE_URL` must include `?schema=self_intro` (Supabase pooler **session mode, port 5432** — not 6543, which can break the schema param).
- After first deploy, run once: `npm run db:setup && npx prisma db push && npm run prisma:seed`

### Vercel (public form)
- Root `vercel.json` sets `rootDirectory: web`, build `npm run build`, publish `dist`, SPA rewrite.
- Import `elite-site/self-repo` on Vercel → Auto-detected Vite → Deploy.
- Env: `VITE_API_BASE_URL=https://<render-service>.onrender.com/api`
- `ALLOWED_ORIGIN(S)` on Render must include the Vercel URL.

## Configuration

- `backend/.env` — `DATABASE_URL`, `PORT=5001`, `ADMIN_SESSION_COOKIE_NAME=si_admin_session`, `MAX_VIDEO_SIZE_MB=80`, `ALLOWED_ORIGIN=http://localhost:5177`.
- Google Drive: leave `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_DRIVE_FOLDER_ID` empty to run in **mock mode** (files stored at `backend/storage/mock-drive`). Fill them in for real Drive uploads.
- Seed admin: `admin@club.internal` / `AdminPassword123!` (change after first login).

## Media (video) handling

- Backend proxy: `GET /admin/api/submissions/:id/media/:key` streams the video behind the admin session.
- `Submission` records store `videoDriveId` (Drive file id or mock file key) and `driveFolderPath`.
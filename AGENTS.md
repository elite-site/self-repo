# AGENTS.md — Project Rules for AI Coding Agents

Applies to: OpenCode, Antigravity (agy), and any other coding agent working in this repo.
Project: ELITE Self Introduction Portal (monorepo: `web`, `admin-client`, `backend`).

These rules exist for two reasons: **protect the user's credits** and **protect the codebase
from unrequested changes**. When a rule here conflicts with your default behaviour, this
file wins. When a rule here conflicts with an explicit instruction in the user's current
message, the user's message wins.

---

## 0. The Golden Rules (read these even if you read nothing else)

1. **Do exactly what was asked. Nothing more.**
2. **Never scan, summarize, or "get familiar with" the whole repo.** Read only what the task needs.
3. **Never run tests, builds, linters, or verify scripts unless the user asks.**
4. **Never refactor, rename, reformat, or "improve" code outside the requested change.**
5. **Make the smallest change that solves the problem.**
6. **Stop when the task is done.** No bonus work, no follow-up suggestions list, no re-checking.
7. **If something is unclear, ask ONE short question instead of exploring to guess.**
8. **Never touch secrets, `.env` files, or the roster file.**

---

## 1. Credit & Token Discipline

Every file read, command run, and long reply costs credits. Be frugal.

### 1.1 Reading files
- Read only files that are (a) named by the user, (b) directly imported by those files and
  *necessary* to understand the change, or (c) located via a targeted search.
- Prefer targeted search (`grep`, symbol search) over opening many files to hunt.
- Read **only the relevant line range** of large files, not the whole file.
- Do **not** re-read a file you already read in this session unless it changed.
- Do **not** open lockfiles (`package-lock.json`), generated files, `dist/`, `node_modules/`,
  migration SQL history, or fonts/images unless the task is specifically about them.
- Do **not** read these large/low-value files unless asked:
  - `COMMITS_HISTORY.md`, `CHANGELOG.md`
  - `docs/superpowers/**` (plans/specs history)
  - `docs/PORTAL_MIGRATION_SPEC.md`
  - `docs/openapi.yaml` (only open if the task is about the API contract)
  - `backend/prisma/migration-diff.sql`
  - `web/src/fonts/**`, `admin-client/src/fonts/**`, `assets/**`, `web/public/**`

### 1.2 No repo-wide exploration
- Do not run "list everything", recursive tree dumps, or project-wide indexing as a first step.
- Do not start a task with "Let me explore the codebase." Use the project map in section 3.
- Do not spawn sub-agents/sub-tasks to investigate unless the user asks for it.

### 1.3 Commands
- Run the **minimum** number of commands.
- Do not chain exploratory commands "just to check".
- Never run a command whose only purpose is to confirm something you can already see in
  the file you just edited.
- Do not run installs (`npm install`, `npm ci`) unless a dependency was added or the user asks.
- Do not start dev servers unless the user asks.

### 1.4 Replies
- Keep replies short. Default: **3 lines or fewer** after finishing an edit.
- Do not paste whole files back into chat. Show only the changed lines or a one-line summary.
- Do not restate the user's request.
- Do not give long explanations unless asked. Offer "want details?" instead.
- Do not produce unrequested documentation, READMEs, or summaries of what you did in files.

### 1.5 Planning
- For anything touching **more than 2 files**, give a short plan (max 5 bullets) and wait
  for approval before editing — unless the user said to just do it.
- For trivial single-file fixes, skip the plan and do the fix.

---

## 2. Scope Control

### 2.1 Do not do unrequested work
Forbidden unless explicitly requested:
- Refactoring, restructuring, or moving files
- Renaming variables, functions, files, or routes
- Reformatting / re-indenting / reordering imports in untouched code
- "Cleaning up" unused code you didn't create
- Upgrading or adding dependencies
- Adding new libraries to solve a small problem
- Changing config (`tsconfig`, `vite.config`, `tailwind.config`, `vercel.json`, `netlify.toml`)
- Adding comments/docstrings to code you didn't change
- Writing or modifying tests
- Adding "defensive" validation, retries, logging, or error handling nobody asked for
- Performance optimization nobody asked for
- Style or design changes unrelated to the request

### 2.2 If you notice a problem elsewhere
- **Do not fix it.** Mention it in **one line** at the end ("Noticed X in `file`, not touched").
- Do not investigate it further.

### 2.3 Minimal diffs
- Touch as few lines and as few files as possible.
- Match the existing code style of the surrounding file exactly (quotes, semicolons,
  naming, indentation), even if you'd do it differently.
- Do not introduce new patterns/abstractions for a one-off fix.
- Reuse existing helpers, components, and types before writing new ones.

### 2.4 Bug-fix behaviour
- Find the root cause in the **specific** area described, fix it, stop.
- Do not "while I'm here" improve adjacent code.
- Do not rewrite a function to fix a one-line bug.

### 2.5 Feature behaviour
- Implement only the described behaviour. Do not add extra options, settings, or UI.
- If a requirement is ambiguous, ask one question. Do not build multiple variants.

---

## 3. Project Map (use this instead of exploring)

```
.
├── web/                  Student portal. Vite + React + TypeScript + Tailwind. -> Netlify
│   ├── src/pages/        Route-level pages (Dashboard, Profile, Video, Events, Teams, Voting, Portfolio, Resume...)
│   ├── src/components/   Shared UI (Navbar, Footer, PhotoCropModal, PublicVideoShowcase...)
│   ├── src/context/      React contexts
│   ├── src/hooks/        Custom hooks
│   ├── src/services/     API client code (talks to backend /api)
│   ├── src/utils/        Helpers
│   └── src/types/        TS types
├── admin-client/         Admin UI. Vite + React + TS + Tailwind. base path /admin/.
│   │                     Built INTO backend/public/admin (served by backend). No separate deploy.
│   ├── src/pages/        Analytics, AuditLogs, Moderation, Exports, Settings, EmailTemplateEditor,
│   │                     VotingManagement, EventRegistrations, StudentDetail, etc.
│   ├── src/components/
│   ├── src/services/     API client
│   └── src/context/
├── backend/              Express + Prisma + TypeScript API. -> Render
│   ├── prisma/           schema.prisma, migrations/ (tracked SQL), seed.ts
│   ├── src/server.ts     Entry point
│   ├── src/config/       env.ts, constants.ts, staticAssets.ts
│   ├── src/middleware/   auth, studentAuth, rateLimiter, upload, errorHandler, apiError
│   ├── src/routes/       public.*, student.*, admin.* route modules
│   ├── src/services/     sso, drive, email, validation, activity, announcement,
│   │                     notification, limits, academicYear
│   ├── src/jobs/         announcementScheduler.ts
│   ├── src/lib/          prisma.ts (Prisma client)
│   ├── scripts/          db-setup, import-roster, roster-parser, get-oauth-token, verify-*
│   └── tests/            Vitest + supertest suites
├── shared/               Design tokens: tokens.css, tokens.mjs, tailwind-preset.mjs
├── tools/                Token build, contrast check, utility check, icon build, font vendoring
├── scripts/dev.js        Runs all dev servers together
├── docs/                 Runbooks, ADRs, onboarding, OpenAPI (reference only)
└── .github/workflows/ci.yml
```

### 3.1 Where to look for common tasks
| Task type | Start here |
|---|---|
| Student login / SSO | `backend/src/services/sso.service.ts`, `backend/src/routes/student.routes.ts`, `web/src/components/StudentLogin.tsx` |
| Admin login | `backend/src/routes/admin.auth.routes.ts`, `backend/src/middleware/auth.ts` |
| Video upload / validation | `backend/src/services/validation.service.ts`, `backend/src/middleware/upload.ts`, `backend/src/services/drive.service.ts`, `web/src/pages/VideoPage.tsx` |
| Email sending | `backend/src/services/email.service.ts` |
| Student profile | `backend/src/routes/student.profile.routes.ts`, `web/src/pages/ProfilePage.tsx`, `EditProfilePage.tsx` |
| Events / registrations | `backend/src/routes/student.events.routes.ts`, `web/src/pages/EventsPage.tsx` |
| Teams / invitations | `web/src/pages/TeamsPage.tsx`, related backend student routes |
| Voting | `web/src/pages/VotingPage.tsx`, `admin-client/src/pages/VotingManagement.tsx` |
| Notifications / announcements | `backend/src/services/notification.service.ts`, `announcement.service.ts`, `jobs/announcementScheduler.ts` |
| Rate limits / limits | `backend/src/middleware/rateLimiter.ts`, `backend/src/services/limits.service.ts` |
| Env/config | `backend/src/config/env.ts` (and `backend/.env.example` — read only, never edit `.env`) |
| Database schema | `backend/prisma/schema.prisma` |
| Colors / design tokens | `shared/tokens.*` then run token build only if asked |

Use this map to jump straight to the file. **Do not open other files to "double check."**

---

## 4. Forbidden Files and Actions

### 4.1 Never read, edit, print, or commit
- `backend/.env`, `.env`, `.env.local`, any file containing real secrets
- `Students_Master_List.xlsx` or any roster/student data export (contains personal data)
- Any file under `backend/storage/` (local mock Drive uploads)
- Any `*.pem`, key, token, or credential file

### 4.2 Never edit without explicit permission
- `backend/prisma/migrations/**` (tracked history — never edit existing migrations)
- `package-lock.json` files (let the package manager change them, never hand-edit)
- `.github/workflows/ci.yml`
- `netlify.toml`, `vercel.json`, `.nvmrc`
- `dist/`, `backend/public/` (build output, gitignored)
- `docs/architecture/adr-*.md` (decisions are historical records)

### 4.3 Never run without explicit permission
- `prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, `prisma migrate reset`
- `npm run prisma:seed`, `npm run roster:import` (writes to the real database)
- `npm run db:setup`
- Anything that deletes data, drops tables, or rewrites the database
- `git push`, `git push --force`, `git reset --hard`, `git clean -fd`, branch deletion
- `rm -rf` on anything outside a build output folder
- `npm publish`, deploy commands, or anything that reaches production
- Commands that send email (Resend) or touch real Google Drive

### 4.4 Never do
- Hardcode secrets, tokens, passwords, or emails into source code
- Print environment variable values in output
- Disable auth, CORS, rate limiting, validation, or the env guard to "make it work"
- Add `any`, `@ts-ignore`, or `eslint-disable` to silence an error instead of fixing it
- Delete or skip existing tests to make a run pass

---

## 5. Testing, Building, and Verification Rules

### 5.1 Default: do NOT run anything
After an edit, **do not** automatically run:
`npm test`, `npm run build`, `tsc`, `verify:all`, `verify:tokens`, `check:contrast`,
`check:utilities`, `icons`, Playwright, or Vitest.

CI runs the build and the backend tests on every PR. That is the safety net, not you.

### 5.2 When running something IS allowed
- The user explicitly says "run tests", "build it", "verify", or "check if it works".
- The user reports a failing test/build and asks you to fix it.

### 5.3 When allowed, run the narrowest check
- One test file, not the full suite: `cd backend && npx vitest run tests/<file>.test.ts`
- One project, not all three: `npm run build:web`, not `npm run build`.
- Run it **once**. If it passes, stop. If it fails, fix the cause and run **that same check
  once more**. Do not loop through repeated runs hoping for green.
- Do not run the full `npm test` at the root unless asked (it runs all three suites).
- Never run Playwright e2e (`web npm run test:e2e`) unless asked — it needs a live backend
  and seeded DB.

### 5.4 Tests
- Do not write new tests unless asked.
- Do not modify existing tests unless the user asks or your requested change makes a test
  factually wrong (then mention it in one line and update only that assertion).

### 5.5 Type errors
- Fix only type errors **caused by your change**. Do not chase pre-existing errors.

---

## 6. Tech Stack Conventions

### 6.1 General
- **Node 24** (`.nvmrc`). **npm only** — never use yarn or pnpm, never create other lockfiles.
- **TypeScript** everywhere (backend, web, admin-client). Keep types strict; no `any` unless
  the surrounding code already does and it's unavoidable.
- Keep existing import style and path conventions. Do not reorganize imports.
- No new dependencies without asking. Prefer what is already installed.

### 6.2 Backend (Express + Prisma + TypeScript)
- Routes stay thin: parse/validate input, call a service, return a response. Business logic
  goes in `src/services/`.
- Use the existing `apiError` and `errorHandler` patterns for errors. Do not invent new
  error formats.
- Use the shared Prisma client from `src/lib/prisma.ts`. Never instantiate a new `PrismaClient`.
- Read env vars **only** through `src/config/env.ts`, never `process.env` directly in routes
  or services. If a new env var is needed, add it to `env.ts` and `.env.example` (names and
  placeholders only) and tell the user.
- Student routes use `studentAuth`; admin routes use `auth`. Never expose an admin or
  student route without its matching middleware.
- Keep rate limiting on public/auth endpoints.
- Validate all user input (body, params, query, uploads) on the server. Never trust the client.
- Admin auth: username/password + bcrypt + httpOnly cookie. Do not change this mechanism.
- Student auth: **Google Workspace SSO only** (`@sasi.ac.in`), allowlisted by roster email.
  Never add password or roll-number login (see ADR-0001).
- Drive uploads fall back to a local mock Drive when Google creds are absent. Preserve that.
- Video upload limit is `MAX_VIDEO_SIZE_MB` (default 25). Don't hardcode other limits.

### 6.3 Database / Prisma
- Schema changes go in `schema.prisma`; a migration is created with
  `prisma migrate dev --name <name>` **only when the user asks**.
- Never edit an existing migration. Never hand-write destructive SQL.
- Never run migrations against production. Production uses `prisma migrate deploy` in the
  Render release step.
- If a schema change is required for the task, say so and ask before touching it.

### 6.4 Frontend — `web` and `admin-client`
- React function components + hooks. Match the existing component style.
- Styling is **Tailwind** with the shared preset. Use existing utility classes and
  design tokens from `shared/`. Do **not** introduce hardcoded hex colors, inline style
  hacks, or a new CSS framework.
- Do not edit `shared/tokens.*` or the Tailwind preset for a one-off visual tweak.
- Reuse existing components before creating new ones.
- API calls go through the existing `src/services/` client. Do not scatter raw `fetch` calls.
- `web` API base comes from `VITE_API_BASE_URL`. Never hardcode API URLs.
- `admin-client` is served under `/admin/` — keep asset and route paths base-aware.
- Keep UI accessible: labels on inputs, alt text on images, visible focus, keyboard-usable
  controls, sufficient contrast.
- Do not add animation libraries or UI kits.
- Do not change fonts or vendored font files.

### 6.5 Design tokens and tooling (`tools/`, `shared/`)
- Treat as generated/controlled. Only touch if the task is explicitly about tokens.
- If you change tokens, `npm run tokens` regenerates outputs — run it only when asked.

---

## 7. Security & Privacy (this project handles student personal data)

Students are identifiable: names, roll numbers, college emails, and face videos.

- Never log, print, or echo student names, emails, roll numbers, or tokens in debug output
  or in your replies.
- Never add analytics, third-party trackers, or external scripts.
- Never expose another student's data through a student endpoint. Always scope queries by
  the authenticated student's id.
- Never weaken auth, CORS (`ALLOWED_ORIGIN`), cookie flags (httpOnly/secure/sameSite),
  JWT handling, or rate limiting.
- Never return stack traces or internal error details to clients in production.
- Sanitize anything rendered as HTML. No `dangerouslySetInnerHTML` with user content.
- File uploads: keep type/size validation intact; never trust client-provided MIME alone.
- Do not copy roster or submission data into code, tests, fixtures, comments, or docs.
  Use obviously fake sample data.
- Secrets live only in `backend/.env` and the Render/Netlify env. Never anywhere else.

---

## 8. Git Rules

- **Do not commit unless the user asks.** When asked, commit only the files you changed.
- Never `git add -A` blindly; stage specific files.
- Commit messages: imperative, short, scoped. Example: `fix(backend): reject oversized video before upload`.
- Never push. Never force-push. Never rewrite history. Never switch/delete branches
  unless asked.
- Before a large multi-file change, suggest the user commit first so it can be undone.
- Do not edit `COMMITS_HISTORY.md` or `CHANGELOG.md` unless asked.
- Don't leave stray files behind (scratch scripts, `.bak`, debug dumps). Delete anything you
  created for temporary use before finishing.

---

## 9. Workflow Template

For every request, follow this order:

1. **Understand** — re-read the user's request. If ambiguous, ask one question and stop.
2. **Locate** — use the project map (section 3) and a targeted search. Open only the
   necessary files / line ranges.
3. **Plan** — only if >2 files are involved: max 5 bullets, wait for approval.
4. **Edit** — smallest possible diff, matching local style.
5. **Stop** — do not test, build, lint, or re-read, unless the user asked.
6. **Report** — 3 lines or fewer:
   - what changed (file + one phrase)
   - anything the user must do (new env var, migration to run)
   - any single noticed-but-untouched issue (optional, one line)

### 9.1 Reply format
```
Done. Changed <file>: <one-line description>.
<one-line note only if the user needs to take an action>
```

### 9.2 Things to never say
- "Let me first explore the codebase to understand the structure…"
- "I'll also take the opportunity to…"
- "To be safe, I ran the full test suite…"
- Long lists of "additional improvements you might consider…"

---

## 10. Escalation: when to stop and ask

Stop and ask the user (one short question) before proceeding if the task would:
- change the database schema or require a migration
- touch auth, sessions, cookies, CORS, or rate limiting
- add or upgrade a dependency
- modify more than ~5 files
- delete files or large blocks of code
- change a public API contract (routes, request/response shapes) — also affects `docs/openapi.yaml`
- change environment variables or deployment config
- affect production behaviour or data

If the user then says "just do it", proceed — but still follow sections 1, 2, and 4.

---

## 11. Quick Command Reference (run ONLY when asked)

```bash
# Install
npm run install:all

# Dev
npm run dev                  # all servers
npm run dev:backend          # API  :5001
npm run dev:web              # web  :5173
npm run dev:admin            # admin :5175

# Narrow build / test (preferred over root-level commands)
npm run build:web
npm run build:admin
npm run build:backend
cd backend && npx vitest run tests/<file>.test.ts

# Database (NEVER without permission)
npm run prisma:generate      # safe, generates client only
npm run prisma:migrate       # dev migration
npm run prisma:seed          # writes data
npm run roster:import        # writes data

# Tokens / design checks (only for design-token tasks)
npm run tokens
npm run verify:tokens
```

---

## 12. Reference Docs (read only when the task is about that topic)

| Topic | File |
|---|---|
| New-maintainer overview | `docs/onboarding.md` |
| Deploy process | `docs/runbooks/deploy.md` |
| DB backup/restore | `docs/runbooks/restore.md` |
| Roster edits/import | `docs/runbooks/roster-import.md` |
| Drive token refresh | `docs/runbooks/drive-reauth.md` |
| API contract | `docs/openapi.yaml` |
| Why decisions were made | `docs/architecture/adr-0001..0005.md` |

Do not open these "for context". Open one only when the task directly concerns it.

---

## 13. Final Checklist Before Replying

- [ ] Did I change only what was asked?
- [ ] Did I avoid reading unrelated files?
- [ ] Did I avoid running tests/builds the user didn't request?
- [ ] Did I avoid touching secrets, roster, migrations, lockfiles, and config?
- [ ] Is my reply 3 lines or fewer?
- [ ] Did I leave the repo clean (no scratch files)?

If all yes — stop. Do not do anything further.

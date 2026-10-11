# AGENTS.md — Rules for AI Coding Agents

Applies to: All coding agents in `self-intro-portal` (web, admin-client, backend).

## 1. Golden Rules
1. **Do exactly what was asked.** Nothing more. Smallest possible diff.
2. **Never refactor, reformat, rename, or "improve" code outside the requested change.**
3. **No repo-wide exploration or scanning.** Read only files essential to the task.
4. **Stop when done.** No bonus work, no unprompted follow-ups or cleanup.
5. **If unclear, ask one short question.** Keep replies concise (<= 3 lines).

## 2. Project Map
- `web/`: Student portal (React + TS + Tailwind) -> `src/features/`, `src/shared/`
- `admin-client/`: Admin portal (React + TS + Tailwind) -> `src/features/`, `src/shared/`
- `backend/`: Express + Prisma + TS -> `src/modules/`, `src/infrastructure/`, `src/shared/`

## 3. Forbidden Actions
- **Git**: NEVER commit to `main`. NEVER `git push`, reset, force push, or switch branches.
- **Secrets & Data**: NEVER touch secrets, `.env*`, keys, or roster (`*.xlsx`, student PII).
- **Database**: NEVER run `prisma migrate`, `db push`, `prisma:seed`, `roster:import`, or destructive SQL. Never edit existing migrations in `backend/prisma/migrations/`.
- **Integrity**: Never disable auth, CORS, rate limits, or input validation. Never leak PII in logs.

## 4. Testing & Build Discipline
- **Default: Run NOTHING.** Do not run `npm test`, `npm run build`, or linters unless asked.
- **When asked, run narrowest check once**:
  - One test file: `cd backend && npx vitest run tests/<file>.test.ts`
  - Single package build: `npm run build:web` | `npm run build:backend` | `npm run build:admin`
- Fix only errors caused by your change; do not chase pre-existing failures.

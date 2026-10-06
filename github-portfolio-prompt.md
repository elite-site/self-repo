# PROMPT: GitHub-driven Student Portfolio (projects + skills)

You are working inside my existing student platform (Express + Prisma + TypeScript backend, Vite + React student web app, React admin client, Supabase Postgres, Google Workspace SSO for students). Implement the feature below end to end. Work in small, reviewable steps and do not break any existing behaviour.

## STEP 0 - READ BEFORE YOU WRITE (mandatory)

1. Open `backend/prisma/schema.prisma` and list every existing model, its id type (cuid / uuid / int), naming style (camelCase vs snake_case, `@@map` usage), and how `Student` and `Project` (if present) are defined.
2. Open the existing student profile, edit-profile, projects, and portfolio pages and the routes/services that serve them.
3. **Match the existing conventions exactly.** The table and column names below are a specification of *what to store*. If a model already exists under another name (for example `Project`, `Skill`, `StudentSkill`), extend it instead of creating a duplicate. If something conflicts with the real schema, stop and tell me the difference before inventing names.
4. Report back a short summary of what you found, then continue.

## GOAL

Replace manual entry of projects and skills with data pulled from the student's own GitHub account.

- Students keep signing in only with their college Google account. GitHub is a **connect step**, not a login.
- One GitHub account per student, one student per GitHub account.
- The student can sync **all** their public repos, but must **select a top 5** to showcase.
- **Skills** are computed on the server from the synced repos (languages + dependencies + topics) and appear on the student's pages and portfolio.
- The frontend never decides or submits skills, counts, or verification. It only displays what the backend returns.

## NON-NEGOTIABLE SECURITY RULES

1. Every endpoint requires a valid student session. The `studentId` always comes from the session, **never** from the request body, query, or URL.
2. Every repo operation checks that the repo row belongs to the session student.
3. Skills, language bytes, commit counts, and the verified flag are computed server-side only. Reject any client attempt to send them.
4. GitHub OAuth uses a random `state` (stored server-side, single use, expires in 10 minutes) and PKCE. Request **no scopes** beyond identity (public data only). Do not request `repo`.
5. After the OAuth callback, use the student's token only to read their GitHub id and login, then **discard it. Do not store student tokens.** Everything else is fetched with one server-side credential (GitHub App installation token preferred, or a server PAT), kept in env vars only, never sent to the browser, never logged.
6. Linking is by the logged-in session: the callback attaches the GitHub account to the student who started the flow. Enforce unique `githubUserId`, so one GitHub account cannot be linked to two students. If it is already linked, show a clear error.
7. Public repos only. Never store source code, file contents, or private repo names.
8. Add the new routes to the existing rate limiter and CSRF/CORS setup. Add input validation (zod or the existing validator) on every body.
9. Log sync activity to the existing activity log, without secrets.

## PRODUCTION DATA SAFETY (hard rules, they override everything else in this prompt)

The production database holds real student data. Breaking it is not acceptable.

1. **Never drop, delete, truncate, rename, or retype any existing table, column, index, constraint, or row.** This applies to migrations, seeds, scripts, and application code.
2. **Migrations are additive only:** new tables, new nullable columns, new columns with safe defaults, new indexes. If a change cannot be done additively, stop and ask me.
3. **Forbidden commands against any shared or production database:** `prisma migrate reset`, `prisma db push --force-reset`, `prisma db push --accept-data-loss`, `DROP`, `TRUNCATE`, and `DELETE` without a `WHERE` clause. Review every generated SQL file in `prisma/migrations/*/migration.sql` before it is applied, and fail the task if it contains `DROP`, `TRUNCATE`, `ALTER ... DROP`, or a type change on an existing column.
4. **Do not touch existing rows.** The old manual projects, skills, `githubUrl`, and `technologies` stay exactly as they are (read-only). No backfill, cleanup, or "fix-up" script may modify or delete them. Any one-off data script must be read-only or insert-only, with a dry-run mode that prints what it would do.
5. **Application deletes are limited to rows this feature creates** (`GithubAccount`, `GithubRepo`, `GithubOAuthState`, `GithubSyncLog`, and `StudentSkill` rows with `source = GITHUB`). Always scope them with a `WHERE studentId = <session student>` or an exact id. Never delete from `Student`, `Project`, `Submission`, `AdminUser`, or any other existing table. Prefer soft flags (`removedFromGithub`) over hard deletes where possible.
6. **Test on a copy first.** Run the migration and the seed on a local or staging database restored from a recent backup before production. Take a verified backup right before the production migration, and write down the restore steps in the runbook.
7. **Deploy order:** migrate (additive) first, then deploy code. Old code must keep working against the new schema, and the new code must work with the feature flag off. Rollback means turning the flag off and redeploying the previous build. It never means reverting the schema.
8. **Seeds are idempotent upserts only.** The seed must never remove or overwrite existing data, including the roster import and the admin user.

## DATABASE (Prisma) - additive migration only

Use one new migration. Do not drop, rename, or retype existing columns. All new columns on existing tables are nullable or have defaults. Use the same id type as the existing models (shown below as `Id`).

### 1. `GithubAccount` (new) - 1 student : 1 GitHub account
| column | type | notes |
|---|---|---|
| id | Id | PK |
| studentId | Id | FK -> Student.id, **unique**, onDelete: Cascade |
| githubUserId | BigInt | **unique** |
| login | String | GitHub username |
| avatarUrl | String? | |
| connectedAt | DateTime | default now |
| lastSyncedAt | DateTime? | |
| nextSyncAllowedAt | DateTime? | per-student cooldown |
| syncStatus | enum `IDLE | QUEUED | RUNNING | FAILED` | default IDLE |
| syncError | String? | short, no secrets |
| manualSyncCountToday | Int | default 0 |
| manualSyncDay | DateTime? | for the daily counter reset |

### 2. `GithubRepo` (new) - one row per synced public repo
| column | type | notes |
|---|---|---|
| id | Id | PK |
| studentId | Id | FK -> Student.id, Cascade |
| githubRepoId | BigInt | GitHub's repo id |
| fullName | String | `owner/name` |
| name | String | |
| description | String? | |
| htmlUrl | String | |
| isFork | Boolean | |
| primaryLanguage | String? | |
| topics | String[] | |
| stars | Int | default 0 |
| githubCreatedAt | DateTime? | |
| pushedAt | DateTime? | |
| languages | Json | `{ "TypeScript": 12345, ... }` bytes |
| dependencies | Json | `[{ "ecosystem":"npm","name":"react" }, ...]`, names only |
| commitCount | Int | commits by this student, default 0 |
| firstCommitAt | DateTime? | |
| lastCommitAt | DateTime? | |
| isShowcased | Boolean | default false |
| showcaseRank | Int? | 1..5, null when not showcased |
| etag | String? | for conditional requests |
| syncedAt | DateTime | |
| removedFromGithub | Boolean | default false (repo deleted or made private) |

Constraints: `@@unique([studentId, githubRepoId])`, `@@unique([studentId, showcaseRank])`, check `showcaseRank BETWEEN 1 AND 5`, index on `(studentId, isShowcased)`.
The "max 5 showcased" rule is enforced in the service **inside a transaction**, and also by the unique rank constraint.

### 3. `SkillCatalog` (new, or extend the existing `Skill` table if one exists)
| column | type | notes |
|---|---|---|
| id | Id | PK |
| slug | String | **unique**, e.g. `react` |
| name | String | display name, e.g. `React` |
| category | String? | Language / Framework / Database / Tool / Cloud |

### 4. `SkillSourceMap` (new) - the lookup table that turns GitHub data into skills
| column | type | notes |
|---|---|---|
| id | Id | PK |
| skillId | Id | FK -> SkillCatalog.id |
| sourceType | enum `LANGUAGE | DEPENDENCY | TOPIC` | |
| ecosystem | String? | `npm`, `pip`, `maven`, ... for dependencies |
| sourceKey | String | e.g. `TypeScript`, `react`, `express`, `prisma`, `docker` |

Constraint: `@@unique([sourceType, ecosystem, sourceKey])`. Seed a starter set (about 80 to 150 common entries: JS/TS, Python, Java, C/C++, React, Next, Vue, Angular, Express, Node, Django, Flask, Spring, Prisma, Postgres, MongoDB, MySQL, Tailwind, Docker, etc.) in `prisma/seed` without removing the current seed logic.

### 5. `StudentSkill` (new, or extend the existing one) - **computed output, never written by the client**
| column | type | notes |
|---|---|---|
| id | Id | PK |
| studentId | Id | FK -> Student.id, Cascade |
| skillId | Id | FK -> SkillCatalog.id |
| repoCount | Int | repos giving evidence |
| totalBytes | BigInt | for language skills, else 0 |
| lastEvidenceAt | DateTime? | |
| source | enum `GITHUB | LEGACY` | `LEGACY` = old manual skills kept read-only |

Constraint: `@@unique([studentId, skillId])`. Recomputed after every sync from **all** synced, non-removed repos (a single flag `SKILLS_FROM_SHOWCASE_ONLY=false` can restrict it to the showcased 5).

### 6. `GithubSyncLog` (new)
| column | type | notes |
|---|---|---|
| id | Id | PK |
| studentId | Id | FK, Cascade |
| trigger | enum `CONNECT | MANUAL | SCHEDULED` | |
| status | enum `SUCCESS | PARTIAL | FAILED | SKIPPED_RATE_LIMIT` | |
| reposSeen | Int | |
| apiCalls | Int | |
| rateRemaining | Int? | from GitHub headers |
| startedAt / finishedAt | DateTime | |
| error | String? | |

### 7. `GithubOAuthState` (new, short-lived)
`id`, `studentId` (FK), `state` (unique), `codeVerifier`, `expiresAt`, `usedAt?`. Purge expired rows in the scheduler.

### 8. Existing tables - minimal additive changes
- `Student`: add `githubReminderSnoozedUntil DateTime?` (home banner snooze). Nothing else changes.
- Existing `Project` (if it exists): add `source enum MANUAL | GITHUB` default `MANUAL`, and nullable `githubRepoId Id?` FK -> `GithubRepo.id`. Old manual rows stay untouched and read-only. The portfolio shows the showcased GitHub repos first, and legacy projects only if the student has no GitHub data yet.
- Keep the old `githubUrl` and `technologies` columns. Stop writing them. Do not drop them in this release.

## BACKEND API (all under the existing student auth middleware)

| method + path | purpose |
|---|---|
| `GET /api/student/github` | connection status, last sync, cooldown, repo list, showcased 5, computed skills |
| `POST /api/student/github/connect` | creates OAuth state + PKCE, returns the GitHub authorize URL |
| `GET /api/student/github/callback` | validates state, reads GitHub id/login only, links the account, discards the token, enqueues the first sync |
| `POST /api/student/github/sync` | manual sync, enforces the cooldown and daily cap, returns 202 + status |
| `PUT /api/student/github/showcase` | body: `{ repoIds: Id[] }` ordered, 1 to 5 entries, validated server-side |
| `DELETE /api/student/github` | disconnect: deletes GithubAccount, GithubRepo, and GITHUB-source StudentSkill rows, keeps LEGACY |
| `POST /api/student/github/reminder/snooze` | sets `githubReminderSnoozedUntil` (7 days) |
| `GET /api/student/portfolio` | showcased projects + skills for the portfolio page (server-built) |
| `GET /api/public/portfolio/:slugOrId` | if the portfolio is public today, reuse the existing public route and feed it the same server-built data |

All responses return only the fields the UI needs. No tokens, no internal ids of other students.

## SYNC ENGINE AND RATE-LIMIT PROTECTION

1. **One server-side credential** for all GitHub data calls (5,000 requests/hour for a PAT or app token). Students' own tokens are never used for data.
2. **Prefer GraphQL** to fetch a student's public repos in one request (name, description, topics, stars, languages with sizes, pushedAt, fork flag, and `history` commit counts filtered to the student). That is roughly 1 call per 50 to 100 repos instead of 3 to 4 calls per repo.
3. **Dependencies are the expensive part.** Fetch the SBOM / dependency data only for (a) the 5 showcased repos and (b) the 15 most recently pushed other repos, and only when `pushedAt` changed since the last sync. Pin the GitHub API version header you test against.
4. **Conditional requests:** store `etag`, send `If-None-Match`, and treat 304 as "no change". Verify behaviour with the server token before relying on it.
5. **Global budget guard:** read `x-ratelimit-remaining` and `x-ratelimit-reset` on every response. Keep a reserve (for example 500). If remaining is below the reserve, pause the queue until reset and mark queued jobs `SKIPPED_RATE_LIMIT` or retry later. Never loop.
6. **Queue, do not run in the request.** `/sync` and the callback only enqueue a job and return 202. Use the scheduler that already exists in the backend (or a simple DB-backed queue) with concurrency of 2 to 3 jobs.
7. **Per-student limits:** manual sync cooldown 15 minutes, max 5 manual syncs per day. Return a friendly 429 with `nextSyncAllowedAt`.
8. **Daily scheduled sync**, staggered across the day (spread by hash of studentId), only for students whose account is connected and whose last sync is older than 24 hours. Size check: students x calls must stay well below 5,000/hour.
9. **Cache and degrade:** the frontend and portfolio always read from our database. If GitHub fails or is rate-limited, serve the last snapshot with its `lastSyncedAt` and a "last checked" note. A failed sync never breaks a page.
10. **Idempotent upserts** on `(studentId, githubRepoId)`. Repos that disappear from GitHub get `removedFromGithub = true` (and are dropped from showcase, with the rank slot freed), not hard-deleted.
11. **Skill recomputation** after each sync: join repo languages and dependencies through `SkillSourceMap`, aggregate into `StudentSkill`, delete GITHUB-source rows that no longer have evidence. Unmapped dependency names are counted in the sync log (not shown to students) so I can grow the mapping table.

## FRONTEND (student web app)

1. **Home screen reminder:** if the student has no `GithubAccount` and `githubReminderSnoozedUntil` is empty or past, show a dismissible banner: "Connect your GitHub to build your portfolio automatically." Buttons: `Connect GitHub` (goes to the new page) and `Remind me later` (calls the snooze endpoint). The decision is made by the backend `GET /api/student/github` payload, not by local state or localStorage.
2. **Edit Profile page:** remove the skills editor and any manual skills input. Remove the manual project form. Leave a one-line note linking to the GitHub page. Keep every other profile field working.
3. **New page "GitHub" (route e.g. `/github`, add to the student nav):**
   - Not connected: explanation + `Connect GitHub` button.
   - Connected: avatar, `@login`, last synced time, **Sync** button (disabled during cooldown with a visible "available at HH:MM", spinner while `RUNNING`, error text if `FAILED`), and a `Disconnect` option with confirmation.
   - Repo list (all synced public repos): search, sort by recently pushed, language chips, fork badge, commit count. Checkbox to select showcase repos with a counter "3/5 selected"; disable more than 5; drag to reorder rank; `Save showcase` calls the PUT endpoint.
   - "Your skills" section: computed skills as chips with evidence (for example "React - 3 repos"). Read-only. Do not offer any way to add or edit skills.
4. **Portfolio page / public profile:** show the top 5 showcased projects (name, description, languages bar, topics, commit count, link, last synced) and the computed skills list, all from `GET /api/student/portfolio`. Show a small "Synced from GitHub" label with the last synced date.
5. Handle loading, empty, error, and cooldown states. No GitHub URL is ever typed by the student. No skill is ever sent from the browser.

## ADMIN (small, optional, behind a flag)

In the admin review view, show per student: GitHub connected yes/no, last synced, showcased repos, computed skills. Read-only hints only (fork only, fewer than 3 commits, empty repo). Admin decisions stay manual.

## ENV VARS (names only, values never committed)
`GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI`, `GITHUB_API_TOKEN` (or GitHub App id, installation id, private key), `GITHUB_API_VERSION`, `GITHUB_RATE_RESERVE`, `GITHUB_SYNC_COOLDOWN_MIN`, `GITHUB_SYNC_DAILY_CAP`, `FEATURE_GITHUB_PORTFOLIO` (boolean flag). Update `.env.example` with names only and the secret inventory in the README/runbooks.

## ROLLOUT
1. Ship migration + seed + backend behind `FEATURE_GITHUB_PORTFOLIO=false`.
2. Enable for a few test students. Verify sync, showcase, skills, cooldown, disconnect.
3. Enable for everyone and show the home banner.
4. Only after most students have connected, hide the old manual forms (already removed from Edit Profile in step 2 of the frontend work; keep old data read-only in the database). Dropping legacy columns is a separate later release.

## TESTS (Vitest + supertest on the backend, Playwright smoke on the web)
- Unauthenticated calls to every new route return 401.
- A student cannot read, sync, or showcase another student's repos (forged `repoId` returns 404).
- Showcase: 6 repos rejected; duplicate ranks rejected; concurrent saves cannot exceed 5.
- OAuth: bad or reused state rejected; a GitHub id already linked to another student rejected; token not persisted.
- Sync: respects cooldown and daily cap; handles 304; handles a rate-limit response by pausing; GitHub failure keeps the last snapshot; removed repos flagged.
- Skills: computed from mapping; client-sent skills ignored; disconnect removes GITHUB skills but keeps LEGACY.
- Existing SSO, admin login, and submission tests still pass.

## ACCEPTANCE CRITERIA
- A student signs in with Google, connects GitHub once, syncs, selects a top 5, and sees projects and skills on the portfolio, all without typing a project or skill.
- No skill or verification value is accepted from the client.
- No student token is stored; no secret reaches the browser.
- 400 students syncing in one day stays far below the GitHub limit, and a burst of "Sync" clicks cannot exhaust it.
- Existing features keep working with the flag off.
- The migration SQL contains no `DROP`, `TRUNCATE`, or column type changes, and no existing row is modified or deleted by the migration, seed, or sync code.

## DELIVERABLES
Migration + seed, backend services/routes/scheduler job, frontend changes, tests, updated `.env.example`, and a short runbook `docs/runbooks/github-sync.md` (env vars, how to add skill mappings, how to rotate the GitHub credential, what to do when rate-limited). Start with STEP 0 and report back before writing code.

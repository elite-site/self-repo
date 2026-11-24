# Operations

This page covers the runtime, scheduled work, CI gates, and delivery rules. Deployment-platform examples are marked as guidance where the repository does not implement them.

## Local and build commands

Commands below are defined in root `package.json` or `backend/package.json`.

| Task | Command |
|---|---|
| Full local dev launcher | `npm run dev` |
| Individual dev servers | `npm run dev:backend`, `npm run dev:web`, `npm run dev:admin` |
| Build all packages | `npm run build` |
| Build one package | `npm run build:backend`, `npm run build:web`, `npm run build:admin` |
| Backend all-bundle build | `npm run build:all` (in `backend/`) |
| Backend render build | `npm run render:build` (in `backend/`) |
| Tests | `npm test`; scoped: `npm run test:backend`, `npm run test:web`, `npm run test:admin` |
| Migration safety gate | `node tools/check-migrations.mjs origin/main` |

`backend/package.json` also defines DB/human-maintenance scripts (`prisma:migrate`, `migrate:deploy`, `prisma:push`, `prisma:seed`, `roster:import`, `db:setup`, `get-token`, `cleanup:internal-event`, `cleanup:spring-boot`). These are not part of normal CI and must not be run against a shared database by an automated agent.

`backend/scripts/` also contains documented one-off helpers: `verify-drive-folder.ts`, `transfer-drive-folder.ts`, `clear-copy-protection.ts`, and `verify-skills-seed.ts`. Their purposes are recorded in `FILE_GUIDE.md`.

## Health and readiness

| Endpoint | Behavior |
|---|---|
| `GET /health` | Process liveness: `{ status: "ok", timestamp }`. |
| `GET /ready` | Probes DB and Google Drive, caches the result for 30 seconds, returns 200 when both are `ok`, otherwise 503 with component statuses. |

`GET /ready` is the platform health-check target. Smokes check `/health`, require `"status":"ok"` from `/ready`, and then call three public endpoints and the web shell.

## Scheduled work

In-process jobs start only when `NODE_ENV !== 'test'` and are idempotent through `started`/`isRunning` guards.

| Schedule | Job | Gate |
|---|---|---|
| Every minute (`* * * * *`) | `announcementScheduler.ts` publishes due scheduled announcements. | Test environment only. |
| Every 30 min (`*/30 * * * *`) | `githubSyncScheduler.ts` calls `syncScheduledBatch(10)`. | Test environment only. |
| Every 30 min | `codechefSyncScheduler.ts` backfills unlinked profiles and syncs a batch. | `FEATURE_CODECHEF`. |
| Hourly (`0 * * * *`) | `quizReminder.job.ts` sends quiz reminders. | `FEATURE_LEARNINGHUB`. |
| Daily `30 3 * * *` Asia/Kolkata | `retentionJob.ts` deletes aged notifications, activity logs, GitHub sync logs, and email logs. | Test environment only; overrides via portal settings. |

Startup-only toggles: `AUTO_MIGRATE_PENDING` runs the pending-approval backlog migration; `SYNC_DRIVE_PERMISSIONS` sweeps Drive files back to viewer access. Both default false.

GitHub Actions:

| Workflow | Trigger | Action |
|---|---|---|
| `.github/workflows/ci.yml` | PRs and pushes to `main` | Scoped backend/web/admin/design/migrations/security jobs. Backend uses a real Postgres service, applies migrations, checks drift, and runs typecheck, lint and tests. |
| `.github/workflows/smoke.yml` | Every 30 min, manual dispatch, or `repository_dispatch` type `deployed` | Checks `/health`, `/ready`, `/api/branches`, `/api/public/events`, `/api/public/videos`, and the web root shell. Requires `API_URL` and `WEB_URL`. |
| `.github/workflows/video-cache-evict.yml` | Every 15 min or manual dispatch | POSTs to `/api/internal/video-cache/evict` using `INTERNAL_SYNC_SECRET`. Requires `BACKEND_URL` or `API_URL`. |

**`ci-ok` is the required CI check.** It is the aggregate job that fails if any scoped job failed or was cancelled.

## Delivery rules

### Migrations

Migrations run during the backend build before new code is live, so old code temporarily runs on the new schema.

1. **Expand (release N):** additive only — nullable/defaulted columns, tables, indexes. Code still works when the new field is empty.
2. **Switch (release N+1):** code reads/writes the new field and backfills if needed.
3. **Contract (release N+2):** only now drop or rename the old field. Take a manual backup and record the time in the PR.

Never edit an already-merged migration; add a new one. CI blocks edits/deletions, `CONCURRENTLY`, and destructive or locking statements without `-- migration-safety: reviewed (<reason>)`. A failed migration blocks later deploys: fix forward with a new migration, not by hand-editing the ledger.

### API compatibility

Backend deploys first; web deploys second. API changes are additive within a release: add fields rather than rename or remove them, and clients must ignore unknown fields. A field or endpoint removal follows the same N / N+1 / N+2 pattern as a schema change.

### Feature flags

New user-facing features merge dark: default OFF, OFF path is the old behavior, and anything that changes data is gated server-side. `FEATURE_GITHUB_PORTFOLIO` and `FEATURE_VIDEO_CACHE` currently default OFF; `FEATURE_LEARNINGHUB` and `FEATURE_CODECHEF` currently default ON for compatibility, verified in `backend/src/config/env.ts`. Delete a flag within two sprints of full rollout.

### Rollback and hotfix

These are platform actions. The workflows reference Render and Netlify but do not configure those hosts, so verify the exact dashboard steps before relying on them.

| Problem | Action |
|---|---|
| Bad feature | Switch the flag OFF. |
| Bad backend deploy | Roll back to the previous Render deploy. |
| Bad web deploy | Publish the previous Netlify deploy. |
| Bad migration | New corrective migration (forward fix); restore a backup only for data loss. |

A hotfix branches from `main`, makes the smallest change, uses the same PR and CI path, and watches the smoke run. Do not skip CI.

### Staging and hosting — guidance only

Staging was proposed as a second Render service, a separate Supabase project, and a Netlify branch deploy, with distinct secrets, a distinct Drive folder, and fake data only. No such staging configuration exists in the repository, so treat this as a proposal, not existing infrastructure. The same applies to adding an external error tracker: structured logging exists; a third-party tracker is not configured in `backend/package.json`.

## Runbooks and decisions

- [GitHub portfolio sync](runbooks/github-sync.md): environment, skill mapping, credential rotation, rate-limit playbook, sync procedures.
- [Video cache](runbooks/video-cache.md): R2 provisioning, secrets, eviction workflow, operational tasks and troubleshooting.
- [ADR 0002: layered modular architecture](decisions/0002-layered-modular-architecture.md)
- [ADR 0004: video cache and leases](decisions/0004-video-cache.md)

For an incident, record the `requestId` from the client or error response, inspect the structured backend log, then check `/ready` component statuses. No test, build, migration, seed, roster import, or database command was run while writing this document.

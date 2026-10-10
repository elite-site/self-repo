# Runbook: GitHub Portfolio Sync Integration

This runbook covers configuration, skill mapping architecture, credential rotation, rate limit handling, and operational troubleshooting for the GitHub-driven student portfolio integration.

---

## 1. Environment Variables

All GitHub portfolio integration settings are managed via backend environment variables in `backend/src/config/env.ts` (and documented in `backend/.env.example`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `FEATURE_GITHUB_PORTFOLIO` | Optional | `false` | Master feature flag. Enables GitHub connect UI, endpoints, and scheduled sync jobs. |
| `GITHUB_OAUTH_CLIENT_ID` | Required* | `""` | GitHub OAuth App Client ID used for initiating student authentication via PKCE. |
| `GITHUB_OAUTH_CLIENT_SECRET` | Required* | `""` | GitHub OAuth App Client Secret used during server-side authorization code exchange. |
| `GITHUB_OAUTH_REDIRECT_URI` | Required* | `http://localhost:5001/api/student/github/callback` | Callback URL registered in the GitHub OAuth App. Must match the deployment host. |
| `GITHUB_API_TOKEN` | Recommended | `""` | Server-level Personal Access Token (PAT) or GitHub App token. Grants 5,000 req/hr API limit. If unset, requests run unauthenticated (60 req/hr). |
| `GITHUB_API_VERSION` | Optional | `2022-11-28` | GitHub REST API version header (`X-GitHub-Api-Version`). |
| `GITHUB_RATE_RESERVE` | Optional | `500` | Minimum `x-ratelimit-remaining` buffer. Sync halts if remaining API credits drop to or below this threshold. |
| `GITHUB_SYNC_COOLDOWN_MIN` | Optional | `15` | Minimum cooldown in minutes between manual student sync requests (`nextSyncAllowedAt`). |
| `GITHUB_SYNC_DAILY_CAP` | Optional | `5` | Maximum number of manual sync requests allowed per student per calendar day (`manualSyncCountToday`). |

*\* Required when `FEATURE_GITHUB_PORTFOLIO=true`.*

### Security & Privacy Rules
- **No student tokens stored:** Student access tokens obtained during OAuth are used strictly to retrieve GitHub username/ID and are discarded immediately.
- **Server token isolation:** `GITHUB_API_TOKEN` is used for all repository metadata queries. It is never exposed to the client or logged.
- **Public data only:** Scopes requested during OAuth are restricted to public data (no `repo` scope).

---

## 2. Skill Mapping Architecture

The sync engine automatically derives student technical skills from their public GitHub repositories using the `SkillSourceMap` lookup table.

```
                  ┌──────────────────────┐
                  │   Synced GithubRepo  │
                  └──────────┬───────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
Languages (bytes)       Dependencies (names)      Topics (tags)
  e.g. "TypeScript"       e.g. "npm:react"          e.g. "docker"
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             ▼
                ┌─────────────────────────┐
                │     SkillSourceMap      │
                │ (sourceType, sourceKey) │
                └────────────┬────────────┘
                             ▼
                    ┌─────────────────┐
                    │      Skill      │
                    └────────┬────────┘
                             ▼
                ┌─────────────────────────┐
                │   GithubStudentSkill    │
                │ (repoCount, totalBytes) │
                └─────────────────────────┘
```

### Relational Models
- `Skill`: Canonical skill catalog record (e.g., `name = "React"`, `category = "Frameworks"`).
- `SkillSourceMap`: Lookup table linking incoming GitHub metadata to a canonical `Skill`:
  - `sourceType`: Enum (`LANGUAGE`, `DEPENDENCY`, `TOPIC`).
  - `ecosystem`: Optional package ecosystem (e.g., `npm`, `pip`, `maven`, `cargo`, `go`).
  - `sourceKey`: Normalized lowercase identifier (e.g., `typescript`, `react`, `django`, `docker`).
  - Constraint: `@@unique([sourceType, ecosystem, sourceKey])`.
- `GithubStudentSkill`: Computed aggregate per student and skill (`repoCount`, `totalBytes`, `lastEvidenceAt`).

### Extraction & Recomputation Workflow
1. **Language Bytes**: Retrieved from `/repos/{owner}/{repo}/languages`. Aggregated into `totalBytes` for matching `LANGUAGE` mappings. Falls back to `primaryLanguage` if bytes are unavailable.
2. **Dependencies**: Parsed from repository manifests (e.g., `package.json`, `requirements.txt`). Matched against `DEPENDENCY` mappings either as bare package name or `${ecosystem}:${packageName}`.
3. **Topics**: Read from repository topics array and matched against `TOPIC` mappings.
4. **Idempotent Computation**: Executed in `recomputeStudentSkills(studentId)`:
   - Only non-removed repos (`removedFromGithub = false`) provide evidence.
   - Orphaned skills (skills with no remaining evidence repos) are deleted from `GithubStudentSkill`.
   - Legacy manual skills (`StudentSkill`) remain intact and are never overwritten or deleted by GitHub sync.

### Adding New Skill Mappings
To add new mappings to the catalog:
1. Edit `backend/prisma/seedSkillsData.ts` and add the mapping under the relevant skill:
   ```typescript
   {
     name: 'FastAPI',
     category: 'Frameworks',
     mappings: [
       { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'fastapi' },
       { sourceType: SkillSourceType.TOPIC, sourceKey: 'fastapi' },
     ],
   }
   ```
2. In production or development, upsert directly via Prisma or run the additive seed script:
   ```bash
   cd backend && npx ts-node -e "
     import { prisma } from './src/lib/prisma';
     async function add() {
       const skill = await prisma.skill.upsert({
         where: { name: 'FastAPI' },
         update: {},
         create: { name: 'FastAPI', category: 'Frameworks' }
       });
       await prisma.skillSourceMap.upsert({
         where: { sourceType_ecosystem_sourceKey: { sourceType: 'DEPENDENCY', ecosystem: 'pip', sourceKey: 'fastapi' } },
         update: {},
         create: { skillId: skill.id, sourceType: 'DEPENDENCY', ecosystem: 'pip', sourceKey: 'fastapi' }
       });
     }
     add().then(() => prisma.\$disconnect());
   "
   ```

---

## 3. Credential Rotation Procedure

### 3.1 GitHub OAuth App Client Secret
GitHub allows maintaining two active client secrets simultaneously, enabling zero-downtime rotation.

1. Navigate to **GitHub** -> **Settings** -> **Developer settings** -> **OAuth Apps** -> Select Portal App.
2. Under **Client secrets**, click **Generate a new client secret**.
3. Copy the newly generated secret value.
4. Update `GITHUB_OAUTH_CLIENT_SECRET` in host configuration (e.g., Render Dashboard -> Environment Variables).
5. Trigger deploy / restart service.
6. Test OAuth connection on staging or test student account.
7. Return to GitHub OAuth App settings and click **Delete** on the old client secret.

### 3.2 GitHub API Token (`GITHUB_API_TOKEN`)
1. Create a Personal Access Token (classic or fine-grained):
   - **Scopes needed:** Public repositories only (`read:user` or public read; no private repo access).
   - Set an expiration window (e.g., 90 or 180 days) and calendar reminder.
2. Update `GITHUB_API_TOKEN` in Render Environment settings.
3. Restart backend service.
4. Verify by checking rate limit headers:
   ```bash
   curl -H "Authorization: Bearer <NEW_TOKEN>" https://api.github.com/rate_limit
   ```
5. Revoke previous PAT in GitHub Developer Settings.

---

## 4. Rate Limit Playbook

### Rate Budget Overview
- **Authenticated rate limit:** 5,000 requests/hour per `GITHUB_API_TOKEN`.
- **Safety Reserve:** Set by `GITHUB_RATE_RESERVE` (default: 500 requests).
- **Conditional Requests (ETags):** Language endpoints send `If-None-Match` with cached ETag. `304 Not Modified` responses consume minimal rate budget.
- **Dependency Caching:** Dependency manifests are fetched only for the showcased repos (up to 30, auto-selected on first sync) plus the 15 most recently pushed repos, and only when `pushedAt` changes.

### Trigger Condition: Reserve Threshold Reached
When `x-ratelimit-remaining` <= `GITHUB_RATE_RESERVE` (500):
1. `GithubApiService` throws `GithubRateLimitError`.
2. The running sync job transitions to `SKIPPED_RATE_LIMIT` and logs the event to `GithubSyncLog`.
3. Account `syncStatus` is marked `FAILED` with an informative error message.
4. Subsequent queue jobs are held until `x-ratelimit-reset` expires.
5. Student UI continues serving cached data from `GithubRepo` and `GithubStudentSkill` with the last successful sync timestamp.

### Secondary Rate Limits & Burst Protection
GitHub enforces secondary rate limits on concurrent requests:
- `GithubSyncService` caps active background sync jobs at `maxConcurrency = 2`.
- Requests include standard `User-Agent` and `X-GitHub-Api-Version` headers.
- Student manual syncs enforce a 15-minute cooldown (`GITHUB_SYNC_COOLDOWN_MIN`) and a 5-sync daily cap (`GITHUB_SYNC_DAILY_CAP`).

### Monitoring & Recovery
Check recent sync logs and rate limit levels directly in Postgres:
```sql
-- Check rate remaining from recent syncs
SELECT "startedAt", "status", "apiCalls", "rateRemaining", "error"
FROM "GithubSyncLog"
ORDER BY "startedAt" DESC
LIMIT 20;

-- Check students stuck in RUNNING or QUEUED state
SELECT "studentId", "login", "syncStatus", "lastSyncedAt", "syncError"
FROM "GithubAccount"
WHERE "syncStatus" IN ('RUNNING', 'QUEUED');
```

If jobs are stuck due to an unhandled crash:
```sql
UPDATE "GithubAccount"
SET "syncStatus" = 'IDLE', "syncError" = 'Reset after rate limit recovery'
WHERE "syncStatus" IN ('RUNNING', 'QUEUED');
```

---

## 5. Operational Procedures

### 5.1 Manual Sync Debugging
When a student reports sync failure or missing repos:

1. **Verify Connection**:
   ```sql
   SELECT "studentId", "login", "syncStatus", "syncError", "lastSyncedAt", "nextSyncAllowedAt"
   FROM "GithubAccount"
   WHERE "studentId" = '<STUDENT_ID>';
   ```
2. **Review Detailed Error**:
   ```sql
   SELECT * FROM "GithubSyncLog"
   WHERE "studentId" = '<STUDENT_ID>'
   ORDER BY "startedAt" DESC
   LIMIT 5;
   ```
3. **Common Failure Modes**:
   - `GitHub user not found`: Student changed their GitHub username after connecting. Solution: Disconnect and reconnect.
   - `Sync cooldown is active`: Student clicked sync within 15 minutes of previous sync. Wait until `nextSyncAllowedAt`.
   - `Daily sync limit reached`: Student reached 5 manual syncs for the day. Counter resets at midnight UTC.
   - `Repository missing`: Repositories must be public. Private repositories are never imported.
4. **Trigger Manual Resync via Code**:
   ```typescript
   import { githubSyncService } from './src/services/github.sync.service';
   import { GithubSyncTrigger } from '@prisma/client';

   await githubSyncService.executeSync('<STUDENT_ID>', GithubSyncTrigger.MANUAL);
   ```

### 5.2 Unlinking / Disconnecting an Account
Students can disconnect directly from `/github` via the **Disconnect** button.

If an administrator needs to manually unlink or reset a student's GitHub integration (e.g., student linked wrong GitHub username):

```sql
BEGIN;

-- 1. Detach portfolio project linkages to github repos
UPDATE "Project"
SET "githubRepoId" = NULL
WHERE "studentId" = '<STUDENT_ID>' AND "githubRepoId" IS NOT NULL;

-- 2. Remove computed GitHub skills (leaves legacy manual StudentSkill rows intact)
DELETE FROM "GithubStudentSkill" WHERE "studentId" = '<STUDENT_ID>';

-- 3. Remove synced repositories
DELETE FROM "GithubRepo" WHERE "studentId" = '<STUDENT_ID>';

-- 4. Remove active OAuth state records
DELETE FROM "GithubOAuthState" WHERE "studentId" = '<STUDENT_ID>';

### 5.3 External Cron & Sleeping Instance Trigger (`/api/internal/github-sync-tick`)

When running on a host that sleeps when idle (e.g., Render Free tier), the in-process cron scheduler does not run while the instance is sleeping.

To trigger scheduled sync cycles reliably, an external cron (GitHub Actions workflow or cron job service) calls the internal tick endpoint:

- **Endpoint**: `POST /api/internal/github-sync-tick`
- **Headers**:
  - `x-internal-secret`: Value matching `INTERNAL_SYNC_SECRET` configured in environment variables.
- **Behavior**:
  - Calls `githubSyncScheduler.tick()`.
  - Scans for connected accounts not synced in the last 24 hours.
  - Queues background syncs with small jitter to avoid bursts.
- **Example cURL**:
  ```bash
  curl -X POST https://your-backend.onrender.com/api/internal/github-sync-tick \
    -H "x-internal-secret: $INTERNAL_SYNC_SECRET"
  ```
- **Recommended Schedule**: Every 10 to 15 minutes. This both wakes/keeps warm the backend instance and executes scheduled GitHub portfolio synchronizations.

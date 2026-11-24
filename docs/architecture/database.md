# Database architecture

Authoritative source: `backend/prisma/schema.prisma`. Migrations live in `backend/prisma/migrations/` and are immutable once merged.

## Connections

| Setting | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Runtime application | Pooled connection string; consumed by the single Prisma client in `backend/src/infrastructure/prisma.ts`. |
| `DIRECT_URL` | Prisma migrations and CLI scripts | Falls back to `DATABASE_URL` when unset. |
| `DB_CONNECTION_LIMIT` | Prisma client | Default `5`. |
| `SLOW_QUERY_THRESHOLD_MS` | Prisma timing logs | Default `500`; legacy alias `PRISMA_SLOW_QUERY_THRESHOLD_MS`. |

Prisma uses `previewFeatures = ["relationJoins"]`. `server.ts` serializes `BigInt` as a decimal string in JSON responses so cache byte counts remain usable by clients.

## Schema domains

The schema has 57 models. Groups by responsibility:

| Domain | Representative models |
|---|---|
| Core portal | `Event`, `Submission`, `AdminUser`, `Student`, `StudentProfile`, `Skill`, `StudentSkill`, `EmailLog`, `ActivityLog`, `DriveFolderCache` |
| Student portfolio | `Project`, `Achievement`, `AchievementCategory`, `Certificate`, `IntroVideo`, `Resume`, `ChangeRequest` |
| Events and participation | `RegistrationFormField`, `EventRegistration`, `RegistrationAnswer`, `Team`, `TeamMember`, `TeamInvitation`, `VotingCampaign`, `VotingCandidate`, `Vote` |
| Communication and RBAC | `Notification`, `Announcement`, `EmailTemplate`, `EmailAutomation`, `EmailAutomationRun`, `Role`, `RolePermission`, `RoleAssignment`, `PortalSettings` |
| Integrations | `GithubAccount`, `GithubRepo`, `SkillSourceMap`, `GithubStudentSkill`, `GithubSyncLog`, `GithubOAuthState`, `CodeChefAccount`, `CodeChefProfileData`, `CodeChefSyncLog` |
| LearningHub | `Course`, `Lesson`, `CourseTarget`, `Enrollment`, `LessonProgress`, `Quiz`, `QuizQuestion`, `QuizOption`, `QuizAttempt`, `Resource` |
| Video cache | `VideoCache`, `VideoLease` |

Status and lifecycle values are enums (`EventStatus`, `ContentStatus`, `RegistrationStatus`, `VotingCampaignStatus`, `GithubSyncStatus`, `CodeChefStatus`, `VideoCacheStatus`, and others). Public visibility is represented by explicit fields such as `isPublic` and `status`, and is enforced in repository queries.

## Query conventions

- All Prisma access is inside repository files. Controllers and services do not call `prisma.*`.
- Repository queries use explicit `select` projections, especially for wide tables and media rows. Binary content and raw storage identifiers are avoided in list responses wherever the code already does so.
- Uniqueness and integrity live in the schema. Examples include `@@unique([eventId, rollNo, year, branch, section])` on `Submission`, `@@unique([profileId, skillId])` on `StudentSkill`, and the unique drive-file constraint used by video-cache claim rotation.
- Hot paths have indexes for status, dates, roll number, event, GitHub/CodeChef sync state, course enrollment, and video-cache state. Add new indexes in a new migration only when a real query needs them.
- Multi-step writes belong in `prisma.$transaction`. The video-cache claim/eviction flow is the clearest current example.

## Retention

`backend/src/modules/admin/services/retention.service.ts` defines the cleanup policy used by the daily job:

| Data | Default retention |
|---|---|
| Read notifications | 60 days (`retention.notifications.readDays`) |
| All notifications | 180 days (`retention.notifications.allDays`) |
| Activity logs | 90 days (`retention.activityLog.days`) |
| GitHub sync logs | 60 days (`retention.githubSyncLog.days`) |
| Email logs | 60 days (`retention.emailLog.days`) |

Defaults may be overridden by portal settings. Cleanup runs in batches of 1000 with a 50 ms pause, enforces a 14-day minimum, and runs daily at `30 3 * * *` in `Asia/Kolkata` via `backend/src/jobs/retentionJob.ts`.

## Migration rules

Migrations run during the backend build (`prebuild` calls `backend/scripts/migrate-if-configured.js`), so for a short time old code runs against the new schema. Use the expand/switch/contract sequence:

1. **Expand (release N):** additive only — nullable/defaulted columns, new tables, new indexes. Code must still work when the new column is empty.
2. **Switch (release N+1):** code starts reading and writing the new field; backfill if needed.
3. **Contract (release N+2):** only now drop or rename the old field. Take a manual backup and record the time in the PR.

CI enforces migration safety through `tools/check-migrations.mjs`: merged migrations may not be edited or deleted; `CONCURRENTLY` is forbidden inside Prisma's transaction; destructive or locking statements require `-- migration-safety: reviewed (<reason>)` in the same file. Fix a failed migration forward with a new migration; never hand-edit the applied ledger. See [operations](../operations.md).

## Review items left in place

- `AchievementCategory`, `requiresProof`, and `requiresReview` have no application-code consumers. Removing them requires a human-owned migration, so no schema change was made here.
- `backend/prisma/migration-diff.sql` is a generated artifact referenced by `FILE_GUIDE.md`; deletion needs a documentation decision.
- No Prisma command, migration application, seed, or roster import was run while writing this document.

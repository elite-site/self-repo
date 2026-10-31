# CodeChef Wiring Requests Log

This log is used by parallel agents (Web, Admin, Backend) to communicate system wiring, routes mounting, navigation, schema, and dependency requests to the **CONNECTIONS** agent.

---

## Log Entries

### Entry 1 (Foundation / Orchestrator)
- **Status**: Completed
- **Target**: `backend/src/config/env.ts`, `render.yaml`
- **Request**: Add `FEATURE_CODECHEF`, `CODECHEF_STATS_BASE_URL`, `CODECHEF_SYNC_COOLDOWN_MIN`, `CODECHEF_SYNC_DAILY_CAP`.
- **Action Taken**: Added to `env.ts` and `render.yaml`. Default `FEATURE_CODECHEF: false`.

### Entry 2 (Foundation / Orchestrator)
- **Status**: Completed
- **Target**: `backend/prisma/schema.prisma`
- **Request**: Add `codechefAccount` relation to `Student`, create `CodeChefStatus`, `CodeChefSyncTrigger`, `CodeChefSyncLogStatus` enums, and add models `CodeChefAccount`, `CodeChefProfileData`, `CodeChefSyncLog`.
- **Action Taken**: Added models and enums to `schema.prisma`. Generated additive migration `20261031140000_add_codechef/migration.sql` (not applied to database). Run `npx prisma generate`.

### Entry 3 (Pending Agent 4 - Connections)
- **Status**: Completed
- **Target**: `backend/src/server.ts`
- **Request**: Mount `/api/student/codechef` and `/admin/api/codechef` behind `codechefFlagGuard` (returns 404 when `FEATURE_CODECHEF !== true`).
- **Request**: Mount internal tick endpoint `/api/internal/codechef-sync-tick` protected by `INTERNAL_SYNC_SECRET`.

### Entry 4 (Pending Agent 4 - Connections)
- **Status**: Completed
- **Target**: `web/src/shared/layout/Sidebar.tsx` & `web/src/app/routes.tsx`
- **Request**: Add CodeChef sidebar navigation item and lazy route `/codechef` in student web app. Guard with `FEATURE_CODECHEF`.

### Entry 5 (Pending Agent 4 - Connections)
- **Status**: Completed
- **Target**: `admin-client/src/shared/layout/Sidebar.tsx` & `admin-client/src/app/routes.tsx`
- **Request**: Add CodeChef sidebar navigation item and lazy route `/codechef` in admin portal. Guard with `FEATURE_CODECHEF`.

### Entry 6 (Pending Agent 4 - Connections)
- **Status**: Completed
- **Target**: `backend/src/modules/students/` (Dashboard)
- **Request**: Select `codechefAccount` in `findStudentDashboardDetails` and return summary in `getStudentDashboardData` (0 extra HTTP queries).

### Entry 7 (Pending Agent 4 - Connections)
- **Status**: Completed
- **Target**: `backend/src/modules/public/` (Public Profile)
- **Request**: Select `codechefAccount` in `findPublicStudentByRollNo` and return competitive programming stats in `public.students.controller.ts` only when `verified === true` and `showPublic === true`.

# FIX_LOG.md — Baseline and Progress Log

## Baseline Metrics (Recorded at start)

- `git rev-parse origin/main`: `6b8e04d352a3771ce2a953fe6aded91864ed6f1d`
- Orchestrator branch: `fix/all-problems`

### 1. Test Suite & Compiler Baselines
- **Backend `prisma generate`**: Succeeded (Prisma v5.22.0)
- **Backend TypeScript (`tsc --noEmit`)**: Succeeded (0 errors)
- **Backend Vitest (`npx vitest run`)**:
  - Test files: 47 passed (47 total)
  - Tests: 472 passed (472 total)
  - Failed: 0
  - Per-file failures: None
- **Web TypeScript (`tsc --noEmit`)**: Succeeded (0 errors)
- **Web Build (`npm run build`)**: Succeeded (built in 5.70s)
- **Admin-Client TypeScript (`tsc -b`)**:
  - Fails with 3 pre-existing errors in `vite.config.ts`:
    - `vite.config.ts:3:18 - error TS2307: Cannot find module 'path' or its corresponding type declarations.`
    - `vite.config.ts:9:25 - error TS2304: Cannot find name '__dirname'.`
    - `vite.config.ts:14:26 - error TS2304: Cannot find name '__dirname'.`
- **Admin-Client Build (`npm run build`)**: Succeeded (built in 3.60s)

### 2. File Size Metrics (TS / TSX in `backend/src`, `web/src`, `admin-client/src`)
- Files > 150 lines: 151 files
- Files > 300 lines: 41 files
- Files > 500 lines: 9 files
  1. `web/src/features/github/components/GithubInstructions.tsx` (803)
  2. `backend/src/modules/students/students.repository.ts` (789)
  3. `admin-client/src/features/learning/components/CourseFormModal.tsx` (703)
  4. `web/src/features/learning/components/YouTubePlayer.tsx` (637)
  5. `backend/src/modules/github/services/github.api.service.ts` (632)
  6. `backend/src/modules/github/services/github.sync.service.ts` (554)
  7. `admin-client/src/types/index.ts` (552)
  8. `backend/src/modules/events/events.service.ts` (536)
  9. `web/src/shared/ui/VideoPlayer.tsx` (509)

- `web/src/features/learning/components/YouTubePlayer.tsx`: 637 lines

### 3. Database Query Safety Metrics
- Total `findMany` in `modules/**/*.repository.ts`: 121
- Bounded `findMany` (with `take:`): 17
- Unbounded `findMany`: 104

### 4. Page Request Counts Baseline
- **Web (Student)**:
  - Profile (`/profile`): 7 requests (`/student/profile`, `/student/resume`, `/student/portfolio/projects`, `/student/portfolio/achievements`, `/student/portfolio/certificates`, `/student/me`, `/student/portfolio`)
  - Portfolio (`/portfolio`): 1 request per active tab
  - Events (`/events`): 2 requests (`/student/events`, `/student/registrations`)
  - Video (`/video`): 1 request (`/student/me`)
  - Teams (`/teams`): 3 requests (`/student/events`, `/student/teams`, `/student/team-invitations`)
  - GitHub (`/github`): 1 request (`/student/github`), active polling every 3s during sync
  - Notifications (`/notifications`): 1 request (`/student/notifications?limit=20`)
- **Admin-Client**:
  - Moderation (`/admin/moderation`): 2 requests (`/admin/moderation/items`, `/admin/moderation/projects`) - loads all items without server pagination
  - Events (`/admin/events`): 1 request (`/admin/events`)
  - Registrations (`/admin/registrations`): 2 requests (`/admin/events`, `/admin/registrations`)
  - Students (`/admin/students`): 1 request (`/admin/students`)

---

## Changes & Progress Log
(Subagents record detailed actions and test assertion updates below)

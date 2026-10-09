# Performance & Codebase Baseline (Phase 0)

Recorded on: 2026-10-09
Git commit: 8a6f5b48e7b570e00f8f047fc60694f8c99ef75b
Branch: `perf/phase-0-baseline`

---

## 1. Typecheck & Test Results

### Backend Typecheck
- **Command**: `./backend/node_modules/.bin/tsc --noEmit -p backend`
- **Result**: Failed (exit code 2), 2 errors in `backend/src/routes/student.interactions.routes.ts`:
  - `TS2353: Object literal may only specify known properties, and 'code' does not exist in type 'TeamSelect<DefaultArgs>'.` (line 359)
  - `TS2551: Property 'event' does not exist on type '...'` (line 368)

### Web Typecheck
- **Command**: `./web/node_modules/.bin/tsc -b web`
- **Result**: Passed (exit code 0), 0 errors.

### Admin-Client Typecheck
- **Command**: `./admin-client/node_modules/.bin/tsc -b admin-client`
- **Result**: Failed (exit code 2), 2 pre-existing errors in `admin-client/vite.config.ts`:
  - `TS2307: Cannot find module 'path' or its corresponding type declarations.` (line 3)
  - `TS2304: Cannot find name '__dirname'.` (line 9)

### Backend Test Suite (Vitest)
- **Command**: `cd backend && npx vitest run`
- **Duration**: 7.35s
- **Test Files**: 10 failed | 28 passed (38 total)
- **Tests**: 24 failed | 314 passed (338 total)
- **Note**: Failures in resume/video streaming (`Cache-Control` header assertions) and thumbnail mocks.

---

## 2. Production Bundle Sizes

### `web` Bundle Build (`npm run --prefix web build`)
Total built in 5.32s.
Top 10 largest JavaScript chunks:

| Rank | Chunk Name | Raw Size | Gzip Size |
|---|---|---|---|
| 1 | `dist/assets/vendor-BMfCxxLB.js` | 238.45 kB | 76.55 kB |
| 2 | `dist/assets/react-U4QV4Q83.js` | 174.89 kB | 57.82 kB |
| 3 | `dist/assets/index-BMGV1BUd.js` | 135.58 kB | 43.36 kB |
| 4 | `dist/assets/ReadmeExcerptView-BirJJUN4.js` | 126.19 kB | 39.38 kB |
| 5 | `dist/assets/AppLayout-D_9LrBny.js` | 88.81 kB | 30.24 kB |
| 6 | `dist/assets/EditProfilePage-CIXUx8gY.js` | 51.50 kB | 14.82 kB |
| 7 | `dist/assets/PortfolioPage-C28jAoEP.js` | 43.73 kB | 10.49 kB |
| 8 | `dist/assets/PublicStudentProfilePage-DouDFCPi.js` | 34.18 kB | 7.52 kB |
| 9 | `dist/assets/DashboardPage-DejwJHzx.js` | 29.48 kB | 8.90 kB |
| 10 | `dist/assets/ProfilePage-bAomJBD9.js` | 25.89 kB | 6.26 kB |

### `admin-client` Bundle Build (`npm run --prefix admin-client build`)
Total built in 3.88s.
Top 10 largest JavaScript chunks:

| Rank | Chunk Name | Raw Size | Gzip Size |
|---|---|---|---|
| 1 | `admin/assets/react-CKty3JDQ.js` | 236.02 kB | 77.30 kB |
| 2 | `admin/assets/index-Xxjjvicj.js` | 109.24 kB | 34.80 kB |
| 3 | `admin/assets/StudentDetail-xDitD-tj.js` | 43.57 kB | 9.10 kB |
| 4 | `admin/assets/Moderation-DLGGKzwh.js` | 41.92 kB | 9.89 kB |
| 5 | `admin/assets/EventRegistrations-DDWDbGVc.js` | 38.10 kB | 7.35 kB |
| 6 | `admin/assets/AdminEvents-D81b9phW.js` | 29.54 kB | 6.53 kB |
| 7 | `admin/assets/Analytics-CXnLh9Aj.js` | 14.37 kB | 3.05 kB |
| 8 | `admin/assets/Storage-CvSx_M0l.js` | 14.22 kB | 3.58 kB |
| 9 | `admin/assets/RolesPermissions-CTJfBtAC.js` | 13.02 kB | 3.40 kB |
| 10 | `admin/assets/EmailAutomation-BMIKn3Hz.js` | 12.74 kB | 3.54 kB |

---

## 3. Largest 15 Source Files by Line Count

| Rank | File Path | Line Count |
|---|---|---|
| 1 | `backend/src/routes/admin.api.routes.ts` | 3,000 |
| 2 | `backend/src/routes/admin.portal.routes.ts` | 1,915 |
| 3 | `backend/src/services/drive.service.ts` | 1,870 |
| 4 | `admin-client/src/pages/Moderation.tsx` | 1,530 |
| 5 | `backend/src/routes/student.routes.ts` | 1,480 |
| 6 | `admin-client/src/pages/StudentDetail.tsx` | 1,427 |
| 7 | `admin-client/src/pages/EventRegistrations.tsx` | 1,337 |
| 8 | `web/src/pages/public/PublicStudentProfilePage.tsx` | 1,147 |
| 9 | `web/src/pages/VideoPage.tsx` | 1,052 |
| 10 | `web/src/pages/DashboardPage.tsx` | 979 |
| 11 | `web/src/pages/ProfilePage.tsx` | 936 |
| 12 | `admin-client/src/pages/AdminEvents.tsx` | 900 |
| 13 | `web/src/pages/GithubPage.tsx` | 868 |
| 14 | `backend/src/routes/public.routes.ts` | 861 |
| 15 | `admin-client/src/components/SubmissionDetailModal.tsx` | 812 |

---

## 4. Student Dashboard & GitHub Network Footprint

- **Dashboard Load Request Count**: **10 API requests** fired in parallel:
  1. `GET /api/student/profile`
  2. `GET /api/student/portfolio/resumes`
  3. `GET /api/student/portfolio/projects`
  4. `GET /api/student/portfolio/achievements`
  5. `GET /api/student/portfolio/certificates`
  6. `GET /api/student/events`
  7. `GET /api/student/registrations`
  8. `GET /api/student/voting`
  9. `GET /api/student/notifications`
  10. `GET /api/student/github`
  *(in addition to `/api/student/me` auth session verification)*

- **`GET /api/student/github` Payload Size (Student with 30 repos)**:
  - **Uncompressed JSON**: **168.05 KB** (172,083 bytes)
  - **Gzip Compressed**: **2.61 KB** (2,676 bytes)
  - Root cause: Returns full table fields across 30 repositories including `dependencies` JSON arrays and up to 4,000 characters of `readmeExcerpt` per repository, plus duplicate `showcasedRepos` instances.

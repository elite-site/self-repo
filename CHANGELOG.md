# Changelog

For the complete, comprehensive architectural evolution and commit ledger of all 48 commits, see [COMMITS_HISTORY.md](./COMMITS_HISTORY.md).

## Quick Summary of Recent Releases

### `c197a96` — fix(api): mount academic year routes, optimize media range streaming, and fix auth checks & test suites
- Mounted `adminAcademicYearRoutes` on `/admin/api/academic-year` and `/api/admin/academic-year`.
- Enabled `Authorization: Bearer <token>` fallback in `requireAdminAuth`.
- Enhanced public media proxy and admin media proxy with HTTP Range `206 Partial Content` streaming, `Accept-Ranges: bytes`, and stream cleanup on disconnect.
- Validated `studentId` authentication prior to database status lookups in student interactions and event registrations.
- Achieved 100% test pass rate across all 14 test files (66/66 tests).

### `2f334e1` — fix(video): ensure permanent video persistence, instant playback controls, and fix cache invalidation on login/logout
- Added full video playback controls (Play, Pause, Replay, Seek -5s/+5s, Download).
- Configured `no-store, no-cache` headers on profile and me endpoints to eliminate stale cached videos across login/logout sessions.
- Added Range request streaming (`206 Partial Content`) to mock storage and drive streaming endpoints.
- Added comprehensive lifecycle test suite (`tests/student.video.lifecycle.test.ts`).

### `b2deae8` — fix(env): prevent production startup crash when STUDENT_JWT_SECRET or ADMIN_DEFAULT_PASSWORD are not explicitly set
- Added fallback defaults to ensure zero-crash startup during Render/Railway container deployment boots.

### `30c142d` — fix(deploy): resolve Render build error for compression types and fix cross-site Google sign-in auth
- Added local TypeScript declaration file for `compression`.
- Added URL query parameter fallback (`?token=`) on OAuth callback for cross-site cookie blocking in modern mobile browsers.

### `278fb1a` — feat: stream video upload directly to drive, optimize scale for 200+ users, and enhance upload UI
- Direct request piping to Google Drive resumable sessions (`/submission/video-stream`) without server memory buffering.
- Added Gzip/Brotli compression for JSON responses.
- Implemented Academic Year batch promotion service with audit logs.
- Enhanced upload UI with live percentage, upload speed, and ETA calculations.

# API and data contracts

This describes the HTTP surface mounted by `backend/src/server.ts`. Route files under `backend/src/modules/**/*.routes.ts` are authoritative; several routers register aliases (arrays of paths) and admin routers are mounted at two bases for existing clients.

## Bases and health

| Base | Audience | Notes |
|---|---|---|
| `/api` | Public site | Metadata, legacy submission, published events and media. |
| `/api/public/students`, `/api/public/videos` | Public site | Published directory and approved video playback. |
| `/api/student`, `/api/student/learning` | Signed-in students | Profile, portfolio, integrations, learning, interactions. Learning routes require `FEATURE_LEARNINGHUB`. |
| `/admin`, `/admin/api`, `/admin/api/portal` | Admins | Session endpoints, management APIs, and the built admin SPA. |
| `/api/internal` | Trusted schedulers | Secret-protected sync and eviction ticks. |
| `/health`, `/ready` | Platforms | Liveness and cached DB+Drive readiness. |

## Endpoint map

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/branches`, `/api/sections`, `/api/years` | Directory filter metadata. |
| POST | `/api/submissions` | Legacy application submission with upload validation and rate limit. |
| GET | `/api/public/events`, `/api/public/events/:id` | Open events and event detail. |
| GET | `/api/media/thumbnail/:type/:id`, `/api/public/media/thumbnail/:type/:id` | Thumbnail variants. |
| GET | `/api/public/media/:type/:fileId` | Stream published media through an app-owned URL. |
| GET | `/api/public/students/`, `/api/public/students/index`, `/api/public/students/skills`, `/api/public/students/events`, `/api/public/students/:rollNo`, `/api/public/students/:rollNo/resume` | Published directory, index, skills, events, profile, resume. |
| GET | `/api/public/videos/`, `/api/public/videos/featured`, `/api/public/videos/stream/:id` | Approved/public intro-video list and playback. |

### Student

| Base | Representative endpoints |
|---|---|
| `/api/student` | `GET /google/authorize`, `GET /google/callback`, `POST /logout`, `GET /me`, `GET /dashboard` |
| `/api/student` | `POST|DELETE /submission`, `PATCH /submission/video-visibility`, `GET /submission/media/video`, `POST /submission/video-session`, `POST /submission/video-complete`, `POST /submission/video-stream` |
| `/api/student` | `GET|POST|DELETE /resume` |
| `/api/student/profile` | `GET|PUT /`, `POST|DELETE /photo`, `GET|PUT /skills`, `POST /change-request`, `GET /change-requests` |
| `/api/student/portfolio` | Frozen module: `GET /`, `/projects`, `/achievements`, `/certificates`; project/achievement/certificate POST, PUT, PATCH and DELETE routes in `portfolio.routes.ts`. |
| `/api/student/github` | `GET /callback`, `GET /`, `/summary`, `/repos/:id/readme`; `POST /connect`, `/sync`, `/reminder/snooze`; `PUT /showcase`, `/skills/showcase`, `/skills`; `DELETE /`. |
| `/api/student/codechef` | `GET /status`, `/details`; `POST /connect`, `/sync`; `PUT /visibility`; `DELETE /`. Requires `FEATURE_CODECHEF`. |
| `/api/student/events` | `GET /`, `GET /:id`. |
| `/api/student/resources` | `GET /`, `GET /semesters`. |
| `/api/student/learning` | `GET /home`, `/my-learning`, `/lessons/:id`, `/courses`, `/courses/:slugOrId`, `/quizzes/:quizId`, `/quizzes/:quizId/attempts`, `/lessons/:id/transcript`; `POST /lessons/:id/progress`, `/lessons/:id/playback`, `/lessons/:id/playback/heartbeat`, `/courses/:id/enroll`, `/quizzes/:quizId/start`, `/quizzes/:quizId/submit`; `DELETE /lessons/:id/playback`, `/lessons/:id/playback/release`. Route arrays add shorter aliases. |
| `/api/student` (interactions) | Voting: `GET /voting`, `/voting/:id`, `POST /voting/:id/vote`, `/voting/vote`. Notifications: `GET /notifications`, `POST|PATCH /notifications/read-all`, `PATCH /notifications/:id/read`, `DELETE /notifications/query`, `/notifications/:id`. Registrations/teams: `GET /registrations`, `/registrations/:id`, `/teams`, `/team-invitations`; related POST/DELETE actions in `interactions.routes.ts`. |

### Internal

| Method | Path | Guard |
|---|---|---|
| POST | `/api/internal/github-sync-tick` | `INTERNAL_SYNC_SECRET` via `x-internal-secret` or Bearer. |
| POST | `/api/internal/codechef-sync-tick` | Same internal secret. |
| POST | `/api/internal/video-cache/evict` | Same internal secret; called by the GitHub Actions eviction workflow. |

### Admin

| Base | Representative endpoints |
|---|---|
| `/admin` | `POST /login`, `POST /logout`, `GET /me`. |
| `/admin/api` | `GET /stats`, `/activity-logs`, `/activity-logs/export`, `/storage`; `POST /storage/clear-cache`, `/storage/ensure-viewer-permissions`. |
| `/admin/api` | Submissions: `GET /submissions`, `/submissions/export`, `/submissions/:id`, `/submissions/:id/media/:fileKey`; PATCH rating/review/status; POST request-video; DELETE video/submission. |
| `/admin/api` | Events: `GET /events`, `/registrations`, `/registrations/:id`, `/teams`; registration and team PATCH/DELETE actions. Moderation queues and `/moderation/:type/:id` actions. Voting, announcements, email automations/history/templates. |
| `/admin/api`, `/admin/api/portal` | Portal student detail/change/delete/status/feature, announcements, analytics, RBAC/settings, GitHub overview/logs/projects/resync, event CRUD/publish/close/archive, moderation approve/reject/hide. |
| `/admin/api/learning` | Admin courses, lessons, quizzes and reports; route arrays provide `/admin/...`, `/...`, and short aliases in the underlying routers. Requires `FEATURE_LEARNINGHUB`. |
| `/admin/api/resources` | Resource list/create/update/delete. |
| `/admin/api/codechef` | Student lists, leaderboard, stats, export, detail, resync, verify, unlink. Requires `FEATURE_CODECHEF`. |
| `/admin/api` and `/api/admin` | `GET /video-cache`, `POST /video-cache/:id/retry`, `POST /video-cache/purge-idle`. |
| `/admin/api/academic-year` | `POST /promote`. |

## Response conventions

- **Errors:** `errorHandler` is the only HTTP error translator. Error JSON contains `error`, `message`, optional `details`, optional `source`/extra fields, and always `requestId`. Prisma `P2002`/`P2003` map to 409, `P2025` to 404, connection/pool errors to 503 with `Retry-After`, JWT failures to 401, Multer failures to 400, unknown failures to a production-safe 500.
- **Correlation:** `requestIdMiddleware` accepts `x-request-id` or generates `req_<hex>`, echoes `X-Request-Id`, and attaches the same ID to logs and error payloads.
- **Pagination:** paginated reads accept `page` and `limit`. Shapes are not yet uniform: some endpoints return `total`/`totalPages`, others return `pagination.total`. Clients should read the endpoint's own DTO rather than assume one wrapper.
- **Caching:** public read endpoints use deliberate `Cache-Control` values; admin/personal data is not cacheable by design. Built assets under `/assets` are hashed and immutable; shells are `no-cache`.
- **DTOs and storage:** repositories use explicit `select` projections. Media is intended to be served through app-owned URLs, not raw storage links; current exceptions are recorded in [security](security.md).
- **Validation:** module schemas validate input at the boundary. Uploads additionally pass through `ValidationService` magic-byte and decoder checks.
- **Compatibility:** API changes are additive within a release. Backend deploys before web; removals follow the expand/switch/contract sequence in [operations](operations.md).

# Backend architecture

Scope: the Express 4 + TypeScript API in `backend/`. It is a modular monolith backed by PostgreSQL through Prisma 5. The same process also serves the built `admin-client` bundle under `/admin` and the built `web` bundle under `/` when those builds exist.

## Source layout

| Path | Responsibility |
|---|---|
| `backend/src/server.ts` | Application composition: middleware order, route mounts, static SPA mounts, startup schedulers. No business rules. |
| `backend/src/config/` | Validated environment (`env.ts`), constants, static-asset cache policy. |
| `backend/src/modules/<name>/` | One business domain: routes, controllers, services, repositories, schemas, types, public `index.ts`. |
| `backend/src/middleware/` | Cross-cutting HTTP concerns: request ID, auth, rate limits, upload parsing, central error handler. |
| `backend/src/infrastructure/` | Prisma client, health probes, process guards, and adapters for email, R2, CodeChef, and DB timing. |
| `backend/src/jobs/` | `node-cron` schedulers. Jobs call services and own no queries. |
| `backend/src/services/` | Cross-module helpers such as upload validation and effective video limits. |
| `backend/src/utils/` | `AppError`, `asyncHandler`, logger, TTL caches, small generic helpers. |
| `backend/prisma/` | `schema.prisma`, immutable migrations, seed/script support. |

Current domain modules include `admin`, `announcements`, `auth`, `codechef`, `email`, `events`, `github`, `learning-courses`, `learning-home`, `learning-progress`, `learning-quizzes`, `learning-reports`, `media`, `moderation`, `portfolio`, `public`, `resources`, `students`, `video-cache`, and `voting`.

## Layer direction

```text
route -> controller -> service -> repository -> Prisma/database
```

- Routes map paths to controller handlers and attach middleware; they do not contain business logic.
- Controllers parse requests, call one service operation, and shape the response; they never call Prisma.
- Services own rules, orchestration, and transactions; they never read `req`/`res`.
- Repositories own Prisma queries and explicit `select` projections.
- Other modules import only from `modules/<name>/index.ts`; services call services across module boundaries.
- One Prisma client instance lives in `backend/src/infrastructure/prisma.ts`.

`backend/src/modules/portfolio/` and `web/src/features/portfolio/` are frozen by `AGENTS.md` and were not changed during the docs rebuild.

## Request pipeline

`server.ts` composes middleware in this order:

1. Process guards and `BigInt` JSON serialization.
2. `trust proxy`, `requestIdMiddleware` (`x-request-id` in, `X-Request-Id` out).
3. Helmet with an explicit CSP; CORS with credentialed requests; repeated-slash normalization.
4. Cookie parser, compression, JSON/urlencoded body parsers (1 MB).
5. General `/api` rate limiter.
6. `/health`, `/ready`, internal routers, public/student/admin routers.
7. Static frontend mounts and SPA fallbacks.
8. Central `errorHandler`.

Async handlers are wrapped with `asyncHandler`. Failures are thrown as `AppError` subclasses and rendered once by `errorHandler`; every error JSON includes `requestId`. See [error model decisions](../decisions/0001-single-error-model.md) and [security](../security.md).

## Route mount map

| Mount | Router / purpose |
|---|---|
| `/api` | Public metadata, submissions, events, thumbnails, media streams. |
| `/api/public/students`, `/api/public/videos` | Published directory and approved intro-video playback. |
| `/api/internal` | Secret-protected GitHub, CodeChef, and video-cache ticks. |
| `/api/student/learning` | LearningHub home, courses, lessons, progress, quizzes; gated by `FEATURE_LEARNINGHUB`. |
| `/api/student/profile`, `/api/student/portfolio`, `/api/student/github`, `/api/student/codechef`, `/api/student/events`, `/api/student/resources` | Student domain routes; CodeChef is gated by `FEATURE_CODECHEF`. |
| `/api/student` | SSO/auth, `me`, dashboard, submission/video, resume, voting, notifications, event registrations, teams. |
| `/admin` | Admin login/logout/me and the built admin SPA. |
| `/admin/api/learning`, `/admin/api/resources`, `/admin/api/codechef` | Admin LearningHub, resources, and CodeChef management. |
| `/api/admin` and `/admin/api` | Admin video-cache status, retry, and purge endpoints; both mounts are intentional. |
| `/admin/api` | Core admin API: stats, submissions, moderation, events, voting, announcements, storage, email. |
| `/admin/api/portal` and `/admin/api` | Portal management: student details, RBAC/settings, analytics, GitHub overview; both mounts are load-bearing. |
| `/admin/api/academic-year` | Academic-year promotion. |

The endpoint catalogue in [API and data](../api-and-data.md) lists concrete paths from the route files.

## Configuration and external systems

- All runtime configuration is read in `backend/src/config/env.ts`; no other backend source reads `process.env`. The authoritative template is `backend/.env.example`.
- Production startup refuses a missing `DATABASE_URL` or missing/default runtime JWT secrets. `ALLOW_INSECURE_DEFAULT_SECRETS=true` is a temporary recovery escape hatch, not a safe setting.
- Runtime uses `DATABASE_URL`; Prisma migrations and CLI work use `DIRECT_URL`.
- External systems are wrapped at the edge: Google Drive lives in `modules/media/drive/`, email in `infrastructure/email.ts`, R2 in `infrastructure/r2.ts`, CodeChef in `infrastructure/codechef.client.ts`. Services depend on those adapters, not provider SDKs.

## Feature gates

| Flag | Current default | Server-side enforcement |
|---|---|---|
| `FEATURE_GITHUB_PORTFOLIO` | `false` | Read in config; GitHub integration env/tuning and sync behavior are conditional. |
| `FEATURE_VIDEO_CACHE` | `false` | Startup requires R2 variables when enabled; playback/admin cache behavior depends on the flag. |
| `FEATURE_LEARNINGHUB` | `true` (`false` disables) | `learningFlagGuard` returns 404 for `/api/student/learning` and `/admin/api/learning`; quiz reminders are skipped. |
| `FEATURE_CODECHEF` | `true` (`false` disables) | `codechefFlagGuard` returns 404 for student/admin CodeChef routers; scheduled sync is skipped. |

New user-facing flags should default OFF; these two ON-by-default flags are existing behavior verified in `config/env.ts`, not a pattern for new work.

## Known deviations

- `server.ts` and `infrastructure/health.ts` import `media/drive` by path instead of routing through `modules/media/index.ts`; routing them through the barrel risks an import cycle (`ARCH-5`). This is documented deliberately.
- Some student/public controllers still expose raw Drive identifiers and preview URLs. See [security](../security.md) for the current SEC-4 review item.
- Several routers retain path aliases (arrays of routes, duplicate admin mounts) for existing clients; new API work must stay additive.

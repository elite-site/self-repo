# Security

This page records the controls implemented in `backend/src` and the review items that remain. It is not a claim that every `AGENTS.md` security rule is fully met.

## Authentication

| Principal | Session source | Verification |
|---|---|---|
| Admin | `ADMIN_SESSION_COOKIE_NAME` cookie, or `Authorization: Bearer` | `requireAdminAuth` verifies with `JWT_SECRET`. |
| Student | `pc_student_session` cookie, `Authorization: Bearer`, or `?token=` query | `requireStudentAuth` verifies with `STUDENT_JWT_SECRET` (falls back to `JWT_SECRET`). |
| Internal scheduler | `x-internal-secret` header or Bearer token | Compared with `INTERNAL_SYNC_SECRET` in GitHub, CodeChef, and video-cache controllers. |

`auth.controller.ts` sets both session cookies with `httpOnly: true`, `secure` in production, a 12-hour lifetime, and `path: '/'`. Student cookies use `sameSite: 'none'` in production and `'lax'` in development; admin cookies use `'strict'`.

**Review item:** accepting `?token=` for student auth conflicts with `SEC-8` (tokens in URLs). Phase-2 notes also record frontend `localStorage` token use. Preserve the current behavior until an auth-flow decision is made, but do not copy it into new endpoints.

## Authorization

- Protected routers call `requireAdminAuth` or `requireStudentAuth` on the router itself; public routes stay under `/api` and `/api/public/*`.
- Ownership checks live in services: quiz attempts verify `studentId`, GitHub account linking checks the OAuth state owner, and student mutation services scope by the authenticated student ID.
- Visibility is enforced in repository queries, not in the UI: public events require `status: 'OPEN'` and exclude the internal event; only approved/public portfolio items are returned.
- Admin RBAC data lives in `Role`, `RolePermission`, and `RoleAssignment`; portal settings and moderation actions are admin-only routes.

## Transport, headers, and origins

- Helmet sets an explicit CSP. `frameAncestors` includes self plus Netlify, Render, Vercel, and localhost origins; `xFrameOptions` is disabled in favor of CSP framing rules.
- CORS accepts credentialed requests. It allows configured `ALLOWED_ORIGINS` plus any `https://*.netlify.app`, `*.onrender.com`, or `*.vercel.app` origin, and allows requests with no `Origin` header. Treat the wildcard subdomain rule as a review item for production hardening.
- `trust proxy` is set to `1` so secure cookies work behind a single proxy.
- Responses expose `Content-Range`, `Content-Length`, `Accept-Ranges`, `Content-Disposition`, and `ETag` for media range requests.

## Rate limits

All limits use `express-rate-limit` and standard rate-limit headers. Identity is authenticated user/student ID when available, otherwise a token-derived ID, otherwise IP.

| Scope | Limit |
|---|---|
| `/api` general | 1000 requests / 5 min per client |
| Uploads and submissions | 10 requests / 1 min |
| Lesson playback requests and heartbeats | 60 requests / 1 min |
| Admin login | 15 attempts / 15 min |
| Student SSO login | 500 attempts / 5 min, successful requests skipped |

## Secrets and configuration

- `backend/src/config/env.ts` is the only backend file that reads `process.env`; `backend/.env.example` is the documented template.
- Production startup refuses a missing `DATABASE_URL` or missing/default runtime JWT secrets. `ALLOWED_ORIGINS`, Drive, Resend, GitHub, and CodeChef settings come from the same validated config object.
- `ALLOW_INSECURE_DEFAULT_SECRETS=true` is an emergency recovery escape hatch and logs a loud warning; it is not a safe production setting.
- `FEATURE_VIDEO_CACHE=true` requires R2 credentials at startup. Internal ticks require `INTERNAL_SYNC_SECRET`.
- CI blocks tracked `.env*`, `.xlsx`, and `backend/storage/` paths and checks tracked env files for secret-looking keys. Never print real values from these files.
- Seed-only defaults (`ADMIN_DEFAULT_PASSWORD`, `ADMIN_DEFAULT_EMAIL`) produce warnings rather than blocking startup because the running server does not consume them.

## Upload validation

Multer uses memory storage with explicit size fields. `backend/src/services/validation.service.ts` then inspects real content:

| Upload | Accepted content | Cap |
|---|---|---|
| Images | JPEG, PNG, WebP; magic-byte sniff plus Sharp decode | `MAX_IMAGE_SIZE_MB` (default 10) |
| Video | MP4, MOV, WebM, MKV; extension plus magic-byte sniff | Admin-configured limit (default 25 MB), hard buffer cap 100 MB |
| Study resource | PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, ZIP, PNG/JPG/WebP, TXT/MD | 50 MB |

Resource validation rejects HTML, SVG, XML, and script-like text preambles because resources can be previewed inline. Errors are typed and rendered through the central handler.

## Errors, logging, and privacy

- All async handlers are wrapped with `asyncHandler`; typed `AppError` subclasses are translated only by `errorHandler`.
- Production error responses hide internal messages, SQL, stacks, file paths, and provider text; 4xx failures log at warn, 5xx at error with the `requestId`.
- `utils/logger.ts` emits structured JSON in production and human-readable lines in development. Process guards summarize unhandled rejection values instead of logging raw provider objects; uncaught exceptions are logged and exit so the platform can restart cleanly.
- Student personal data must remain out of source, logs, tests, fixtures, and screenshots. Test data is synthetic; roster import and seed scripts are human-run operations and were not executed while writing these docs.

## Storage exposure (SEC-4 review item)

The video-cache controller explicitly excludes Drive IDs and R2 keys from its responses, and public playback is designed around `/api/public/media/*` and `/api/public/videos/stream/:id` URLs.

However, `public.students.controller.ts` still returns `driveFileId`, a Drive `previewUrl`, and thumbnail URLs containing `?v=<drive file id>` for some achievements, certificates, resumes, and intro videos. This is an open SEC-4 defect, not an approved exception. Do not add raw storage identifiers or provider URLs to new DTOs.

## Related decisions and runbooks

- [ADR 0001: single error model](decisions/0001-single-error-model.md)
- [ADR 0004: video cache and ephemeral leases](decisions/0004-video-cache.md)
- [GitHub sync runbook](runbooks/github-sync.md)
- [Video cache runbook](runbooks/video-cache.md)

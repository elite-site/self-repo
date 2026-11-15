# ADR 0004: Drive-Backed Video Lessons with Cloudflare R2 Caching and Ephemeral Leases

- **Status**: Accepted
- **Date**: 2026-11-01
- **Governing Rules**: `ARCH-1` through `ARCH-10`, `ERR-1` through `ERR-14`, `SEC-4`, `SEC-6`, `SEC-12`, `DB-5`, `DB-6`

---

## Context

The educational platform delivers multimedia video lessons uploaded to Google Drive by instructors and administrators. The production infrastructure runs on Render's free compute tier alongside client deployments on Vercel:
1. **Render Free Tier Constraints**: Compute nodes are limited to 512 MB RAM, ephemeral local storage with zero disk persistence across deploys/restarts, aggressive idling (spinning down after 15 minutes of inactivity), and narrow outbound bandwidth caps.
2. **Google Drive API Bottlenecks**: Serving high-concurrency video playback streams directly from Render or proxied from Google Drive triggers daily Google Drive API download quota exhaustion, token invalidation, stream buffering, and potential credential leakage.
3. **Storage & Egress Economics**: Traditional cloud object stores (e.g. AWS S3) incur substantial bandwidth egress fees. Conversely, Cloudflare R2 offers zero-egress bandwidth costs, full S3 API compatibility, and a generous free tier (10 GB storage, 10M Class B read operations per month).

Directly streaming gigabytes of video through the backend process is non-viable; similarly, exposing Google Drive direct download links violates data isolation and security policies (`SEC-4`).

---

## Decision

We introduce a dedicated backend domain module (`backend/src/modules/video-cache/`) implementing an on-demand, streaming Drive-to-R2 caching pipeline with ephemeral student playback leases and transactional anti-race cache rotation.

### 1. Atomic Concurrency & Claiming (`claimOrFind`)
When a student initiates playback for a hosted video lesson, the backend requests the cache status via `claimOrFind` (`DB-5`):
- If the cache row exists with status `READY`, the access timestamp (`lastAccessedAt`) is updated and the cached asset is served immediately.
- If no cache record exists, an atomic database insert claims ownership with status `COPYING` and `claimedAt = now()`.
- Under concurrent requests, unique constraints (`@@unique([driveFileId])`) prevent duplicate copy operations; the winner proceeds with copy execution while concurrent losers receive HTTP 200 `{ status: 'PREPARING', retryAfterSec: 3 }`.
- **Stale Claim Recovery**: Claims abandoned due to process restarts or crashes recover automatically: any `COPYING` claim older than 15 minutes is treated as stale and eligible for atomic re-claiming.

### 2. Zero-Buffer Streaming Pipeline & In-Process Semaphore
Video copying is executed without buffering complete files in memory:
- **Stream-to-Stream Pipe**: Data streams from Google Drive through a transform stream that calculates MD5 checksums on the fly, directly piped into Cloudflare R2 via multipart upload (`r2Adapter.putObjectStream`). Memory footprint remains constant (< 15 MB) regardless of video length.
- **Concurrency Limiting**: Background copying is metered by an in-process semaphore bounded by `VIDEO_COPY_CONCURRENCY` (default: 2), preventing socket starvation or CPU overload on shared cores.

### 3. Ephemeral Student Leases (`VideoLease`) & URL Refresh
Direct bucket URLs and storage identifiers are never exposed (`SEC-4`):
- Playback requests issue a short-lived `VideoLease` (TTL: 180s) and an R2 presigned GET URL (TTL: 600s).
- Video player components maintain continuous playback by pinging a lightweight heartbeat endpoint (`POST /lessons/:id/playback/heartbeat`) before URL expiration.
- Explicit playback releases (`DELETE /lessons/:id/playback` or `sendBeacon`) discard leases immediately upon navigation or tab closure.

### 4. Transactional Cache Eviction & Automated Cron Rotation
Cache footprint is strictly bounded by `VIDEO_CACHE_MAX_BYTES` (default: 9 GB):
- **Safety Window**: Eviction candidates are evaluated against three immutable safety checks:
  1. Status must be `READY`.
  2. Active unexpired leases must equal 0 (`_count.leases == 0`).
  3. Presigned URL safety cutoff: `lastUrlIssuedAt` must be older than `now - VIDEO_URL_TTL_SEC` (ensuring in-flight video segments never break).
  4. Idle threshold: `lastAccessedAt` must exceed `VIDEO_CACHE_IDLE_HOURS` (under storage pressure) or `VIDEO_CACHE_MAX_IDLE_HOURS` (24 hours).
- **Anti-Race Transaction**: Candidate eviction executes inside a Prisma transaction (`DB-6`). The database record is deleted atomically before the corresponding Cloudflare R2 object is purged.
- **External Cron Schedule**: Periodic eviction runs every 15 minutes via a GitHub Actions workflow (`.github/workflows/video-cache-evict.yml`) authenticating against `/api/internal/video-cache/evict` using `INTERNAL_SYNC_SECRET`.

### 5. Information Hiding (`SEC-4`, `API-5`)
Clients never receive Google Drive file IDs, folder paths, Cloudflare R2 keys, or bucket names:
- Client playback responses expose only opaque, signed presigned URLs and lease tracking identifiers.
- Internal R2 keys follow the prefix `lesson-cache/<uuid>` and are strictly validated by the adapter (`R2_KEY_PREFIX_VIOLATION`).

---

## Consequences

### Positive
- **High Streaming Performance**: Students experience immediate, low-latency video streaming served directly from Cloudflare's global edge network.
- **Zero Bandwidth Costs**: Zero egress fees from Cloudflare R2 completely eliminate bandwidth costs for the institution.
- **Drive API Quota Immunity**: Google Drive is read at most once per cache cycle; concurrent students in active classes stream entirely from edge cache without touching Google APIs.
- **Resilient to Restarts**: Ephemeral instance restarts or spin-downs on Render do not corrupt cache state or cause persistent locks; stale claims recover automatically in 15 minutes.
- **Safe Anti-Race Eviction**: Active video streams and recently issued URLs are mathematically protected from premature deletion.

### Trade-offs
- **Initial Load Latency**: A previously uncached video lesson incurs a brief preparation delay (~2–5 seconds) on first play while the initial chunks stream into R2.
- **Operational Dependencies**: Requires Cloudflare R2 API credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) and GitHub Actions repository secrets for background cron eviction.

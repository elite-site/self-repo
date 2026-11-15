# Runbook: Video Cache (Drive to Cloudflare R2 Caching)

This runbook covers configuration, Cloudflare R2 infrastructure provisioning, secret management, scheduled eviction, operational maintenance, and troubleshooting for the video caching engine.

---

## 1. Configuration & Environment Variables

All video cache configuration settings are managed through backend environment variables validated at startup in `backend/src/config/env.ts` (and documented in `backend/.env.example`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `FEATURE_VIDEO_CACHE` | Optional | `false` | Master feature flag. Enables Drive-to-R2 caching pipeline, student playback presigned URLs, and admin cache management routes. |
| `R2_ACCOUNT_ID` | Required* | `""` | Cloudflare Account ID found in the Cloudflare dashboard sidebar under **R2 Overview**. |
| `R2_ACCESS_KEY_ID` | Required* | `""` | Cloudflare R2 S3 API Access Key ID for authentication. |
| `R2_SECRET_ACCESS_KEY` | Required* | `""` | Cloudflare R2 S3 API Secret Access Key for signing S3 client requests. |
| `R2_BUCKET` | Required* | `""` | Name of the provisioned Cloudflare R2 bucket (e.g., `self-intro-video-cache`). |
| `VIDEO_CACHE_MAX_BYTES` | Optional | `9663676416` (9 GB) | Hard storage ceiling in bytes for cached video objects in R2 before eviction triggers under pressure. |
| `VIDEO_CACHE_IDLE_HOURS` | Optional | `6` | Hours since `lastAccessedAt` before a `READY` cache entry is eligible for eviction when under storage pressure (`totalBytes > VIDEO_CACHE_MAX_BYTES`). |
| `VIDEO_CACHE_MAX_IDLE_HOURS` | Optional | `24` | Hours since `lastAccessedAt` after which an idle video cache entry is evicted during scheduled maintenance regardless of remaining capacity. |
| `VIDEO_LEASE_TTL_SEC` | Optional | `180` (3 min) | Duration in seconds that an active playback lease token (`VideoLease`) remains valid before expiration if heartbeats cease. |
| `VIDEO_URL_TTL_SEC` | Optional | `600` (10 min) | Lifetime in seconds of generated S3 presigned GET URLs issued to video players. Also acts as the safety window during which entries cannot be evicted. |
| `VIDEO_COPY_CONCURRENCY` | Optional | `2` | Maximum concurrent background Drive-to-R2 stream transfers permitted across the instance to prevent CPU/network exhaustion. |
| `VIDEO_MAX_FILE_MB` | Optional | `1024` (1 GB) | Maximum individual video file size accepted from Google Drive for R2 caching. Files exceeding this limit fail fast. |
| `INTERNAL_SYNC_SECRET` | Required** | `""` | Shared secret header required to authorize cron-triggered eviction endpoints (`/api/internal/video-cache/evict`). |

*\* Required when `FEATURE_VIDEO_CACHE=true` (startup throws descriptive configuration error if missing).*  
*\*\* Required for automated eviction workflows.*

---

## 2. Cloudflare R2 Setup Guide

### Step 2.1: Provision the R2 Bucket
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **R2** in the left sidebar.
2. If this is the first bucket in the account, activate R2 subscription (includes 10 GB free tier per month).
3. Click **Create bucket**.
4. Name the bucket (e.g., `self-intro-video-cache`).
5. Choose **Default** (Automatic) location hint.
6. Click **Create Bucket**. Note the bucket name for `R2_BUCKET`.

### Step 2.2: Generate Cloudflare API Token
1. From the R2 Overview page in Cloudflare, click **Manage R2 API Tokens** in the right-hand panel.
2. Click **Create API Token**.
3. Configure token permissions:
   - **Token Name**: `self-intro-portal-video-cache`
   - **Permissions**: Select **Object Read & Write** (grants `GetObject`, `PutObject`, `DeleteObject`, `HeadObject`).
   - **Specify bucket(s)**: Apply to `self-intro-video-cache` (or all buckets).
   - **TTL**: Set appropriate expiration or Leave blank for indefinite until rotation.
4. Click **Create API Token**.
5. Copy the following credentials immediately (the secret key will not be shown again):
   - **Access Key ID** -> `R2_ACCESS_KEY_ID`
   - **Secret Access Key** -> `R2_SECRET_ACCESS_KEY`
   - **Account ID** (from the endpoint URL `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) -> `R2_ACCOUNT_ID`

### Step 2.3: Configure Bucket CORS Policy
Clients stream video lessons directly from R2 presigned URLs in browser `<video>` elements. Cross-origin headers must be permitted:
1. In the R2 bucket details page, select the **Settings** tab.
2. Scroll down to **CORS Policy** and click **Add CORS Policy** (or **Edit CORS Policy**).
3. Paste the following JSON policy:

```json
[
  {
    "AllowedOrigins": [
      "https://*.vercel.app",
      "https://your-production-domain.edu",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Range",
      "Content-Type",
      "Authorization"
    ],
    "ExposeHeaders": [
      "Content-Range",
      "Content-Length",
      "Accept-Ranges",
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```
4. Click **Save**.

---

## 3. GitHub Actions & Render Secrets Configuration

### Step 3.1: Backend Environment Configuration (Render)
In your Render web service dashboard under **Environment**:
1. Set `FEATURE_VIDEO_CACHE=true`.
2. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET`.
3. Generate a cryptographically strong 64-character token for `INTERNAL_SYNC_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Set `INTERNAL_SYNC_SECRET` on Render.
5. Deploy or restart the Render backend service. Verify that `/ready` responds with HTTP 200.

### Step 3.2: GitHub Actions Repository Secrets
Automated eviction runs every 15 minutes via `.github/workflows/video-cache-evict.yml`:
1. In the GitHub repository, navigate to **Settings** -> **Secrets and variables** -> **Actions**.
2. Under **Repository secrets**, click **New repository secret**:
   - Name: `INTERNAL_SYNC_SECRET`
   - Value: *(paste the exact secret set in Render)*
3. Under **Repository variables** (or **Secrets** if preferred), add:
   - Name: `BACKEND_URL`
   - Value: `https://your-backend-service.onrender.com` (no trailing slash)
4. Trigger the workflow manually via **Actions** -> **Video Cache Eviction** -> **Run workflow** to test connectivity. Verify the job completes with HTTP 200.

---

## 4. Operational Tasks & Troubleshooting

### 4.1 Inspecting Cache Health via Admin Portal
1. Navigate to the Admin Portal at `/admin/storage` (Storage & Media Management).
2. The **Video Lesson Cache** card presents real-time telemetry:
   - **Storage Usage**: Current consumed bytes against the `VIDEO_CACHE_MAX_BYTES` limit.
   - **Active Leases**: Count of students currently streaming active videos.
   - **Status Breakdown**: Counts of `READY`, `COPYING`, and `FAILED` video cache items.
3. Expanding the video items table displays individual lesson titles, cached sizes, last accessed timestamps, and copy attempt counts.

### 4.2 Retrying Failed Copy Operations
If a copy job fails (e.g. transient Drive network glitch or timeout):
- **Via Admin Portal**: Click the **Retry** icon button next to the failed lesson row.
- **Via Admin API**:
  ```bash
  curl -X POST "https://your-backend-service.onrender.com/admin/api/video-cache/<CACHE_ID>/retry" \
    -H "Cookie: pc_admin_session=<ADMIN_JWT>"
  ```
  The endpoint resets `status = 'COPYING'`, increments `copyAttempts`, resets `claimedAt = now()`, and restarts the background copy pipeline.

### 4.3 Manually Purging Idle Cache
To immediately release storage space without waiting for the scheduled 15-minute cron:
- **Via Admin Portal**: Click **Purge Idle Cache** in the Storage Overview header.
- **Via Admin API**:
  ```bash
  curl -X POST "https://your-backend-service.onrender.com/admin/api/video-cache/purge-idle" \
    -H "Cookie: pc_admin_session=<ADMIN_JWT>"
  ```
- **Via Internal Cron Endpoint**:
  ```bash
  curl -X POST "https://your-backend-service.onrender.com/api/internal/video-cache/evict" \
    -H "Authorization: Bearer <INTERNAL_SYNC_SECRET>"
  ```
Active leases and recently issued URLs (within `VIDEO_URL_TTL_SEC`) are mathematically protected; only truly idle videos with 0 active streamers will be evicted.

### 4.4 Handling Drive Quota Issues & Corrupted Files
- **Drive API 403 Rate Limit**: If instructor Google Drive accounts exceed daily download quotas, copy jobs will fail with `UpstreamError: Google Drive API rate limit reached`. The system automatically sets `failReason = 'COPY_FAILED'` and records failure without crashing the process. Once Drive quota resets, click **Retry** on the failed jobs.
- **Invalid MIME Type**: If an instructor uploads a `.mov` or non-video file under a hosted video lesson, the pipeline destroys the stream immediately, logs `INVALID_MIME`, and marks the item `FAILED`. The admin must replace the file in Drive with an approved `video/mp4` or `video/webm` file.
- **Size Exceeded**: Files larger than `VIDEO_MAX_FILE_MB` fail immediately with `FILE_TOO_LARGE` to protect R2 quota.

### 4.5 Stale Claim Recovery Explanation
When Render restarts a container or spins it down during an active copy job, the database row could theoretically remain stuck in status `COPYING`. The cache repository implements autonomous stale claim recovery:
1. When any student or admin initiates playback or checks status, `claimOrFind` inspects `claimedAt`.
2. If `status === 'COPYING'` and `claimedAt < now() - 15 minutes`, the claim is classified as abandoned.
3. The query atomically reclaims the row for the current process, restarting the copy job cleanly.
No manual database updates or admin interventions are necessary after container restarts.

# CodeChef Integration API Contract

This document specifies the exact API contracts, TypeScript DTOs, HTTP methods, permission guards, and response envelopes for the CodeChef integration.

---

## 1. Feature Flag & Global Error Format

### Feature Guard: `FEATURE_CODECHEF`
- Controlled by backend env `FEATURE_CODECHEF` (`=== 'true'`). Default is `false`.
- When disabled, all CodeChef student and admin endpoints return:
  ```json
  {
    "error": "NOT_FOUND",
    "message": "CodeChef integration is disabled",
    "requestId": "req_..."
  }
  ```
- All responses include `Server-Timing` and appropriate `Cache-Control`.

### Standard Error Envelope (`AppError`)
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message safe for users",
  "details": [{ "field": "handle", "message": "Invalid handle format" }],
  "requestId": "req_8f3a..."
}
```

---

## 2. Student Endpoints (`/api/student/codechef`)

All student endpoints require `requireStudentAuth` session cookie/header. The authenticated student ID is derived strictly from `req.student.studentId`.

### `GET /api/student/codechef/status`
Returns connection status, cooldown info, and high-level metrics.
- **Headers**: `Cache-Control: private, no-cache`
- **Response `200 OK`**:
```typescript
interface CodeChefStatusResponse {
  connected: boolean;
  status: 'CONNECTED' | 'UNVERIFIED' | 'STALE' | 'ERROR' | 'NOT_CONNECTED';
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  verifiedAt: string | null;
  verifyCode: string | null; // Null if already verified
  verifyCodeExpiresAt: string | null;
  showPublic: boolean;
  currentRating: number | null;
  maxRating: number | null;
  stars: number | null;
  globalRank: number | null;
  totalSolved: number | null;
  totalContests: number | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncCooldown: {
    canSync: boolean;
    nextSyncAllowedAt: string | null;
    cooldownMinutes: number; // 15
    manualSyncCountToday: number;
    dailyCap: number; // 10
  };
}
```

### `GET /api/student/codechef/details`
Returns full rich profile data (lazy-loaded on opening CodeChef page).
- **Headers**: `Cache-Control: private, max-age=60`
- **Response `200 OK`**:
```typescript
interface CodeChefDetailsResponse {
  handle: string;
  verified: boolean;
  status: 'CONNECTED' | 'UNVERIFIED' | 'STALE' | 'ERROR';
  lastSyncedAt: string | null;
  profile: {
    displayName: string | null;
    username: string;
    avatar: string | null;
    country: string | null;
    countryFlag: string | null;
    institution: string | null;
    company: string | null;
    bio: string | null;
    websites: string[];
    social: {
      github: string | null;
      twitter: string | null;
      linkedin: string | null;
    };
  };
  summary: {
    totalSolved: number;
    totalActiveDays: number;
    totalContests: number;
    currentRating: number | null;
    maxRating: number | null;
    stars: number | null;
    rank: string | null;
    globalRanking: number | null;
    topPercentage: number | null;
    longestStreak: number;
    currentStreak: number;
    badgesCount: number;
  };
  contests: Array<{
    name: string;
    date: string;
    timestamp: number;
    rating: number | null;
    ranking: number | null;
    problemsSolved: number | null;
    totalProblems: number | null;
  }>; // Last 50 kept
  heatmap: {
    totalSubmissions: number;
    currentStreak: number;
    longestStreak: number;
    dailyContributions: Array<{
      date: string;
      count: number;
      level?: number;
    }>;
    yearlyContributions?: Array<{
      year: number;
      total: number;
    }>;
  };
  topics: Array<{ topic: string; count: number }>;
  difficulty: Record<string, number>;
  badges: Array<{
    name?: string;
    title?: string;
    icon?: string;
    description?: string;
  }>;
}
```

### `POST /api/student/codechef/connect`
Links a CodeChef handle.
- **Request Body**:
```typescript
interface ConnectCodeChefRequest {
  handle: string; // validated with /^[A-Za-z0-9_.]{3,30}$/
}
```
- **Response `200 OK`**: Returns `CodeChefStatusResponse`.
- **Errors**: `400 VALIDATION_ERROR`, `409 CONFLICT` (if handle already claimed by another student).

### `POST /api/student/codechef/verify`
Checks verification status. Inspects CodeChef `bio` for `verifyCode`, or checks if `social.github` matches connected GitHub login.
- **Response `200 OK`**:
```typescript
interface VerifyCodeChefResponse {
  verified: boolean;
  message: string;
  verifiedAt: string | null;
}
```
- **Errors**: `400 VERIFICATION_FAILED` ("Code not found in bio"), `429 RATE_LIMITED`.

### `POST /api/student/codechef/sync`
Triggers an on-demand sync of CodeChef data.
- **Response `200 OK`**: Returns updated `CodeChefStatusResponse`.
- **Errors**: `429 RATE_LIMITED` ("Please wait before syncing again").

### `PUT /api/student/codechef/visibility`
Updates visibility on public profile.
- **Request Body**: `{ showPublic: boolean }`
- **Response `200 OK`**: `{ success: true, showPublic: boolean }`

### `DELETE /api/student/codechef`
Disconnects CodeChef account.
- **Response `200 OK`**: `{ success: true, message: "CodeChef account unlinked" }`

---

## 3. Admin Endpoints (`/admin/api/codechef`)

All admin endpoints require `requireAdminAuth` and audit logging.

### `GET /admin/api/codechef/students`
Paginated, server-side filtered and sorted table of student CodeChef accounts.
- **Query Params**:
  - `page`: number (default 1)
  - `limit`: number (default 20, max 100)
  - `search`: string (matches name, rollNo, handle)
  - `year`: number (1-4)
  - `section`: string
  - `minRating`: number
  - `stars`: number (1-7)
  - `status`: string ('CONNECTED' | 'UNVERIFIED' | 'STALE' | 'ERROR')
  - `connected`: boolean
- **Response `200 OK`**:
```typescript
interface AdminCodeChefStudentsResponse {
  students: Array<{
    id: string;
    studentId: string;
    name: string;
    rollNo: string;
    year: number;
    section: string;
    handle: string | null;
    verified: boolean;
    status: 'CONNECTED' | 'UNVERIFIED' | 'STALE' | 'ERROR' | 'NOT_CONNECTED';
    currentRating: number | null;
    stars: number | null;
    totalSolved: number | null;
    totalContests: number | null;
    lastSyncedAt: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `GET /admin/api/codechef/leaderboard`
Top students ranked by rating.
- **Query Params**: `year` (optional), `limit` (default 10, max 50)
- **Response `200 OK`**:
```typescript
interface CodeChefLeaderboardResponse {
  leaderboard: Array<{
    rank: number;
    studentId: string;
    name: string;
    rollNo: string;
    year: number;
    handle: string;
    currentRating: number;
    stars: number;
    totalSolved: number;
    totalContests: number;
  }>;
}
```

### `GET /admin/api/codechef/stats`
Aggregated participation & health metrics.
- **Response `200 OK`**:
```typescript
interface CodeChefAdminStatsResponse {
  totalStudents: number;
  connectedCount: number;
  connectedPercentage: number;
  verifiedCount: number;
  activeThisMonthCount: number;
  staleCount: number;
  errorCount: number;
  starsDistribution: Record<number, number>; // 1-7 stars counts
}
```

### `GET /admin/api/codechef/export`
Streams student CodeChef records as a downloadable CSV file.
- **Headers**: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="codechef_students.csv"`
- Streamed in chunks of 500 rows.

### `GET /admin/api/codechef/students/:studentId`
Admin view of full profile data for a specific student.
- **Response `200 OK`**: Returns `CodeChefDetailsResponse` + student metadata.

### `POST /admin/api/codechef/students/:studentId/resync`
Forces an immediate re-sync of the student's CodeChef account.
- **Response `200 OK`**: `{ success: true, message: "Sync initiated" }`

### `POST /admin/api/codechef/students/:studentId/verify`
Manually marks the student's CodeChef handle as verified.
- **Response `200 OK`**: `{ success: true, verified: true }`

### `DELETE /admin/api/codechef/students/:studentId`
Unlinks the student's CodeChef account.
- **Response `200 OK`**: `{ success: true, message: "Account unlinked by admin" }`

---

## 4. Internal Endpoint (`/api/internal`)

### `POST /api/internal/codechef-sync-tick`
Protected by header `x-sync-secret: <INTERNAL_SYNC_SECRET>`.
- Triggers batch sync of stale accounts (oldest `lastSyncedAt`, >24h old, batch size 10, max concurrency 2).
- **Response `200 OK`**: `{ processed: number, succeeded: number, failed: number }`

---

## 5. Extensions to Existing Endpoints

### 1. `GET /api/student/dashboard`
Extended response object (0 extra queries):
```typescript
// Added to StudentDashboardData:
codechef?: {
  connected: boolean;
  verified: boolean;
  handle: string;
  currentRating: number | null;
  stars: number | null;
  totalSolved: number;
} | null;
```

### 2. `GET /api/public/students/:rollNo`
Extended response object (included only when `codechefAccount.verified === true && codechefAccount.showPublic === true`):
```typescript
// Added to PublicStudentProfile:
codechef?: {
  handle: string;
  currentRating: number | null;
  stars: number | null;
  totalSolved: number;
  totalContests: number;
  globalRank: number | null;
} | null;
```

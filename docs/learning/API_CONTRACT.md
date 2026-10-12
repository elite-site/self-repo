# LearningHub API Contract

## Overview
This document specifies the exact API contracts for LearningHub in the ELITE Portal.
- Student routes are mounted under `/api/student/learning/*` (guarded by `requireStudentAuth`).
- Admin routes are mounted under `/admin/api/learning/*` (guarded by `requireAdminAuth`).
- Feature Flag: All routes are active only when `FEATURE_LEARNINGHUB=true` in `config/env.ts`. When off, routes return HTTP 404 (`{ error: 'NOT_FOUND', message: 'LearningHub is disabled' }`).

---

## 1. Shared Types & Data Models

```typescript
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EnrolmentType = 'OPEN' | 'ASSIGNED_ONLY';
export type LessonType = 'YOUTUBE' | 'LINK' | 'NOTES' | 'QUIZ';
export type TargetType = 'ALL' | 'STUDENT' | 'BATCH';
export type EnrollmentSource = 'SELF' | 'ASSIGNED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED';
export type QuizShowAnswers = 'NEVER' | 'AFTER_SUBMIT' | 'AFTER_DEADLINE';
export type QuizQuestionType = 'SINGLE' | 'MULTI' | 'TRUE_FALSE';

export interface CourseCardSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  category: string | null;
  level: CourseLevel | null;
  estimatedHours: number | null;
  status: CourseStatus;
  enrolment: EnrolmentType;
  featured: boolean;
  dueAt: string | null;
  lessonCount: number;
  totalDurationSec: number;
  // Enrolled student specific (null/undefined if not enrolled)
  isEnrolled?: boolean;
  progressPercent?: number; // 0 - 100
  enrollmentStatus?: EnrollmentStatus;
  isAssigned?: boolean;
}

export interface StudentHistoryItem {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl: string | null;
  completedAt: string | null;
  lastLessonTitle?: string;
  lastLessonId?: string;
  lastAccessedAt: string;
}

export interface StudentDeadlineItem {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  lessonId?: string;
  quizId?: string;
  title: string;
  dueAt: string;
  type: 'COURSE' | 'QUIZ';
}

export interface HomeFeedResponse {
  hero: CourseCardSummary | null;
  rows: {
    continueLearning: CourseCardSummary[];
    assignedToYou: CourseCardSummary[];
    topCourses: CourseCardSummary[];
    newCourses: CourseCardSummary[];
    categories: Array<{
      category: string;
      courses: CourseCardSummary[];
    }>;
    history: StudentHistoryItem[];
  };
}

export interface LessonSummary {
  id: string;
  courseId: string;
  title: string;
  order: number;
  type: LessonType;
  durationSec?: number | null;
  // Student progress
  completed?: boolean;
  secondsWatched?: number;
}

export interface CourseDetailResponse {
  course: CourseCardSummary & {
    lessons: LessonSummary[];
    createdAt: string;
    updatedAt: string;
  };
  enrollment: {
    enrolled: boolean;
    source?: EnrollmentSource;
    status?: EnrollmentStatus;
    completedAt?: string | null;
    progressPercent: number;
  };
}

export interface LessonDetailResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  title: string;
  order: number;
  type: LessonType;
  durationSec: number | null;
  youtubeVideoId: string | null;
  url: string | null;
  notes: string | null;
  quizId: string | null;
  nextLessonId: string | null;
  prevLessonId: string | null;
  progress: {
    completed: boolean;
    secondsWatched: number;
    maxPositionSec: number;
  };
}

export interface QuizQuestionSummary {
  id: string;
  order: number;
  type: QuizQuestionType;
  text: string;
  points: number;
  options: Array<{
    id: string;
    order: number;
    text: string;
  }>;
}

export interface QuizDetailResponse {
  id: string;
  courseId: string;
  lessonId: string;
  opensAt: string | null;
  dueAt: string | null;
  maxAttempts: number;
  timeLimitMin: number | null;
  passPercent: number;
  showAnswers: QuizShowAnswers;
  totalPoints: number;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  questions: QuizQuestionSummary[]; // WITHOUT isCorrect or explanation
}

export interface QuizAttemptResult {
  attemptId: string;
  score: number;
  maxScore: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  answersReview?: Array<{
    questionId: string;
    selectedOptionIds: string[];
    isCorrect?: boolean;
    correctOptionIds?: string[];
    explanation?: string | null;
  }>;
}
```

---

## 2. Student Endpoints (`/api/student/learning/*`)

### 2.1 `GET /api/student/learning/home`
- **Auth**: `requireStudentAuth`
- **Description**: Single-request aggregator for the Netflix-style home page. Max 12 cards per row. Cached (5 min) for public rows ("Top", "New", "Categories"). Under 40 KB.
- **Query**: None
- **Response**: `HomeFeedResponse`

### 2.2 `GET /api/student/learning/courses`
- **Auth**: `requireStudentAuth`
- **Description**: Paginated course directory ("See all").
- **Query Params**:
  - `page` (number, default 1)
  - `limit` (number, default 20, max 100)
  - `category` (string, optional)
  - `level` (BEGINNER | INTERMEDIATE | ADVANCED, optional)
  - `filter` ('all' | 'assigned' | 'in_progress' | 'completed', default 'all')
  - `search` (string, optional)
- **Response**:
```typescript
{
  courses: CourseCardSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 2.3 `GET /api/student/learning/courses/:slugOrId`
- **Auth**: `requireStudentAuth`
- **Description**: Course info, flat lesson list for left sidebar, progress %, enrolment status.
- **Response**: `CourseDetailResponse`

### 2.4 `POST /api/student/learning/courses/:id/enroll`
- **Auth**: `requireStudentAuth`
- **Description**: Enroll current student in an OPEN published course.
- **Response**:
```typescript
{
  success: boolean;
  enrolledAt: string;
  courseId: string;
}
```

### 2.5 `GET /api/student/learning/my-learning`
- **Auth**: `requireStudentAuth`
- **Description**: Student's in-progress courses, completed courses, and upcoming deadlines.
- **Response**:
```typescript
{
  inProgress: CourseCardSummary[];
  completed: CourseCardSummary[];
  deadlines: StudentDeadlineItem[];
}
```

### 2.6 `GET /api/student/learning/lessons/:id`
- **Auth**: `requireStudentAuth`
- **Description**: Lesson details for playback / reading. Checks course accessibility and enrollment.
- **Response**: `LessonDetailResponse`

### 2.7 `POST /api/student/learning/lessons/:id/progress`
- **Auth**: `requireStudentAuth`
- **Description**: Throttled update of lesson progress. Server updates idempotently and strictly moves forward.
- **Request Body**:
```typescript
{
  secondsWatched: number;
  maxPositionSec: number;
  completed?: boolean;
}
```
- **Response**:
```typescript
{
  success: boolean;
  completed: boolean;
  courseProgressPercent: number;
}
```

### 2.8 `GET /api/student/learning/quizzes/:quizId`
- **Auth**: `requireStudentAuth`
- **Description**: Quiz questions and attempt limits. NEVER exposes correct answers or explanations before submit.
- **Response**: `QuizDetailResponse`

### 2.9 `POST /api/student/learning/quizzes/:quizId/start`
- **Auth**: `requireStudentAuth`
- **Description**: Begin a timed attempt. Enforces attempt limits and deadlines using server clock.
- **Response**:
```typescript
{
  attemptId: string;
  startedAt: string;
  timeLimitMin: number | null;
  serverTime: string;
}
```

### 2.10 `POST /api/student/learning/quizzes/:quizId/submit`
- **Auth**: `requireStudentAuth`
- **Description**: Submit answers for grading. Server grades answers, verifies time limits and attempt validity.
- **Request Body**:
```typescript
{
  attemptId: string;
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
  }>;
}
```
- **Response**: `QuizAttemptResult`

### 2.11 `GET /api/student/learning/quizzes/:quizId/attempts`
- **Auth**: `requireStudentAuth`
- **Description**: Get student's previous attempts for this quiz.
- **Response**:
```typescript
{
  attempts: Array<{
    id: string;
    startedAt: string;
    submittedAt: string | null;
    score: number;
    maxScore: number;
    passed: boolean;
  }>;
}
```

---

## 3. Admin Endpoints (`/admin/api/learning/*`)

### 3.1 `GET /admin/api/learning/courses`
- **Auth**: `requireAdminAuth`
- **Query**: `page`, `limit` (max 100), `status`, `search`
- **Response**:
```typescript
{
  courses: Array<CourseCardSummary & {
    enrollmentCount: number;
    completionCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

### 3.2 `POST /admin/api/learning/courses`
- **Auth**: `requireAdminAuth`
- **Audit Log**: Logged via `ActivityService.log`
- **Request Body**:
```typescript
{
  title: string;
  slug?: string;
  description: string;
  thumbnailUrl?: string | null;
  category?: string | null;
  level?: CourseLevel;
  estimatedHours?: number | null;
  status?: CourseStatus; // default DRAFT
  enrolment?: EnrolmentType; // default OPEN
  featured?: boolean;
  dueAt?: string | null;
}
```

### 3.3 `GET /admin/api/learning/courses/:id`
- **Auth**: `requireAdminAuth`
- **Response**: Full course with lessons, targets, quiz associations.

### 3.4 `PUT /admin/api/learning/courses/:id`
- **Auth**: `requireAdminAuth`
- **Audit Log**: Logged via `ActivityService.log`
- **Request Body**: Partial course fields.

### 3.5 `DELETE /admin/api/learning/courses/:id`
- **Auth**: `requireAdminAuth`
- **Audit Log**: Logged via `ActivityService.log`
- **Response**: `{ success: true }`

### 3.6 `POST /admin/api/learning/courses/:id/lessons`
- **Auth**: `requireAdminAuth`
- **Request Body**:
```typescript
{
  title: string;
  type: LessonType;
  order?: number;
  youtubeVideoId?: string;
  url?: string;
  notes?: string;
  durationSec?: number;
}
```

### 3.7 `PUT /admin/api/learning/courses/:id/lessons/:lessonId`
- **Auth**: `requireAdminAuth`
- **Request Body**: Partial lesson fields.

### 3.8 `DELETE /admin/api/learning/courses/:id/lessons/:lessonId`
- **Auth**: `requireAdminAuth`
- **Response**: `{ success: true }`

### 3.9 `PUT /admin/api/learning/courses/:id/lessons/reorder`
- **Auth**: `requireAdminAuth`
- **Request Body**: `{ lessonIds: string[] }`

### 3.10 `POST /admin/api/learning/courses/:id/assign`
- **Auth**: `requireAdminAuth`
- **Audit Log**: Logged via `ActivityService.log`
- **Description**: Assign course to ALL, specific student IDs, or a BATCH (year + section). Dispatches notifications.
- **Request Body**:
```typescript
{
  targetType: 'ALL' | 'STUDENT' | 'BATCH';
  studentIds?: string[];
  year?: number;
  section?: string;
}
```

### 3.11 `GET /admin/api/learning/courses/:id/enrollments`
- **Auth**: `requireAdminAuth`
- **Query**: `page`, `limit` (max 100), `search`, `status`
- **Response**: Paginated student enrolments with progress percentage and completion date.

### 3.12 `POST /admin/api/learning/courses/:id/quizzes`
- **Auth**: `requireAdminAuth`
- **Request Body**:
```typescript
{
  lessonId: string;
  opensAt?: string | null;
  dueAt?: string | null;
  maxAttempts?: number;
  timeLimitMin?: number | null;
  passPercent?: number;
  showAnswers?: QuizShowAnswers;
  questions: Array<{
    order: number;
    type: QuizQuestionType;
    text: string;
    explanation?: string | null;
    points: number;
    options: Array<{
      order: number;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
}
```

### 3.13 `GET /admin/api/learning/courses/:id/quizzes/:quizId`
- **Auth**: `requireAdminAuth`
- **Response**: Full quiz definition with questions, options, and correct answers.

### 3.14 `PUT /admin/api/learning/courses/:id/quizzes/:quizId`
- **Auth**: `requireAdminAuth`
- **Request Body**: Full update of quiz & questions.

### 3.15 `GET /admin/api/learning/reports/overview`
- **Auth**: `requireAdminAuth`
- **Response**:
```typescript
{
  totalCourses: number;
  publishedCourses: number;
  totalEnrolments: number;
  completedEnrolments: number;
  overallCompletionRate: number;
  activeLearnersLast7Days: number;
}
```

### 3.16 `GET /admin/api/learning/reports/courses/:id`
- **Auth**: `requireAdminAuth`
- **Response**: Completion stats, score distribution, student progress list.

### 3.17 `GET /admin/api/learning/reports/courses/:id/export`
- **Auth**: `requireAdminAuth`
- **Response**: Streamed CSV (`text/csv`) generated in batches of 500 records.

### 3.18 `GET /admin/api/learning/youtube/preview`
- **Auth**: `requireAdminAuth`
- **Query**: `url` (string)
- **Response**:
```typescript
{
  videoId: string;
  title: string | null;
  thumbnailUrl: string | null;
  embeddable: boolean;
}
```

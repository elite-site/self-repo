# LearningHub (Springboard-Style LMS & Student Experience)

LearningHub is an integrated course management and learning portal embedded in the ELITE Portal. It provides a Springboard-style flat course curriculum (Course -> Lessons) with a Netflix-style row-based discovery interface on the student portal and administrative course builder, quiz manager, and analytics reporting tools.

---

## 1. Data Model
LearningHub adds 9 core models and 9 enums in PostgreSQL via Prisma:
- **`Course`**: Flat course container (title, slug, description, level, status `DRAFT|PUBLISHED|ARCHIVED`, enrolment `OPEN|ASSIGNED_ONLY`, featured, dueAt).
- **`Lesson`**: Flat ordered items within a course (`order`, `type` in `YOUTUBE`, `LINK`, `NOTES`, `QUIZ`, `youtubeVideoId`, `url`, `notes`, `durationSec`).
- **`CourseTarget`**: Assignment targets for a course (`targetType` `ALL|STUDENT|BATCH`, `studentId`, `year`, `section`).
- **`Enrollment`**: Student enrollment record (`studentId`, `courseId`, `source` `SELF|ASSIGNED`, `status` `ACTIVE|COMPLETED`, `completedAt`, `lastAccessedAt`).
- **`LessonProgress`**: Forward-only student progress (`maxPositionSec`, `secondsWatched`, `completed`, `completedAt`).
- **`Quiz`**: Timed quiz associated 1:1 with a QUIZ lesson (`opensAt`, `dueAt`, `maxAttempts`, `timeLimitMin`, `passPercent`, `showAnswers` `NEVER|AFTER_SUBMIT|AFTER_DEADLINE`).
- **`QuizQuestion`**: Ordered questions (`type` `SINGLE|MULTI|TRUE_FALSE`, `text`, `explanation`, `points`).
- **`QuizOption`**: Options for questions (`text`, `isCorrect`).
- **`QuizAttempt`**: Recorded attempt (`startedAt`, `submittedAt`, `score`, `maxScore`, `answers` json).

---

## 2. Core Flows
1. **Home Feed Aggregator (`GET /api/student/learning/home`)**:
   - Single API call returning Hero course + horizontal rows (Continue learning, Assigned to you, Top courses, New courses, By Category, History).
   - Global rows are cached for 5 minutes via in-memory `TtlCache`.
   - Personal rows are queried per student with lean Prisma `select`.
2. **Progress Tracking**:
   - **Video (YouTube)**: IFrame Player API on `youtube-nocookie.com`. Throttled progress beacons every 30s, on pause/ended, and on unmount/unload via `navigator.sendBeacon`. Lesson marks complete when playback >= 90% of duration.
   - **Notes / Link**: Marks complete upon reading/opening.
   - **Quiz**: Marks complete upon submission. Course marks `COMPLETED` when all lessons are complete.
3. **Quizzes & Anti-Cheating**:
   - Questions and options delivered without `isCorrect` or explanations before submit.
   - Deadlines, attempt counts, and time limits verified strictly on the server against server clock.
   - Answers graded server-side; explanations revealed according to `showAnswers` policy.
4. **Reminders Job**:
   - Schedulers in `jobs/quizReminder.job.ts` scan for pending quizzes due within 24 hours and create notifications.

---

## 3. How to Add a New Lesson Type
1. Add new enum value to `LessonType` in `backend/prisma/schema.prisma` and generate migration.
2. In `backend/src/modules/learning-courses/courses.schemas.ts`, update validation schemas.
3. In `backend/src/modules/learning-progress/progress.service.ts`, implement completion evaluation rule.
4. In `web/src/features/learning/components/LessonSidebar.tsx`, add an icon for the new type.
5. In `web/src/features/learning/pages/LessonPlayerPage.tsx`, add a view component for rendering the lesson content.
6. In `admin-client/src/features/learning/components/LessonListEditor.tsx`, add editor fields.

---

## 4. Environment Variables & Dark Launch
- **Backend Toggle**: `FEATURE_LEARNINGHUB` in `backend/src/config/env.ts` (default `false`). When `false`, all `/api/student/learning/*` and `/admin/api/learning/*` routes immediately return 404.
- **Frontend Toggles**: `VITE_FEATURE_LEARNINGHUB` (default `false`) toggles navigation sidebar visibility.
- **Mock Toggle**: `VITE_LEARNING_MOCK=true` runs frontends with built-in stub fixtures.

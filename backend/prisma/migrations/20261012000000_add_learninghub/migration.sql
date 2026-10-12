-- LearningHub Additive Schema Migration (Generated, Not Applied)
-- Adds Springboard-style LMS courses, lessons, targets, enrollments, progress, and quizzes.

-- 1. Enum modifications (additive)
ALTER TYPE "PortalModule" ADD VALUE IF NOT EXISTS 'LEARNING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEARNING';

-- 2. New Enum Types
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "EnrolmentType" AS ENUM ('OPEN', 'ASSIGNED_ONLY');
CREATE TYPE "LessonType" AS ENUM ('YOUTUBE', 'LINK', 'NOTES', 'QUIZ');
CREATE TYPE "CourseTargetType" AS ENUM ('ALL', 'STUDENT', 'BATCH');
CREATE TYPE "EnrollmentSource" AS ENUM ('SELF', 'ASSIGNED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "QuizShowAnswers" AS ENUM ('NEVER', 'AFTER_SUBMIT', 'AFTER_DEADLINE');
CREATE TYPE "QuizQuestionType" AS ENUM ('SINGLE', 'MULTI', 'TRUE_FALSE');

-- 3. Course Table
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" TEXT,
    "level" "CourseLevel",
    "estimatedHours" DOUBLE PRECISION,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "enrolment" "EnrolmentType" NOT NULL DEFAULT 'OPEN',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- 4. Lesson Table
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "LessonType" NOT NULL DEFAULT 'YOUTUBE',
    "youtubeVideoId" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "durationSec" INTEGER,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- 5. CourseTarget Table
CREATE TABLE "CourseTarget" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "targetType" "CourseTargetType" NOT NULL DEFAULT 'ALL',
    "studentId" TEXT,
    "year" INTEGER,
    "section" TEXT,

    CONSTRAINT "CourseTarget_pkey" PRIMARY KEY ("id")
);

-- 6. Enrollment Table
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "source" "EnrollmentSource" NOT NULL DEFAULT 'SELF',
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- 7. LessonProgress Table
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "maxPositionSec" INTEGER NOT NULL DEFAULT 0,
    "secondsWatched" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- 8. Quiz Table
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "timeLimitMin" INTEGER,
    "passPercent" INTEGER NOT NULL DEFAULT 50,
    "showAnswers" "QuizShowAnswers" NOT NULL DEFAULT 'AFTER_SUBMIT',

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- 9. QuizQuestion Table
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "QuizQuestionType" NOT NULL DEFAULT 'SINGLE',
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- 10. QuizOption Table
CREATE TABLE "QuizOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuizOption_pkey" PRIMARY KEY ("id")
);

-- 11. QuizAttempt Table
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- Indexes & Unique Constraints
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_status_featured_idx" ON "Course"("status", "featured");
CREATE INDEX "Course_category_idx" ON "Course"("category");
CREATE INDEX "Course_createdAt_idx" ON "Course"("createdAt");

CREATE INDEX "Lesson_courseId_order_idx" ON "Lesson"("courseId", "order");

CREATE INDEX "CourseTarget_courseId_idx" ON "CourseTarget"("courseId");
CREATE INDEX "CourseTarget_targetType_year_section_idx" ON "CourseTarget"("targetType", "year", "section");

CREATE UNIQUE INDEX "Enrollment_studentId_courseId_key" ON "Enrollment"("studentId", "courseId");
CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE INDEX "Enrollment_studentId_status_idx" ON "Enrollment"("studentId", "status");
CREATE INDEX "Enrollment_studentId_lastAccessedAt_idx" ON "Enrollment"("studentId", "lastAccessedAt");

CREATE UNIQUE INDEX "LessonProgress_studentId_lessonId_key" ON "LessonProgress"("studentId", "lessonId");
CREATE INDEX "LessonProgress_courseId_studentId_idx" ON "LessonProgress"("courseId", "studentId");
CREATE INDEX "LessonProgress_studentId_updatedAt_idx" ON "LessonProgress"("studentId", "updatedAt");

CREATE UNIQUE INDEX "Quiz_lessonId_key" ON "Quiz"("lessonId");
CREATE INDEX "Quiz_courseId_idx" ON "Quiz"("courseId");

CREATE INDEX "QuizQuestion_quizId_order_idx" ON "QuizQuestion"("quizId", "order");
CREATE INDEX "QuizOption_questionId_order_idx" ON "QuizOption"("questionId", "order");
CREATE INDEX "QuizAttempt_quizId_studentId_idx" ON "QuizAttempt"("quizId", "studentId");

-- Foreign Keys
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseTarget" ADD CONSTRAINT "CourseTarget_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseTarget" ADD CONSTRAINT "CourseTarget_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizOption" ADD CONSTRAINT "QuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

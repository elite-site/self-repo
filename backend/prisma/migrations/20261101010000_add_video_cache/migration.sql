-- Migration B: Add Lesson.driveFileId, VideoCacheStatus enum, VideoCache and VideoLease models
-- Depends on Migration A (VIDEO enum value) being committed first.

-- 1. Add driveFileId to Lesson (server-side only, never returned to clients per SEC-4)
ALTER TABLE "Lesson" ADD COLUMN "driveFileId" TEXT;

-- 2. VideoCacheStatus enum
CREATE TYPE "VideoCacheStatus" AS ENUM ('COPYING', 'READY', 'FAILED');

-- 3. VideoCache model
CREATE TABLE "VideoCache" (
    "id"              TEXT NOT NULL,
    "driveFileId"     TEXT NOT NULL,
    "r2Key"           TEXT NOT NULL,
    "status"          "VideoCacheStatus" NOT NULL DEFAULT 'COPYING',
    "sizeBytes"       BIGINT,
    "md5"             TEXT,
    "claimedAt"       TIMESTAMP(3),
    "lastAccessedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUrlIssuedAt" TIMESTAMP(3),
    "failReason"      TEXT,
    "copyAttempts"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoCache_driveFileId_key" ON "VideoCache"("driveFileId");
CREATE UNIQUE INDEX "VideoCache_r2Key_key" ON "VideoCache"("r2Key");
CREATE INDEX "VideoCache_status_lastAccessedAt_idx" ON "VideoCache"("status", "lastAccessedAt");

-- 4. VideoLease model
CREATE TABLE "VideoLease" (
    "id"        TEXT NOT NULL,
    "cacheId"   TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId"  TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoLease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoLease_studentId_lessonId_key" ON "VideoLease"("studentId", "lessonId");
CREATE INDEX "VideoLease_cacheId_idx" ON "VideoLease"("cacheId");
CREATE INDEX "VideoLease_expiresAt_idx" ON "VideoLease"("expiresAt");

-- 5. Foreign keys
ALTER TABLE "VideoLease" ADD CONSTRAINT "VideoLease_cacheId_fkey"
    FOREIGN KEY ("cacheId") REFERENCES "VideoCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoLease" ADD CONSTRAINT "VideoLease_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CodeChefStatus" AS ENUM ('CONNECTED', 'STALE', 'ERROR');

-- CreateEnum
CREATE TYPE "CodeChefSyncTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'CONNECT', 'ADMIN');

-- CreateEnum
CREATE TYPE "CodeChefSyncLogStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "CodeChefAccount" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifyCode" TEXT,
    "verifyCodeExpiresAt" TIMESTAMP(3),
    "status" "CodeChefStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "showPublic" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "country" TEXT,
    "institution" TEXT,
    "currentRating" DOUBLE PRECISION,
    "maxRating" DOUBLE PRECISION,
    "stars" INTEGER,
    "globalRank" INTEGER,
    "topPercentage" DOUBLE PRECISION,
    "totalSolved" INTEGER,
    "totalContests" INTEGER,
    "totalActiveDays" INTEGER,
    "currentStreak" INTEGER,
    "longestStreak" INTEGER,
    "badgesCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeChefAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeChefProfileData" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "contests" JSONB NOT NULL DEFAULT '[]',
    "heatmap" JSONB NOT NULL DEFAULT '{}',
    "topics" JSONB NOT NULL DEFAULT '[]',
    "difficulty" JSONB NOT NULL DEFAULT '{}',
    "badges" JSONB NOT NULL DEFAULT '[]',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeChefProfileData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeChefSyncLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "trigger" "CodeChefSyncTrigger" NOT NULL,
    "status" "CodeChefSyncLogStatus" NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "apiCalls" INTEGER NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeChefSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeChefAccount_studentId_key" ON "CodeChefAccount"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeChefAccount_handle_key" ON "CodeChefAccount"("handle");

-- CreateIndex
CREATE INDEX "CodeChefAccount_currentRating_idx" ON "CodeChefAccount"("currentRating");

-- CreateIndex
CREATE INDEX "CodeChefAccount_verified_currentRating_idx" ON "CodeChefAccount"("verified", "currentRating");

-- CreateIndex
CREATE INDEX "CodeChefAccount_status_lastSyncedAt_idx" ON "CodeChefAccount"("status", "lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CodeChefProfileData_accountId_key" ON "CodeChefProfileData"("accountId");

-- CreateIndex
CREATE INDEX "CodeChefSyncLog_accountId_startedAt_idx" ON "CodeChefSyncLog"("accountId", "startedAt");

-- AddForeignKey
ALTER TABLE "CodeChefAccount" ADD CONSTRAINT "CodeChefAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeChefProfileData" ADD CONSTRAINT "CodeChefProfileData_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CodeChefAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeChefSyncLog" ADD CONSTRAINT "CodeChefSyncLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CodeChefAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

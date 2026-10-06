-- CreateEnum
CREATE TYPE "GithubSyncStatus" AS ENUM ('IDLE', 'QUEUED', 'RUNNING', 'FAILED');

-- CreateEnum
CREATE TYPE "GithubSyncTrigger" AS ENUM ('CONNECT', 'MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "GithubSyncLogStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED_RATE_LIMIT');

-- CreateEnum
CREATE TYPE "SkillSourceType" AS ENUM ('LANGUAGE', 'DEPENDENCY', 'TOPIC');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubRepoId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "githubReminderSnoozedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GithubAccount" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "githubUserId" BIGINT NOT NULL,
    "login" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "nextSyncAllowedAt" TIMESTAMP(3),
    "syncStatus" "GithubSyncStatus" NOT NULL DEFAULT 'IDLE',
    "syncError" TEXT,
    "manualSyncCountToday" INTEGER NOT NULL DEFAULT 0,
    "manualSyncDay" TIMESTAMP(3),

    CONSTRAINT "GithubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubRepo" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "githubRepoId" BIGINT NOT NULL,
    "fullName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "htmlUrl" TEXT NOT NULL,
    "isFork" BOOLEAN NOT NULL,
    "primaryLanguage" TEXT,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stars" INTEGER NOT NULL DEFAULT 0,
    "githubCreatedAt" TIMESTAMP(3),
    "pushedAt" TIMESTAMP(3),
    "languages" JSONB NOT NULL DEFAULT '{}',
    "dependencies" JSONB NOT NULL DEFAULT '[]',
    "commitCount" INTEGER NOT NULL DEFAULT 0,
    "firstCommitAt" TIMESTAMP(3),
    "lastCommitAt" TIMESTAMP(3),
    "isShowcased" BOOLEAN NOT NULL DEFAULT false,
    "showcaseRank" INTEGER,
    "etag" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedFromGithub" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GithubRepo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillSourceMap" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "sourceType" "SkillSourceType" NOT NULL,
    "ecosystem" TEXT,
    "sourceKey" TEXT NOT NULL,

    CONSTRAINT "SkillSourceMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubStudentSkill" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "repoCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "lastEvidenceAt" TIMESTAMP(3),

    CONSTRAINT "GithubStudentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubSyncLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "trigger" "GithubSyncTrigger" NOT NULL,
    "status" "GithubSyncLogStatus" NOT NULL,
    "reposSeen" INTEGER NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "rateRemaining" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "GithubSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubOAuthState" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "GithubOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubAccount_studentId_key" ON "GithubAccount"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubAccount_githubUserId_key" ON "GithubAccount"("githubUserId");

-- CreateIndex
CREATE INDEX "GithubRepo_studentId_isShowcased_idx" ON "GithubRepo"("studentId", "isShowcased");

-- CreateIndex
CREATE UNIQUE INDEX "GithubRepo_studentId_githubRepoId_key" ON "GithubRepo"("studentId", "githubRepoId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubRepo_studentId_showcaseRank_key" ON "GithubRepo"("studentId", "showcaseRank");

-- CreateIndex
CREATE UNIQUE INDEX "SkillSourceMap_sourceType_ecosystem_sourceKey_key" ON "SkillSourceMap"("sourceType", "ecosystem", "sourceKey");

-- CreateIndex
CREATE INDEX "GithubStudentSkill_studentId_idx" ON "GithubStudentSkill"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubStudentSkill_studentId_skillId_key" ON "GithubStudentSkill"("studentId", "skillId");

-- CreateIndex
CREATE INDEX "GithubSyncLog_studentId_startedAt_idx" ON "GithubSyncLog"("studentId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GithubOAuthState_state_key" ON "GithubOAuthState"("state");

-- CreateIndex
CREATE INDEX "GithubOAuthState_studentId_idx" ON "GithubOAuthState"("studentId");

-- CreateIndex
CREATE INDEX "Project_githubRepoId_idx" ON "Project"("githubRepoId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_githubRepoId_fkey" FOREIGN KEY ("githubRepoId") REFERENCES "GithubRepo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubAccount" ADD CONSTRAINT "GithubAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubRepo" ADD CONSTRAINT "GithubRepo_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillSourceMap" ADD CONSTRAINT "SkillSourceMap_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubStudentSkill" ADD CONSTRAINT "GithubStudentSkill_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubStudentSkill" ADD CONSTRAINT "GithubStudentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubSyncLog" ADD CONSTRAINT "GithubSyncLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubOAuthState" ADD CONSTRAINT "GithubOAuthState_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

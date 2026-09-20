-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubmissionRating" AS ENUM ('GOOD', 'AVERAGE', 'POOR');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'WINNER', 'REJECTED');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('WINNER', 'PARTICIPANT_THANKYOU');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('SUCCESS', 'WARNING', 'ERROR', 'INFO');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 2026,
    "status" "EventStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL DEFAULT 'self-introduction-2026',
    "name" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNo" TEXT,
    "photo1DriveId" TEXT,
    "photo2DriveId" TEXT,
    "photo3DriveId" TEXT,
    "videoDriveId" TEXT,
    "audioDriveId" TEXT,
    "mediaType" TEXT,
    "driveFolderPath" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rating" "SubmissionRating",
    "ratedAt" TIMESTAMP(3),
    "reviewText" TEXT,
    "reviewPros" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewCons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'IT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL DEFAULT 'photography-2026',
    "submissionId" TEXT NOT NULL,
    "templateType" "EmailTemplateType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveFolderCache" (
    "id" TEXT NOT NULL,
    "pathKey" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,

    CONSTRAINT "DriveFolderCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL DEFAULT 'photo-2026',
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "userEmail" TEXT,
    "applicantName" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Submission_eventId_rollNo_idx" ON "Submission"("eventId", "rollNo");

-- CreateIndex
CREATE INDEX "Submission_eventId_branch_section_year_idx" ON "Submission"("eventId", "branch", "section", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_eventId_rollNo_year_branch_section_key" ON "Submission"("eventId", "rollNo", "year", "branch", "section");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNo_key" ON "Student"("rollNo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_name_idx" ON "Student"("name");

-- CreateIndex
CREATE INDEX "Student_section_year_idx" ON "Student"("section", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNo_year_section_key" ON "Student"("rollNo", "year", "section");

-- CreateIndex
CREATE UNIQUE INDEX "DriveFolderCache_pathKey_key" ON "DriveFolderCache"("pathKey");

-- CreateIndex
CREATE INDEX "ActivityLog_eventId_createdAt_idx" ON "ActivityLog"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_category_status_idx" ON "ActivityLog"("category", "status");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

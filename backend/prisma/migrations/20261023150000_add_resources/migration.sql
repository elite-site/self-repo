-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('NOTES', 'PPT', 'QUESTION_PAPER', 'LAB_MANUAL', 'SYLLABUS', 'OTHER');

-- AlterEnum
ALTER TYPE "PortalModule" ADD VALUE IF NOT EXISTS 'RESOURCES';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "semester" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL DEFAULT 'NOTES',
    "drive_link" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "resources_semester_idx" ON "resources"("semester");
CREATE INDEX IF NOT EXISTS "resources_year_semester_idx" ON "resources"("year", "semester");
CREATE INDEX IF NOT EXISTS "resources_subject_idx" ON "resources"("subject");
CREATE INDEX IF NOT EXISTS "resources_type_idx" ON "resources"("type");
CREATE INDEX IF NOT EXISTS "resources_created_at_idx" ON "resources"("created_at" DESC);

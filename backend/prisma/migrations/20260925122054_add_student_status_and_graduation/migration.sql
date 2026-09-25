-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'GRADUATED');

-- DropIndex
DROP INDEX "Student_rollNo_year_section_key";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "graduatedAt" TIMESTAMP(3),
ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");


-- Public visibility + admin change-request tracking for introduction videos.
-- A video is only shown on the public showcase once it is APPROVED and published.
ALTER TABLE "IntroVideo" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "changeRequestedAt" TIMESTAMP(3),
ADD COLUMN     "changeRequestNote" TEXT;

-- CreateIndex
CREATE INDEX "IntroVideo_isPublic_status_idx" ON "IntroVideo"("isPublic", "status");

-- Videos that are already APPROVED stay listed publicly after this migration.
UPDATE "IntroVideo" SET "isPublic" = true, "publishedAt" = NOW()
WHERE "status" = 'APPROVED' AND "driveFileId" IS NOT NULL;

-- AlterTable
ALTER TABLE "GithubRepo" ADD COLUMN "readmeExcerpt" TEXT,
ADD COLUMN "readmeFetchedAt" TIMESTAMP(3);

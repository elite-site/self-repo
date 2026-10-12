-- Add HackerRank and Codeforces links to StudentProfile
ALTER TABLE "StudentProfile" ADD COLUMN "hackerrankUrl" TEXT,
ADD COLUMN "codeforcesUrl" TEXT;

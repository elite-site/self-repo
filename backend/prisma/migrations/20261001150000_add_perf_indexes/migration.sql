-- Performance indexes for hot query paths
-- Resume: student list sorted by submission date, public profile filtered by visibility+status
CREATE INDEX IF NOT EXISTS "Resume_studentId_submittedAt_idx" ON "Resume"("studentId", "submittedAt");
CREATE INDEX IF NOT EXISTS "Resume_isPublic_status_idx" ON "Resume"("isPublic", "status");

-- Certificate: student list sorted by issue date, public profile filtered by visibility+status
CREATE INDEX IF NOT EXISTS "Certificate_studentId_issuedAt_idx" ON "Certificate"("studentId", "issuedAt");
CREATE INDEX IF NOT EXISTS "Certificate_isPublic_status_idx" ON "Certificate"("isPublic", "status");

-- Achievement: student list sorted by achieved date
CREATE INDEX IF NOT EXISTS "Achievement_studentId_achievedAt_idx" ON "Achievement"("studentId", "achievedAt");

-- Announcement scheduler: due items filtered by status + scheduled time
CREATE INDEX IF NOT EXISTS "Announcement_status_scheduledAt_idx" ON "Announcement"("status", "scheduledAt");

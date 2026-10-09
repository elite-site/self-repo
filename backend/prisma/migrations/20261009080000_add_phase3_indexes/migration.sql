-- Phase 3 additive indexes for relations and search optimization

-- Vote: index by voterId for fast lookups of voter activity
CREATE INDEX IF NOT EXISTS "Vote_voterId_idx" ON "Vote"("voterId");

-- VotingCandidate: index by studentId for fast lookup of candidate nominations
CREATE INDEX IF NOT EXISTS "VotingCandidate_studentId_idx" ON "VotingCandidate"("studentId");

-- Team: index by leaderId for leader queries
CREATE INDEX IF NOT EXISTS "Team_leaderId_idx" ON "Team"("leaderId");

-- SkillSourceMap: index by skillId for reverse skill lookups
CREATE INDEX IF NOT EXISTS "SkillSourceMap_skillId_idx" ON "SkillSourceMap"("skillId");

-- GithubStudentSkill: index by skillId for skill aggregation
CREATE INDEX IF NOT EXISTS "GithubStudentSkill_skillId_idx" ON "GithubStudentSkill"("skillId");

-- RoleAssignment: index by roleId for role membership checks
CREATE INDEX IF NOT EXISTS "RoleAssignment_roleId_idx" ON "RoleAssignment"("roleId");

-- GithubAccount: composite index on syncStatus and lastSyncedAt for background scheduler queries
CREATE INDEX IF NOT EXISTS "GithubAccount_syncStatus_lastSyncedAt_idx" ON "GithubAccount"("syncStatus", "lastSyncedAt");

-- EmailLog: indexed by eventId (filtering/deletion) and sentAt (history ordering)
CREATE INDEX IF NOT EXISTS "EmailLog_eventId_idx" ON "EmailLog"("eventId");
CREATE INDEX IF NOT EXISTS "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- EmailAutomationRun: indexed by automationId (foreign key) and runAt (history ordering)
CREATE INDEX IF NOT EXISTS "EmailAutomationRun_automationId_idx" ON "EmailAutomationRun"("automationId");
CREATE INDEX IF NOT EXISTS "EmailAutomationRun_runAt_idx" ON "EmailAutomationRun"("runAt");

-- ActivityLog: index by createdAt for date-bounded log queries and exports
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- Raw SQL: Enable pg_trgm extension for fast trigram text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Raw SQL: Trigram index on Student.email for fast ILIKE '%term%' lookups
CREATE INDEX IF NOT EXISTS "Student_email_trgm_idx" ON "Student" USING gin ("email" gin_trgm_ops);

-- Raw SQL: Trigram index on Skill.name for fast ILIKE '%term%' search
CREATE INDEX IF NOT EXISTS "Skill_name_trgm_idx" ON "Skill" USING gin ("name" gin_trgm_ops);

-- Raw SQL: Expression index on lower("name") for case-insensitive exact and prefix matches
CREATE INDEX IF NOT EXISTS "Skill_name_lower_idx" ON "Skill" (lower("name"));

-- Add index on GithubSyncLog(startedAt) for retention cleanup query
CREATE INDEX IF NOT EXISTS "GithubSyncLog_startedAt_idx" ON "GithubSyncLog"("startedAt");

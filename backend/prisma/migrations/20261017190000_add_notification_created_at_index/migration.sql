-- Add index on Notification(createdAt) for retention cleanup queries
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

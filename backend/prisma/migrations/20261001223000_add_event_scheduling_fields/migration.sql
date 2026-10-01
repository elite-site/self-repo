-- The admin event wizard collected a description, type, registration window,
-- event date, eligibility rules, team constraints and notification preferences,
-- but the Event table had no columns for any of them. Every value an admin
-- entered was accepted by the form and then dropped on the floor.
--
-- All columns are additive and nullable or defaulted, so existing events keep
-- working and no backfill is required.

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "registrationStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "registrationEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "eventDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "eligibilityYears" INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "minCompletion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "teamEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "teamMin" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "teamMax" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "notifyOnOpen" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyReminder" BOOLEAN NOT NULL DEFAULT true;

-- The admin events table sorts and filters on status, and the public events
-- list filters on status plus registration window to decide what is open.
CREATE INDEX IF NOT EXISTS "Event_status_idx" ON "Event"("status");
CREATE INDEX IF NOT EXISTS "Event_status_registrationEnd_idx" ON "Event"("status", "registrationEnd");
-- Migration A: Add VIDEO value to LessonType enum
-- PostgreSQL requires ADD VALUE to be committed in its own transaction
-- before any other statement can reference the new enum value.
-- This must stay in a separate migration from the VideoCache tables.
ALTER TYPE "LessonType" ADD VALUE 'VIDEO';

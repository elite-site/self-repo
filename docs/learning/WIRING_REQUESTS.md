# Wiring Requests Log

This file tracks shared configuration, route registration, and wiring requests from WEB, ADMIN, and BACKEND agents to be processed by CONNECTIONS.

## Initial Wiring State (Foundation Commit)
- [x] Prisma Schema updated with Course, Lesson, CourseTarget, Enrollment, LessonProgress, Quiz, QuizQuestion, QuizOption, QuizAttempt and relations
- [x] Migration SQL generated in `backend/prisma/migrations/20261012000000_add_learninghub/migration.sql` (unapplied)
- [x] `FEATURE_LEARNINGHUB` added to `backend/src/config/env.ts` (default false)
- [x] Initial stub API clients created in `web/src/features/learning/api` and `admin-client/src/features/learning/api`

## Agent Requests
(None pending)

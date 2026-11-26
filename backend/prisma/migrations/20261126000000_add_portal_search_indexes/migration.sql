-- Extends the pg_trgm search-index convention started in
-- 20261003083000_add_search_indexes to all portal content tables.
--
-- Trigram GIN indexes make ILIKE '%term%' (Prisma `contains`, mode
-- 'insensitive') fast on the columns the portal-wide search matches against,
-- so searching courses, lessons, projects, resumes, resources, events,
-- achievements, certificates, GitHub repos, and announcements avoids
-- sequential scans.

-- pg_trgm is idempotent; already enabled by 20261003083000_add_search_indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Course: title + description + category
CREATE INDEX IF NOT EXISTS "Course_title_trgm_idx"
  ON "Course" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_description_trgm_idx"
  ON "Course" USING gin ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_category_trgm_idx"
  ON "Course" USING gin ("category" gin_trgm_ops);

-- Lesson: title
CREATE INDEX IF NOT EXISTS "Lesson_title_trgm_idx"
  ON "Lesson" USING gin ("title" gin_trgm_ops);

-- Project: title + description + technologies array
CREATE INDEX IF NOT EXISTS "Project_title_trgm_idx"
  ON "Project" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Project_description_trgm_idx"
  ON "Project" USING gin ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Project_technologies_gin_idx"
  ON "Project" USING gin ("technologies");

-- Resume: filename (resumes have no title; filename is the searchable label)
CREATE INDEX IF NOT EXISTS "Resume_filename_trgm_idx"
  ON "Resume" USING gin ("filename" gin_trgm_ops);

-- Resource (mapped to "resources" table): title + subject
CREATE INDEX IF NOT EXISTS "Resource_title_trgm_idx"
  ON "resources" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Resource_subject_trgm_idx"
  ON "resources" USING gin ("subject" gin_trgm_ops);

-- Event: name + description
CREATE INDEX IF NOT EXISTS "Event_name_trgm_idx"
  ON "Event" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Event_description_trgm_idx"
  ON "Event" USING gin ("description" gin_trgm_ops);

-- Achievement: title + description
CREATE INDEX IF NOT EXISTS "Achievement_title_trgm_idx"
  ON "Achievement" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Achievement_description_trgm_idx"
  ON "Achievement" USING gin ("description" gin_trgm_ops);

-- Certificate: title + issuer
CREATE INDEX IF NOT EXISTS "Certificate_title_trgm_idx"
  ON "Certificate" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Certificate_issuer_trgm_idx"
  ON "Certificate" USING gin ("issuer" gin_trgm_ops);

-- GithubRepo: name + description
CREATE INDEX IF NOT EXISTS "GithubRepo_name_trgm_idx"
  ON "GithubRepo" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "GithubRepo_description_trgm_idx"
  ON "GithubRepo" USING gin ("description" gin_trgm_ops);

-- Announcement: title
CREATE INDEX IF NOT EXISTS "Announcement_title_trgm_idx"
  ON "Announcement" USING gin ("title" gin_trgm_ops);

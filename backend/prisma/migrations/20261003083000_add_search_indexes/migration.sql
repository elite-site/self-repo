-- Enable pg_trgm for trigram similarity (powers fast ILIKE '%term%' searches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on Student.name — makes name ILIKE '%term%' fast
CREATE INDEX IF NOT EXISTS "Student_name_trgm_idx"
  ON "Student" USING gin ("name" gin_trgm_ops);

-- GIN trigram index on Student.rollNo — makes rollNo ILIKE '%term%' fast
CREATE INDEX IF NOT EXISTS "Student_rollNo_trgm_idx"
  ON "Student" USING gin ("rollNo" gin_trgm_ops);

-- Composite B-tree index for the common directory filter (status + year + section)
CREATE INDEX IF NOT EXISTS "Student_status_year_section_idx"
  ON "Student" ("status", "year", "section");

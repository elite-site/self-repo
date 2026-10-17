-- Drop redundant left-prefix indexes covered by wider composite indexes

-- Student: status is a strict left prefix of (status, year, section)
DROP INDEX IF EXISTS "Student_status_idx";

-- Achievement: studentId is a strict left prefix of (studentId, achievedAt)
DROP INDEX IF EXISTS "Achievement_studentId_idx";

-- Certificate: studentId is a strict left prefix of (studentId, issuedAt)
DROP INDEX IF EXISTS "Certificate_studentId_idx";

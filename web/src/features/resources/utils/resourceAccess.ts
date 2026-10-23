export type SemesterAccessRule = 'CURRENT_YEAR_AND_EARLIER' | 'CURRENT_YEAR_ONLY';

// Keep the rule in a single config constant so it can be easily changed to 'CURRENT_YEAR_ONLY'
export const RESOURCE_SEMESTER_ACCESS_RULE: SemesterAccessRule = 'CURRENT_YEAR_AND_EARLIER';

export interface StudentYearSemesterInput {
  year?: number | null;
  semester?: number | null;
}

/**
 * Returns allowed semesters for a student.
 * Access rule: A student can see their CURRENT year's semesters and all EARLIER semesters
 * (read-only revision access), and NEVER future semesters.
 */
export function getAllowedSemesters(student: StudentYearSemesterInput): number[] {
  const rawYear = Number(student?.year);
  let year = Number.isInteger(rawYear) && rawYear >= 1 && rawYear <= 4 ? rawYear : null;

  if (!year && student?.semester) {
    const sem = Number(student.semester);
    if (Number.isInteger(sem) && sem >= 1 && sem <= 8) {
      year = Math.ceil(sem / 2);
    }
  }

  const effectiveYear = Math.min(4, Math.max(1, year || 1));

  if (RESOURCE_SEMESTER_ACCESS_RULE === 'CURRENT_YEAR_ONLY') {
    return [(effectiveYear * 2) - 1, effectiveYear * 2];
  }

  // Revision access up to current year
  const maxSemester = Math.min(8, effectiveYear * 2);
  const semesters: number[] = [];
  for (let s = 1; s <= maxSemester; s++) {
    semesters.push(s);
  }
  return semesters;
}

export function getCurrentSemester(student: StudentYearSemesterInput): number {
  if (student?.semester) {
    const sem = Number(student.semester);
    if (Number.isInteger(sem) && sem >= 1 && sem <= 8) {
      return sem;
    }
  }
  const rawYear = Number(student?.year);
  const effectiveYear = Math.min(4, Math.max(1, Number.isInteger(rawYear) ? rawYear : 1));
  return (effectiveYear * 2) - 1;
}

/**
 * Configuration and access rule for study resources.
 * Set to 'CURRENT_YEAR_AND_EARLIER' to allow students revision access to past semesters,
 * or change to 'CURRENT_YEAR_ONLY' to restrict strictly to current year semesters.
 */
export type SemesterAccessRule = 'CURRENT_YEAR_AND_EARLIER' | 'CURRENT_YEAR_ONLY';

export const RESOURCE_SEMESTER_ACCESS_RULE: SemesterAccessRule = 'CURRENT_YEAR_AND_EARLIER';

export const VALID_RESOURCE_TYPES = [
  'NOTES',
  'PPT',
  'QUESTION_PAPER',
  'LAB_MANUAL',
  'SYLLABUS',
  'OTHER',
] as const;

export type ValidResourceType = (typeof VALID_RESOURCE_TYPES)[number];

export interface StudentYearSemesterInput {
  year?: number | null;
  semester?: number | null;
}

/**
 * Single source of truth helper function to compute allowed semesters for a student.
 * 
 * Access rule:
 * Under 'CURRENT_YEAR_AND_EARLIER':
 * - Year 1: Sem 1, 2
 * - Year 2: Sem 1, 2, 3, 4
 * - Year 3: Sem 1, 2, 3, 4, 5, 6
 * - Year 4: Sem 1, 2, 3, 4, 5, 6, 7, 8
 * 
 * Under 'CURRENT_YEAR_ONLY':
 * - Year 1: Sem 1, 2
 * - Year 2: Sem 3, 4
 * - Year 3: Sem 5, 6
 * - Year 4: Sem 7, 8
 * 
 * Future semesters are strictly disallowed.
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

  // Fallback to 1st year if indeterminate
  const effectiveYear = Math.min(4, Math.max(1, year || 1));

  if (RESOURCE_SEMESTER_ACCESS_RULE === 'CURRENT_YEAR_ONLY') {
    return [(effectiveYear * 2) - 1, effectiveYear * 2];
  }

  // Revision access: current year's semesters and all earlier semesters
  const maxSemester = Math.min(8, effectiveYear * 2);
  const semesters: number[] = [];
  for (let s = 1; s <= maxSemester; s++) {
    semesters.push(s);
  }
  return semesters;
}

/**
 * Computes the student's current active semester.
 * Uses student.semester if explicitly stored, otherwise defaults to the first semester of the academic year.
 */
export function getCurrentSemester(student: StudentYearSemesterInput): number {
  if (student?.semester) {
    const sem = Number(student.semester);
    if (Number.isInteger(sem) && sem >= 1 && sem <= 8) {
      return sem;
    }
  }
  const rawYear = Number(student?.year);
  const effectiveYear = Math.min(4, Math.max(1, Number.isInteger(rawYear) ? rawYear : 1));
  return (effectiveYear * 2) - 1; // e.g. Year 1 -> Sem 1, Year 2 -> Sem 3, Year 3 -> Sem 5, Year 4 -> Sem 7
}

/**
 * Validates whether a given URL is a valid Google Drive URL.
 * Accepts drive.google.com and docs.google.com domains.
 */
export function isGoogleDriveUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return host === 'drive.google.com' || host === 'docs.google.com';
  } catch {
    return false;
  }
}

/**
 * Parses Google Drive links and returns direct, preview, and download URLs.
 */
export function formatDriveLinks(driveLink: string): {
  driveLink: string;
  previewUrl: string;
  downloadUrl: string;
} {
  const link = driveLink.trim();
  
  // File match: /file/d/<fileId>/... or ?id=<fileId>
  const fileIdMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    return {
      driveLink: link,
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  // Folder match: /folders/<folderId>
  const folderMatch = link.match(/\/folders\/([a-zA-Z0-9_-]+)/i);
  if (folderMatch && folderMatch[1]) {
    return {
      driveLink: link,
      previewUrl: link,
      downloadUrl: link,
    };
  }

  // Docs / Sheets / Slides
  if (link.includes('docs.google.com/presentation') || link.includes('docs.google.com/document') || link.includes('docs.google.com/spreadsheets')) {
    const baseUrl = link.replace(/\/edit.*$/, '').replace(/\/view.*$/, '');
    return {
      driveLink: link,
      previewUrl: `${baseUrl}/preview`,
      downloadUrl: `${baseUrl}/export?format=pdf`,
    };
  }

  return {
    driveLink: link,
    previewUrl: link,
    downloadUrl: link,
  };
}

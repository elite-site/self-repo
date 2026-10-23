import { ValidationError } from '../../utils/appError';
import { isGoogleDriveUrl, VALID_RESOURCE_TYPES } from './resources.constants';
import type { CreateResourcePayload, UpdateResourcePayload, ResourceType } from './resources.types';

function normalizeResourceType(raw: any): ResourceType | null {
  if (!raw || typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (VALID_RESOURCE_TYPES.includes(upper as any)) {
    return upper as ResourceType;
  }
  // Also support aliases (e.g. "notes" -> "NOTES", "question_paper" -> "QUESTION_PAPER")
  const snake = upper.replace(/\s+/g, '_');
  if (VALID_RESOURCE_TYPES.includes(snake as any)) {
    return snake as ResourceType;
  }
  return null;
}

export function validateStudentResourcesQuery(query: any): {
  semester?: number;
  type?: ResourceType;
  search?: string;
} {
  const result: { semester?: number; type?: ResourceType; search?: string } = {};

  if (query.semester !== undefined && query.semester !== null && query.semester !== '') {
    const sem = Number(query.semester);
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
      throw new ValidationError('Semester must be an integer between 1 and 8', [
        { field: 'semester', message: 'Semester must be between 1 and 8' },
      ]);
    }
    result.semester = sem;
  }

  if (query.type) {
    const normalized = normalizeResourceType(query.type);
    if (!normalized) {
      throw new ValidationError(`Invalid resource type. Allowed types: ${VALID_RESOURCE_TYPES.join(', ')}`, [
        { field: 'type', message: `Invalid resource type` },
      ]);
    }
    result.type = normalized;
  }

  if (typeof query.search === 'string' && query.search.trim()) {
    result.search = query.search.trim();
  }

  return result;
}

export function validateCreateResourceInput(body: any): CreateResourcePayload {
  const details: { field: string; message: string }[] = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    details.push({ field: 'title', message: 'Title is required' });
  }

  const rawYear = Number(body.year);
  if (!Number.isInteger(rawYear) || rawYear < 1 || rawYear > 4) {
    details.push({ field: 'year', message: 'Year must be an integer between 1 and 4' });
  }

  const rawSem = Number(body.semester);
  if (!Number.isInteger(rawSem) || rawSem < 1 || rawSem > 8) {
    details.push({ field: 'semester', message: 'Semester must be an integer between 1 and 8' });
  }

  // Cross-check: semester should correspond to year (sem 1-2 for year 1, etc.)
  if (Number.isInteger(rawYear) && Number.isInteger(rawSem)) {
    const expectedYear = Math.ceil(rawSem / 2);
    if (expectedYear !== rawYear) {
      details.push({
        field: 'semester',
        message: `Semester ${rawSem} belongs to Year ${expectedYear}, but Year ${rawYear} was specified`,
      });
    }
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  if (!subject) {
    details.push({ field: 'subject', message: 'Subject is required' });
  }

  const type = normalizeResourceType(body.type);
  if (!type) {
    details.push({
      field: 'type',
      message: `Type must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
    });
  }

  const driveLink = typeof body.drive_link === 'string' ? body.drive_link.trim() : (typeof body.driveLink === 'string' ? body.driveLink.trim() : '');
  if (!driveLink) {
    details.push({ field: 'drive_link', message: 'Google Drive link is required' });
  } else if (!isGoogleDriveUrl(driveLink)) {
    details.push({
      field: 'drive_link',
      message: 'Drive link must be a valid Google Drive or Google Docs URL (drive.google.com or docs.google.com)',
    });
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed for resource creation', details);
  }

  return {
    title,
    year: rawYear,
    semester: rawSem,
    subject,
    type: type!,
    drive_link: driveLink,
    driveLink,
  };
}

export function validateUpdateResourceInput(body: any): UpdateResourcePayload {
  const details: { field: string; message: string }[] = [];
  const result: UpdateResourcePayload = {};

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      details.push({ field: 'title', message: 'Title cannot be empty' });
    }
    result.title = title;
  }

  if (body.year !== undefined) {
    const rawYear = Number(body.year);
    if (!Number.isInteger(rawYear) || rawYear < 1 || rawYear > 4) {
      details.push({ field: 'year', message: 'Year must be between 1 and 4' });
    }
    result.year = rawYear;
  }

  if (body.semester !== undefined) {
    const rawSem = Number(body.semester);
    if (!Number.isInteger(rawSem) || rawSem < 1 || rawSem > 8) {
      details.push({ field: 'semester', message: 'Semester must be between 1 and 8' });
    }
    result.semester = rawSem;
  }

  if (result.year !== undefined && result.semester !== undefined) {
    const expectedYear = Math.ceil(result.semester / 2);
    if (expectedYear !== result.year) {
      details.push({
        field: 'semester',
        message: `Semester ${result.semester} belongs to Year ${expectedYear}, not Year ${result.year}`,
      });
    }
  }

  if (body.subject !== undefined) {
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    if (!subject) {
      details.push({ field: 'subject', message: 'Subject cannot be empty' });
    }
    result.subject = subject;
  }

  if (body.type !== undefined) {
    const type = normalizeResourceType(body.type);
    if (!type) {
      details.push({
        field: 'type',
        message: `Type must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
      });
    }
    result.type = type!;
  }

  const rawLink = body.drive_link !== undefined ? body.drive_link : body.driveLink;
  if (rawLink !== undefined) {
    const driveLink = typeof rawLink === 'string' ? rawLink.trim() : '';
    if (!driveLink) {
      details.push({ field: 'drive_link', message: 'Drive link cannot be empty' });
    } else if (!isGoogleDriveUrl(driveLink)) {
      details.push({
        field: 'drive_link',
        message: 'Drive link must be a valid Google Drive or Google Docs URL (drive.google.com or docs.google.com)',
      });
    }
    result.drive_link = driveLink;
    result.driveLink = driveLink;
  }

  if (details.length > 0) {
    throw new ValidationError('Validation failed for resource update', details);
  }

  return result;
}

import { AppError } from '../../utils/appError';

const SAFE_LINK_RE = /^https?:\/\/[^\s<>"'`\\]+$/i;

export function assertSafeLink(field: string, value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (!SAFE_LINK_RE.test(raw)) {
    throw new AppError('VALIDATION_ERROR', `${field} must be an absolute http:// or https:// link.`, 400, 'profile.schema:assertSafeLink');
  }
  return raw;
}

export interface ProfileUpdateInput {
  bioText?: string;
  specialQualities?: string;
  normalizedLinks: Record<string, string>;
}

export function validateProfileUpdate(body: any): ProfileUpdateInput {
  const { biography, bio, specialQualities } = body || {};
  const bioText = bio !== undefined ? bio : (biography !== undefined ? biography : undefined);
  if (bioText && typeof bioText === 'string' && bioText.length > 300) {
    throw new AppError('VALIDATION_ERROR', 'Biography max 300 chars', 400, 'profile.schema:validateProfileUpdate');
  }
  if (specialQualities !== undefined && typeof specialQualities === 'string' && specialQualities.length > 300) {
    throw new AppError('VALIDATION_ERROR', 'Special qualities max 300 chars', 400, 'profile.schema:validateProfileUpdate');
  }

  const linkFields = ['githubUrl', 'linkedinUrl', 'leetcodeUrl', 'codechefUrl', 'portfolioUrl'] as const;
  const normalizedLinks: Record<string, string> = {};
  for (const field of linkFields) {
    if (body?.[field] === undefined) continue;
    normalizedLinks[field] = assertSafeLink(field, body[field]);
  }

  return { bioText, specialQualities, normalizedLinks };
}

export interface PhotoUploadInput {
  file: Express.Multer.File;
  photoOffsetX?: number;
  photoOffsetY?: number;
  photoZoom?: number;
}

export function validatePhotoUpload(file?: Express.Multer.File, body?: any): PhotoUploadInput {
  if (!file) {
    throw new AppError('VALIDATION_ERROR', 'No file', 400, 'profile.schema:validatePhotoUpload');
  }
  const rawOffsetX = body?.photoOffsetX != null ? parseFloat(body.photoOffsetX) : undefined;
  const rawOffsetY = body?.photoOffsetY != null ? parseFloat(body.photoOffsetY) : undefined;
  const rawZoom = body?.photoZoom != null ? parseFloat(body.photoZoom) : undefined;

  const photoOffsetX = rawOffsetX !== undefined && !isNaN(rawOffsetX) ? rawOffsetX : undefined;
  const photoOffsetY = rawOffsetY !== undefined && !isNaN(rawOffsetY) ? rawOffsetY : undefined;
  const photoZoom = rawZoom !== undefined && !isNaN(rawZoom) ? rawZoom : undefined;

  return { file, photoOffsetX, photoOffsetY, photoZoom };
}

export interface SkillsPayloadInput {
  skillIds?: string[];
  skillNames?: string[];
}

export function validateSkillsPayload(body: any): SkillsPayloadInput {
  const { skillIds, skillNames } = body || {};
  if (skillIds !== undefined && !Array.isArray(skillIds)) {
    throw new AppError('VALIDATION_ERROR', 'skillIds must be an array', 400, 'profile.schema:validateSkillsPayload');
  }
  if (skillNames !== undefined && !Array.isArray(skillNames)) {
    throw new AppError('VALIDATION_ERROR', 'skillNames must be an array', 400, 'profile.schema:validateSkillsPayload');
  }
  return { skillIds, skillNames };
}

export interface ChangeRequestInput {
  fieldName?: string;
  currentValue?: string;
  requestedValue: string;
  reason?: string;
  type?: string;
}

export function validateChangeRequestPayload(body: any): ChangeRequestInput {
  const { fieldName, currentValue, requestedValue, reason, type } = body || {};
  if (!requestedValue || typeof requestedValue !== 'string' || !requestedValue.trim()) {
    throw new AppError('VALIDATION_ERROR', 'requestedValue is required', 400, 'profile.schema:validateChangeRequestPayload');
  }
  return {
    fieldName: typeof fieldName === 'string' ? fieldName.trim() : fieldName,
    currentValue: typeof currentValue === 'string' ? currentValue.trim() : currentValue,
    requestedValue: requestedValue.trim(),
    reason: typeof reason === 'string' ? reason.trim() : reason,
    type: typeof type === 'string' ? type.trim() : type,
  };
}

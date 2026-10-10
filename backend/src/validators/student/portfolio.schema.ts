import { AppError } from '../../utils/appError';

export const SAFE_LINK_RE = /^https?:\/\/[^\s<>"'`\\]+$/i;

export function assertSafeLink(field: string, value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (!SAFE_LINK_RE.test(raw)) {
    throw new AppError('VALIDATION_ERROR', `${field} must be an absolute http:// or https:// link.`, 400, 'portfolio.schema:assertSafeLink');
  }
  return raw;
}

export function validateCreateProjectInput(body: any) {
  const { title, description, techStack, technologies, githubUrl, videoUrl, driveVideoUrl } = body || {};
  const validatedGithubUrl = githubUrl ? assertSafeLink('githubUrl', githubUrl) : '';
  const finalVideoUrl = videoUrl || driveVideoUrl;
  const validatedVideoUrl = finalVideoUrl ? assertSafeLink('videoUrl', finalVideoUrl) : null;

  return {
    title,
    description,
    technologies: techStack || technologies || [],
    githubUrl: validatedGithubUrl || null,
    driveVideoUrl: validatedVideoUrl || null,
  };
}

export function validateReorderProjectsInput(body: any): string[] {
  const { ids } = body || {};
  if (!Array.isArray(ids)) {
    throw new AppError('INVALID_INPUT', 'ids must be an array', 400, 'portfolio.schema:validateReorderProjectsInput');
  }
  return ids;
}

export function validateUpdateProjectInput(body: any) {
  const { title, description, techStack, technologies, githubUrl, videoUrl, driveVideoUrl } = body || {};
  const updateData: any = {
    title,
    description,
    technologies: techStack || technologies || undefined,
    status: 'PENDING',
    isPublic: false,
    reviewNote: null,
  };

  if (githubUrl !== undefined) {
    updateData.githubUrl = githubUrl ? assertSafeLink('githubUrl', githubUrl) : null;
  }

  const finalVideoUrl = videoUrl || driveVideoUrl;
  if (finalVideoUrl !== undefined) {
    updateData.driveVideoUrl = finalVideoUrl ? assertSafeLink('videoUrl', finalVideoUrl) : null;
  }

  return updateData;
}

export function validateCreateAchievementInput(body: any) {
  const { title, description, date, achievedAt, organization, organizationName, categoryId, proofDriveId, proofUrl } = body || {};
  if (!title || !title.trim()) {
    throw new AppError('INVALID_INPUT', 'Title is required', 400, 'portfolio.schema:validateCreateAchievementInput');
  }
  return {
    title: title.trim(),
    description: description ? description.trim() : null,
    achievedAt: (date || achievedAt) ? new Date(date || achievedAt) : new Date(),
    organization: organization || organizationName || null,
    categoryId: categoryId || null,
    proofDriveId: proofDriveId || null,
    proofUrl: proofUrl ? String(proofUrl).trim() : null,
  };
}

export function validateUpdateAchievementInput(body: any) {
  const { title, description, date, achievedAt, organization, organizationName, categoryId } = body || {};
  const updateData: any = {
    status: 'PENDING',
    isPublic: false,
    reviewNote: null,
  };
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description ? description.trim() : null;
  if (date || achievedAt) updateData.achievedAt = new Date(date || achievedAt);
  if (organization !== undefined || organizationName !== undefined) {
    updateData.organization = organization || organizationName || null;
  }
  if (categoryId !== undefined) updateData.categoryId = categoryId || null;
  return updateData;
}

export function validateCreateCertificateInput(body: any) {
  const { title, issuer, issueDate, issuedAt } = body || {};
  return {
    title: title || 'Certificate',
    issuer: issuer || '',
    issuedAt: (issueDate || issuedAt) ? new Date(issueDate || issuedAt) : new Date(),
  };
}

export function validateVisibilityPayload(body: any): boolean {
  const { isPublic } = body || {};
  if (typeof isPublic !== 'boolean') {
    throw new AppError('VALIDATION_ERROR', 'isPublic must be a boolean', 400, 'portfolio.schema:validateVisibilityPayload');
  }
  return isPublic;
}

export type PortfolioKind = 'achievements' | 'projects' | 'certificates';

export const PORTFOLIO_META: Record<
  PortfolioKind,
  { model: 'achievement' | 'project' | 'certificate'; label: string }
> = {
  achievements: { model: 'achievement', label: 'Achievement' },
  projects: { model: 'project', label: 'Project' },
  certificates: { model: 'certificate', label: 'Certificate' },
};

export function validatePortfolioKind(rawKind: string): PortfolioKind {
  const kind = String(rawKind || '').toLowerCase() as PortfolioKind;
  if (!PORTFOLIO_META[kind]) {
    throw new AppError('NOT_FOUND', 'Unknown portfolio item type', 404, 'portfolio.schema:validatePortfolioKind');
  }
  return kind;
}

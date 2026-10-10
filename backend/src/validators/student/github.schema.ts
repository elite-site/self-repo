import { AppError } from '../../utils/appError';

export interface GithubCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export function parseCallbackQuery(query: Record<string, unknown>): GithubCallbackQuery {
  return {
    code: typeof query.code === 'string' ? query.code : undefined,
    state: typeof query.state === 'string' ? query.state : undefined,
    error: query.error ? String(query.error) : undefined,
    errorDescription: query.error_description ? String(query.error_description) : undefined,
  };
}

export function validateStudentId(req: any): string {
  const studentId = req.studentId || req.student?.studentId;
  if (!studentId || typeof studentId !== 'string') {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401, 'github.schema:validateStudentId');
  }
  return studentId;
}

export function validateRepoId(id?: unknown): string {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Field "id" is required and must be a non-empty string.', 400, 'github.schema:validateRepoId');
  }
  return id.trim();
}

export function validateShowcaseRepoIds(repoIds: unknown): string[] {
  if (!Array.isArray(repoIds) || repoIds.length < 1 || repoIds.length > 30) {
    throw new AppError(
      'INVALID_SHOWCASE_COUNT',
      'You must select between 1 and 30 repositories to showcase.',
      400,
      'github.schema:validateShowcaseRepoIds'
    );
  }

  const uniqueIds = Array.from(new Set(repoIds.map(String)));
  if (uniqueIds.length !== repoIds.length) {
    throw new AppError(
      'DUPLICATE_REPOSITORIES',
      'Showcased repositories must be unique.',
      400,
      'github.schema:validateShowcaseRepoIds'
    );
  }

  return uniqueIds;
}

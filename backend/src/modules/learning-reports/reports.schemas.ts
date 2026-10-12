import { ValidationError } from '../../utils/appError';

export function parseCourseIdParam(id: string): string {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new ValidationError('Course ID is required', [{ field: 'id', message: 'Course ID is required' }]);
  }
  return id.trim();
}

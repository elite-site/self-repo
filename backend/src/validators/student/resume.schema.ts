import { AppError } from '../../utils/appError';

export function validateResumeFile(file?: Express.Multer.File): Express.Multer.File {
  if (!file) {
    throw new AppError('VALIDATION_ERROR', 'Resume PDF document is required.', 400, 'resume.schema:validateResumeFile');
  }
  return file;
}

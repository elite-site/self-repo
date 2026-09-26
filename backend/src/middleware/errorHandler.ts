import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Server error encountered:', err);

  // Upload validation failures (e.g. a rejected MIME type) are the caller's
  // fault, not a server fault. Honour an explicit 4xx before anything else so
  // they are not reported as 500s.
  const declared = err?.status ?? err?.statusCode;
  if (typeof declared === 'number' && declared >= 400 && declared < 500) {
    res.status(declared).json({
      error: err.name === 'MulterError' ? 'UPLOAD_ERROR' : 'VALIDATION_ERROR',
      message: err.message || 'The uploaded file was rejected.',
    });
    return;
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'One of your uploaded files exceeds the maximum allowed size limit.',
      });
      return;
    }
    res.status(400).json({
      error: 'UPLOAD_ERROR',
      message: err.message || 'Error occurred during file upload.',
    });
    return;
  }

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err?.message || 'An unexpected error occurred. Please try again later.',
  });
}

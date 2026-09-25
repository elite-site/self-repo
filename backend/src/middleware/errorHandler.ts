import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Server error encountered:', err);

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

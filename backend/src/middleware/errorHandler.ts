import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId =
    req.id || (res.getHeader('X-Request-Id') as string) || 'req_unknown';

  // 1. AppError subclasses (typed application errors)
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error(err.message, { requestId, code: err.code, status: err.status });
    } else {
      logger.warn(err.message, { requestId, code: err.code, status: err.status });
    }

    res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details && err.details.length > 0 ? { details: err.details } : {}),
      ...(err.source ? { source: err.source } : {}),
      ...(err.extra || {}),
      requestId,
    });
    return;
  }

  // 2. Prisma infrastructure error mapping (ERR-7)
  if (err?.code === 'P2002') {
    logger.warn('Prisma unique constraint conflict', { requestId, meta: err?.meta });
    res.status(409).json({
      error: 'CONFLICT',
      message: 'A resource with this identifier already exists.',
      requestId,
    });
    return;
  }

  if (err?.code === 'P2025') {
    logger.warn('Prisma record not found', { requestId });
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Requested record was not found.',
      requestId,
    });
    return;
  }

  if (err?.code === 'P2003') {
    logger.warn('Prisma foreign key conflict', { requestId });
    res.status(409).json({
      error: 'CONFLICT',
      message: 'Operation cannot be completed due to related record constraints.',
      requestId,
    });
    return;
  }

  // 3. JWT Authentication error mapping (ERR-7)
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    logger.warn('JWT verification failed', { requestId, name: err.name });
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: err.name === 'TokenExpiredError' ? 'Your session has expired.' : 'Invalid session token.',
      requestId,
    });
    return;
  }

  // 4. Multer upload errors
  if (err?.name === 'MulterError') {
    logger.warn('Multer upload error', { requestId, code: err.code });
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'One of your uploaded files exceeds the maximum allowed size limit.',
        requestId,
      });
      return;
    }
    res.status(400).json({
      error: 'UPLOAD_ERROR',
      message: err.message || 'Error occurred during file upload.',
      requestId,
    });
    return;
  }

  // 5. Declared 4xx errors from middleware/parsers
  const declaredStatus = err?.status ?? err?.statusCode;
  if (typeof declaredStatus === 'number' && declaredStatus >= 400 && declaredStatus < 500) {
    logger.warn(err.message || 'Client error', { requestId, status: declaredStatus });
    res.status(declaredStatus).json({
      error: err.code || 'VALIDATION_ERROR',
      message: err.message || 'The request could not be processed.',
      requestId,
    });
    return;
  }

  // 6. Unknown 5xx errors (ERR-6: never expose internal message or SQL in production)
  logger.error(err?.message || 'Unexpected server error', {
    requestId,
    stack: err?.stack,
  });

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err?.message || 'An unexpected error occurred. Please try again later.',
    requestId,
  });
}

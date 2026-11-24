import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { isProductionEnv } from '../config/env';
import { logger } from '../utils/logger';

const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]*$/;
const CLIENT_ERROR_MESSAGE = 'The request could not be processed.';
const FILE_TOO_LARGE_MESSAGE = 'One of your uploaded files exceeds the maximum allowed size limit.';
const UPLOAD_ERROR_MESSAGE = 'The upload could not be completed. Please try again.';

const MULTER_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  LIMIT_FILE_SIZE: FILE_TOO_LARGE_MESSAGE,
  LIMIT_FILE_COUNT: 'Too many files were uploaded. Please upload fewer files.',
  LIMIT_UNEXPECTED_FILE: 'An unexpected upload field was provided.',
  LIMIT_FIELD_KEY: 'A form field name is too long.',
  LIMIT_FIELD_VALUE: 'A form field value is too long.',
  LIMIT_FIELD_COUNT: 'Too many form fields were provided.',
  LIMIT_PART_COUNT: 'Too many parts were included in the upload.',
};

interface ErrorLike {
  code?: string;
  name?: string;
  message?: string;
  stack?: string;
  status?: number;
  statusCode?: number;
  meta?: unknown;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId =
    req.id || (res.getHeader('X-Request-Id') as string) || 'req_unknown';
  const failure = (err !== null && typeof err === 'object' ? err : {}) as ErrorLike;

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
  if (failure.code === 'P2002') {
    logger.warn('Prisma unique constraint conflict', { requestId, meta: failure.meta });
    res.status(409).json({
      error: 'CONFLICT',
      message: 'A resource with this identifier already exists.',
      requestId,
    });
    return;
  }

  if (failure.code === 'P2025') {
    logger.warn('Prisma record not found', { requestId });
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Requested record was not found.',
      requestId,
    });
    return;
  }

  if (failure.code === 'P2003') {
    logger.warn('Prisma foreign key conflict', { requestId });
    res.status(409).json({
      error: 'CONFLICT',
      message: 'Operation cannot be completed due to related record constraints.',
      requestId,
    });
    return;
  }

  // 2b. Prisma database connection / pool errors (ERR-7)
  if (
    failure.code === 'P1001' || // Can't reach database server
    failure.code === 'P1002' || // Database server reached but timed out
    failure.code === 'P1008' || // Operations timed out
    failure.code === 'P1017' || // Server has closed the connection
    failure.code === 'P2024'    // Timed out fetching a connection from the pool
  ) {
    logger.warn('Database temporarily busy or unreachable', {
      requestId,
      code: failure.code,
      message: failure.message,
    });
    res.setHeader('Retry-After', '2');
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'The database is currently experiencing high load. Please refresh in a moment.',
      requestId,
    });
    return;
  }

  // 3. JWT Authentication error mapping (ERR-7)
  if (failure.name === 'JsonWebTokenError' || failure.name === 'TokenExpiredError') {
    logger.warn('JWT verification failed', { requestId, name: failure.name });
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: failure.name === 'TokenExpiredError' ? 'Your session has expired.' : 'Invalid session token.',
      requestId,
    });
    return;
  }

  // 4. Multer upload errors
  if (failure.name === 'MulterError') {
    logger.warn('Multer upload error', { requestId, code: failure.code });
    const isFileTooLarge = failure.code === 'LIMIT_FILE_SIZE';
    res.status(400).json({
      error: isFileTooLarge ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
      message: MULTER_ERROR_MESSAGES[failure.code ?? ''] ?? UPLOAD_ERROR_MESSAGE,
      requestId,
    });
    return;
  }

  // 5. Declared 4xx errors from middleware/parsers. Only messages authored by
  // our own upload validators are safe to echo; parser/provider messages can
  // contain request bodies, paths, or provider text (ERR-6).
  const declaredStatus = failure.status ?? failure.statusCode;
  if (typeof declaredStatus === 'number' && declaredStatus >= 400 && declaredStatus < 500) {
    const code =
      typeof failure.code === 'string' && SAFE_ERROR_CODE.test(failure.code)
        ? failure.code
        : 'VALIDATION_ERROR';
    const isKnownClientError = failure.name === 'UploadValidationError' && typeof failure.message === 'string';
    logger.warn('Client error', { requestId, status: declaredStatus, code, name: failure.name });
    res.status(declaredStatus).json({
      error: code,
      message: isKnownClientError ? failure.message : CLIENT_ERROR_MESSAGE,
      requestId,
    });
    return;
  }

  // 6. Unknown 5xx errors (ERR-6: never expose internal message or SQL in production)
  logger.error(failure.message || 'Unexpected server error', {
    requestId,
    stack: failure.stack,
  });

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message:
      isProductionEnv()
        ? 'An unexpected error occurred. Please try again later.'
        : failure.message || 'An unexpected error occurred. Please try again later.',
    requestId,
  });
}

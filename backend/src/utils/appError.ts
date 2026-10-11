export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly source?: string;
  public readonly details?: ValidationErrorDetail[];
  public readonly extra?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 500,
    source?: string,
    details?: ValidationErrorDetail[],
    extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.source = source;
    this.details = details;
    this.extra = extra;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationErrorDetail[]) {
    super('VALIDATION_ERROR', message, 400, undefined, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(code, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found', code: string = 'NOT_FOUND') {
    super(code, message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code: string = 'CONFLICT') {
    super(code, message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMITED') {
    super(code, message, 429);
    this.name = 'RateLimitError';
  }
}

export class UpstreamError extends AppError {
  constructor(message: string = 'Upstream service failure', status: number = 502, source?: string) {
    super('UPSTREAM_FAILURE', message, status, source);
    this.name = 'UpstreamError';
  }
}

import { AppError } from '../../utils/appError';

export type AcademicYearPromotionErrorCode = 'NO_ACTIVE_STUDENTS' | 'ALREADY_PROMOTED';

export class AcademicYearPromotionError extends Error {
  public readonly code: AcademicYearPromotionErrorCode;
  public readonly targetYear: string | number | undefined;

  constructor(code: AcademicYearPromotionErrorCode, targetYear?: string | number) {
    super(code);
    this.name = 'AcademicYearPromotionError';
    this.code = code;
    this.targetYear = targetYear;
  }
}

/**
 * HTTP-facing form of the academic-year promotion guard. `alreadyPromoted` is
 * carried in the body so a client can offer a forced re-run without having to
 * parse the human-readable message.
 */
export class AcademicYearPromotionConflictError extends AppError {
  constructor(code: AcademicYearPromotionErrorCode, targetYear?: string | number) {
    const message =
      code === 'NO_ACTIVE_STUDENTS'
        ? 'No active students to promote.'
        : `Already promoted for academic year ${targetYear} — run again anyway?`;

    super(
      code,
      message,
      409,
      undefined,
      undefined,
      code === 'ALREADY_PROMOTED' ? { alreadyPromoted: true } : undefined
    );
    this.name = 'AcademicYearPromotionConflictError';
  }
}

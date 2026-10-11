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

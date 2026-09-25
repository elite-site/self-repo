import { prisma } from '../lib/prisma';
import { ActivityService } from './activity.service';

export type AcademicYearPromotionErrorCode = 'NO_ACTIVE_STUDENTS' | 'ALREADY_PROMOTED';

export class AcademicYearPromotionError extends Error {
  public readonly code: AcademicYearPromotionErrorCode;
  public readonly targetYear: number | undefined;

  constructor(code: AcademicYearPromotionErrorCode, targetYear?: number) {
    super(code);
    this.name = 'AcademicYearPromotionError';
    this.code = code;
    this.targetYear = targetYear;
  }
}

export interface PromoteAcademicYearOptions {
  adminEmail: string;
  force?: boolean;
}

export interface AcademicYearPromotionResult {
  graduated: number;
  promoted: number;
  targetYear: number;
}

export async function promoteAcademicYear(
  opts: PromoteAcademicYearOptions
): Promise<AcademicYearPromotionResult> {
  return prisma.$transaction(async (tx) => {
    const maxYearResult = await tx.student.aggregate({
      where: { status: 'ACTIVE' },
      _max: { year: true },
    });
    const maxYear = maxYearResult._max.year;

    if (maxYear === null) {
      throw new AcademicYearPromotionError('NO_ACTIVE_STUDENTS');
    }

    const targetYear = maxYear + 1;
    const promotionSetting = await tx.portalSettings.findUnique({
      where: { key: 'promoted_academic_year' },
    });

    if (promotionSetting?.value === String(targetYear) && !opts.force) {
      throw new AcademicYearPromotionError('ALREADY_PROMOTED', targetYear);
    }

    const graduatedResult = await tx.student.updateMany({
      where: { status: 'ACTIVE', year: { gte: 4 } },
      data: { status: 'GRADUATED', graduatedAt: new Date() },
    });
    const promotedResult = await tx.student.updateMany({
      where: { status: 'ACTIVE', year: { gte: 1, lt: 4 } },
      data: { year: { increment: 1 } },
    });

    await tx.portalSettings.upsert({
      where: { key: 'promoted_academic_year' },
      update: {
        value: String(targetYear),
        group: 'academic_year',
        updatedBy: opts.adminEmail,
      },
      create: {
        key: 'promoted_academic_year',
        value: String(targetYear),
        group: 'academic_year',
        updatedBy: opts.adminEmail,
      },
    });

    const graduated = graduatedResult.count;
    const promoted = promotedResult.count;

    await ActivityService.log({
      category: 'ADMIN',
      action: 'PROMOTE_ACADEMIC_YEAR',
      details: `Graduated ${graduated} students; promoted ${promoted} students; target year: ${targetYear}.`,
      userEmail: opts.adminEmail,
      status: 'SUCCESS',
    });

    return { graduated, promoted, targetYear };
  });
}

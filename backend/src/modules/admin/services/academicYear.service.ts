import * as studentRepo from '../repositories/students.repository';
import { ActivityService } from './activity.service';
import { AcademicYearPromotionError, type AcademicYearPromotionErrorCode } from '../admin.errors';

export { AcademicYearPromotionError, type AcademicYearPromotionErrorCode };

export interface PromoteAcademicYearOptions {
  adminEmail: string;
  force?: boolean;
  academicYear?: string;
}

export interface AcademicYearPromotionResult {
  graduated: number;
  promoted: number;
  targetYear: string | number;
}

export async function promoteAcademicYear(
  opts: PromoteAcademicYearOptions
): Promise<AcademicYearPromotionResult> {
  const academicYear = opts.academicYear || String(new Date().getFullYear());
  const result = await studentRepo.executeAcademicYearPromotion({
    targetYear: academicYear,
    adminEmail: opts.adminEmail,
    force: opts.force,
  });

  await ActivityService.log({
    category: 'ADMIN',
    action: 'PROMOTE_ACADEMIC_YEAR',
    details: `Graduated ${result.graduated} students; promoted ${result.promoted} students; target year: ${academicYear}.`,
    userEmail: opts.adminEmail,
    status: 'SUCCESS',
  });

  return result;
}


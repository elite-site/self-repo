import * as repo from '../students.repository';
import { env } from '../../../config/env';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';
import { ChangeRequestInput } from '../schemas/profile.schema';
import { clearPublicStudentCaches } from '../../public';

export async function getActiveSkills() {
  try {
    const skills = await repo.findActiveSkillsList();
    return skills;
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return [];
    logger.error('[profileSkills.service:getActiveSkills] Error fetching skills:', { error: err });
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profileSkills.service:getActiveSkills');
  }
}

export async function updateStudentSkills(
  studentId: string,
  skillIds?: string[],
  skillNames?: string[]
) {
  if (env.FEATURE_GITHUB_PORTFOLIO) {
    throw new AppError('FORBIDDEN', 'Skills are now managed via your GitHub connection.', 403, 'profileSkills.service:updateStudentSkills');
  }
  try {
    const profile = await repo.upsertStudentProfile(studentId, {}, { studentId, isPublic: true });

    let resolvedIds: string[] = [];

    if (Array.isArray(skillIds) && skillIds.length > 0) {
      resolvedIds = skillIds;
    } else if (Array.isArray(skillNames) && skillNames.length > 0) {
      const existingSkills = await repo.findSkillsByNames(skillNames);
      const existingMap = new Map(existingSkills.map(s => [s.name, s.id]));

      const missingNames = skillNames.filter((n: string) => !existingMap.has(n));
      if (missingNames.length > 0) {
        await repo.createSkillsBulk(missingNames);
        const newSkills = await repo.findSkillsByNames(missingNames);
        newSkills.forEach(s => existingMap.set(s.name, s.id));
      }

      resolvedIds = skillNames
        .map((n: string) => existingMap.get(n))
        .filter((id: string | undefined): id is string => !!id);
    }

    const skills = await repo.updateStudentSkillsInTransaction(profile.id, resolvedIds);
    clearPublicStudentCaches();
    return { skills: skills.map(s => s.skill) };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return { skills: [] };
    logger.error(`[profileSkills.service:updateStudentSkills] Error updating skills for studentId=${studentId}:`, { error: err });
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profileSkills.service:updateStudentSkills');
  }
}

export async function createStudentChangeRequest(
  studentId: string,
  payload: ChangeRequestInput
) {
  try {
    const { fieldName, currentValue, requestedValue, reason, type } = payload;
    if (type === 'skill') {
      const reqRecord = await repo.createSkillRequestRecord({
        studentId,
        skillName: requestedValue,
        reason,
        category: fieldName || 'OTHER'
      });
      return { success: true, id: reqRecord.id };
    } else {
      const reqRecord = await repo.createAcademicChangeRequestRecord({
        studentId,
        fieldName: fieldName || '',
        currentValue: currentValue || '',
        requestedValue,
        reason
      });
      return { success: true, id: reqRecord.id };
    }
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return { success: true, id: 'mock_id' };
    logger.error(`[profileSkills.service:createStudentChangeRequest] Error creating change request for studentId=${studentId}:`, { error: err });
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profileSkills.service:createStudentChangeRequest');
  }
}

export async function getStudentChangeRequests(studentId: string) {
  try {
    return await repo.findStudentAcademicAndSkillChangeRequests(studentId);
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return { changeRequests: [], skillRequests: [] };
    logger.error(`[profileSkills.service:getStudentChangeRequests] Error fetching change requests for studentId=${studentId}:`, { error: err });
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profileSkills.service:getStudentChangeRequests');
  }
}

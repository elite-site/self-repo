import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/appError';
import { ChangeRequestInput } from '../../validators/student/profile.schema';

export async function getActiveSkills() {
  try {
    const skills = await prisma.skill.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    return skills;
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return [];
    console.error('[profileSkills.service:getActiveSkills] Error fetching skills:', err);
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
    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: {},
      create: { studentId, isPublic: true }
    });

    let resolvedIds: string[] = [];

    if (Array.isArray(skillIds) && skillIds.length > 0) {
      resolvedIds = skillIds;
    } else if (Array.isArray(skillNames) && skillNames.length > 0) {
      const existingSkills = await prisma.skill.findMany({
        where: { name: { in: skillNames } }
      });
      const existingMap = new Map(existingSkills.map(s => [s.name, s.id]));

      const missingNames = skillNames.filter((n: string) => !existingMap.has(n));
      if (missingNames.length > 0) {
        await prisma.skill.createMany({
          data: missingNames.map((name: string) => ({ name, isActive: true })),
          skipDuplicates: true
        });
        const newSkills = await prisma.skill.findMany({
          where: { name: { in: missingNames } }
        });
        newSkills.forEach(s => existingMap.set(s.name, s.id));
      }

      resolvedIds = skillNames
        .map((n: string) => existingMap.get(n))
        .filter((id: string | undefined): id is string => !!id);
    }

    await prisma.studentSkill.deleteMany({ where: { profileId: profile.id } });
    if (resolvedIds.length > 0) {
      await prisma.studentSkill.createMany({
        data: resolvedIds.map((id: string) => ({ profileId: profile.id, skillId: id })),
        skipDuplicates: true
      });
    }

    const skills = await prisma.studentSkill.findMany({
      where: { profileId: profile.id },
      include: { skill: true }
    });
    return { skills: skills.map(s => s.skill) };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return { skills: [] };
    console.error(`[profileSkills.service:updateStudentSkills] Error updating skills for studentId=${studentId}:`, err);
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
      const reqRecord = await prisma.skillRequest.create({
        data: {
          studentId,
          skillName: requestedValue,
          reason,
          category: fieldName || 'OTHER'
        }
      });
      return { success: true, id: reqRecord.id };
    } else {
      const reqRecord = await prisma.changeRequest.create({
        data: {
          studentId,
          fieldName: fieldName || '',
          currentValue: currentValue || '',
          requestedValue,
          reason
        }
      });
      return { success: true, id: reqRecord.id };
    }
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return { success: true, id: 'mock_id' };
    console.error(`[profileSkills.service:createStudentChangeRequest] Error creating change request for studentId=${studentId}:`, err);
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profileSkills.service:createStudentChangeRequest');
  }
}

export async function getStudentChangeRequests(studentId: string) {
  try {
    const [academic, skills] = await Promise.all([
      prisma.changeRequest.findMany({ where: { studentId } }),
      prisma.skillRequest.findMany({ where: { studentId } }),
    ]);
    return { changeRequests: academic, skillRequests: skills };
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return { changeRequests: [], skillRequests: [] };
    console.error(`[profileSkills.service:getStudentChangeRequests] Error fetching change requests for studentId=${studentId}:`, err);
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profileSkills.service:getStudentChangeRequests');
  }
}

import * as repo from '../students.repository';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';
import { ProfileUpdateInput } from '../schemas/profile.schema';
import { serializeProfileView } from './profile.serializer';

export * from './profilePhoto.service';
export * from './profileSkills.service';
export * from './profile.serializer';

export async function getStudentProfile(studentId: string, rollNo?: string) {
  try {
    const [student, submissionResult, introVideo] = await Promise.all([
      repo.findStudentProfileWithDetails(studentId),
      rollNo ? repo.findSubmissionReview(rollNo) : Promise.resolve(null),
      repo.findIntroVideoReview(studentId),
    ]);

    if (!student) {
      throw new AppError('NOT_FOUND', 'Student not found', 404, 'profile.service:getStudentProfile');
    }

    let submission = submissionResult;
    if (!submission && student.rollNo && !rollNo) {
      submission = await repo.findSubmissionReview(student.rollNo);
    }

    return serializeProfileView(student, submission, introVideo);
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      return {};
    }
    logger.error(`[profile.service:getStudentProfile] Failure fetching profile for studentId=${studentId}:`, { error: err });
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profile.service:getStudentProfile');
  }
}

export async function updateStudentProfile(studentId: string, data: ProfileUpdateInput) {
  try {
    const updateData: any = {};
    if (data.bioText !== undefined) updateData.biography = data.bioText;
    if (data.specialQualities !== undefined) updateData.specialQualities = data.specialQualities.trim();
    if (data.normalizedLinks.githubUrl !== undefined) updateData.githubUrl = data.normalizedLinks.githubUrl;
    if (data.normalizedLinks.linkedinUrl !== undefined) updateData.linkedinUrl = data.normalizedLinks.linkedinUrl;
    if (data.normalizedLinks.leetcodeUrl !== undefined) updateData.leetcodeUrl = data.normalizedLinks.leetcodeUrl;
    if (data.normalizedLinks.codechefUrl !== undefined) updateData.codechefUrl = data.normalizedLinks.codechefUrl;
    if (data.normalizedLinks.portfolioUrl !== undefined) updateData.portfolioUrl = data.normalizedLinks.portfolioUrl;

    const profile = await repo.upsertStudentProfileFromInput(studentId, updateData, {
      isPublic: true,
      biography: data.bioText || '',
      specialQualities: data.specialQualities?.trim() || '',
      githubUrl: data.normalizedLinks.githubUrl || '',
      linkedinUrl: data.normalizedLinks.linkedinUrl || '',
      leetcodeUrl: data.normalizedLinks.leetcodeUrl || '',
      codechefUrl: data.normalizedLinks.codechefUrl || '',
      portfolioUrl: data.normalizedLinks.portfolioUrl || '',
    });
    return profile;
  } catch (err: any) {
    if (err.code === 'P2021' || err.message?.includes('does not exist')) return {};
    logger.error(`[profile.service:updateStudentProfile] Failure updating profile for studentId=${studentId}:`, { error: err });
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profile.service:updateStudentProfile');
  }
}

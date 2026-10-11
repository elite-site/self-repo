import * as repo from '../students.repository';
import { getMaxVideoSizeMb } from '../../../services/limits.service';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';
import { serializeStudentView } from './overview.serializer';

export async function getStudentMeData(studentId: string, rollNo?: string) {
  try {
    const studentPromise = repo.findStudentForMe(studentId);

    const submissionPromise = rollNo
      ? repo.findSubmissionReview(rollNo)
      : Promise.resolve(null);

    const introVideoPromise = repo.findIntroVideoForMe(studentId)
      .catch((err: any) => {
        logger.warn(
          `[me.service:getStudentMeData] intro video lookup failed for studentId=${studentId}:`,
          { error: err }
        );
        return null;
      });

    const [student, initialSubmission, introVideo] = await Promise.all([
      studentPromise,
      submissionPromise,
      introVideoPromise,
    ]);
    let submission = initialSubmission;

    if (!student) {
      throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'me.service:getStudentMeData');
    }

    if (!submission && student.rollNo && student.rollNo !== rollNo) {
      submission = await repo.findSubmissionReview(student.rollNo);
    }

    const maxVideoSizeMb = await getMaxVideoSizeMb();
    return {
      student: serializeStudentView(student, submission, introVideo, maxVideoSizeMb),
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error(`[me.service:getStudentMeData] studentId=${studentId}:`, { error: err });
    throw new AppError('FAILED_TO_FETCH_PROFILE', 'Failed to fetch student profile.', 500, 'me.service:getStudentMeData');
  }
}

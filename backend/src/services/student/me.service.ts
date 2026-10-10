import { prisma } from '../../lib/prisma';
import { getMaxVideoSizeMb } from '../limits.service';
import { AppError } from '../../utils/appError';
import { serializeStudentView } from './overview.serializer';

export async function getStudentMeData(studentId: string, rollNo?: string) {
  try {
    const studentPromise = prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: {
          select: {
            id: true,
            photoDriveId: true,
            photoUrl: true,
            photoOffsetX: true,
            photoOffsetY: true,
            photoZoom: true,
            biography: true,
          },
        },
      },
    });

    const submissionPromise = rollNo
      ? prisma.submission.findFirst({
          where: { rollNo },
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            videoDriveId: true,
            reviewText: true,
            reviewPros: true,
            reviewCons: true,
            reviewedAt: true,
          },
        })
      : Promise.resolve(null);

    const introVideoPromise = prisma.introVideo
      .findFirst({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          reviewNote: true,
          isPublic: true,
          publishedAt: true,
          changeRequestedAt: true,
          changeRequestNote: true,
          submittedAt: true,
          filename: true,
          mimeType: true,
          sizeMb: true,
          driveFileId: true,
        },
      })
      .catch((err: any) => {
        console.error(
          `[me.service:getStudentMeData] intro video lookup failed for studentId=${studentId}:`,
          err?.message ?? err
        );
        return null;
      });

    let [student, submission, introVideo] = await Promise.all([
      studentPromise,
      submissionPromise,
      introVideoPromise,
    ]);

    if (!student) {
      throw new AppError('NOT_FOUND', 'Student account not found.', 404, 'me.service:getStudentMeData');
    }

    if (!submission && student.rollNo && student.rollNo !== rollNo) {
      submission = await prisma.submission.findFirst({
        where: { rollNo: student.rollNo },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          videoDriveId: true,
          reviewText: true,
          reviewPros: true,
          reviewCons: true,
          reviewedAt: true,
        },
      });
    }

    const maxVideoSizeMb = await getMaxVideoSizeMb();
    return {
      student: serializeStudentView(student, submission, introVideo, maxVideoSizeMb),
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[me.service:getStudentMeData] studentId=${studentId}:`, err);
    throw new AppError('FAILED_TO_FETCH_PROFILE', 'Failed to fetch student profile.', 500, 'me.service:getStudentMeData');
  }
}

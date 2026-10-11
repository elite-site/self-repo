import { driveService } from '../../../services/drive.service';
import { ActivityService } from '../../../services/activity.service';
import { notifyStudent, notifyVideoChangeRequested } from '../../../services/notification.service';
import { AppError } from '../../../utils/appError';
import * as adminRepo from '../admin.repository';

export async function requestItemChange(
  studentId: string,
  type: string,
  itemId: string,
  reasonText: string,
  reviewerName: string,
  userEmail?: string
) {
  if (!reasonText) {
    throw new AppError('BAD_REQUEST', 'Change request note is required.', 400);
  }

  const student = await adminRepo.findStudentByIdOrRoll(studentId);
  if (!student) {
    throw new AppError('NOT_FOUND', 'Student not found.', 404);
  }

  const normalizedType = type.toLowerCase().replace(/_/g, '-');

  if (normalizedType === 'video' || normalizedType === 'intro-video' || normalizedType === 'videos') {
    const item = await adminRepo.findIntroVideoById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Video not found.', 404);
    }
    await adminRepo.updateIntroVideo(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      changeRequestNote: reasonText,
      changeRequestedAt: new Date(),
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyVideoChangeRequested(student.id, reasonText);
  } else if (normalizedType === 'resume' || normalizedType === 'resumes') {
    const item = await adminRepo.findResumeById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Resume not found.', 404);
    }
    await adminRepo.updateResume(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Resume Revision Requested',
      message: `Admin requested changes on your resume: "${reasonText}". Please upload an updated PDF.`,
      actionUrl: '/resume',
    });
  } else if (normalizedType === 'achievement' || normalizedType === 'achievements') {
    const item = await adminRepo.findAchievementById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Achievement not found.', 404);
    }
    await adminRepo.updateAchievement(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Achievement Revision Requested',
      message: `Admin requested changes on your achievement "${item.title}": "${reasonText}".`,
      actionUrl: '/portfolio/achievements',
    });
  } else if (normalizedType === 'certificate' || normalizedType === 'certificates') {
    const item = await adminRepo.findCertificateById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Certificate not found.', 404);
    }
    await adminRepo.updateCertificate(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Certificate Revision Requested',
      message: `Admin requested changes on your certificate "${item.title}": "${reasonText}".`,
      actionUrl: '/portfolio/certificates',
    });
  } else if (normalizedType === 'project' || normalizedType === 'projects') {
    const item = await adminRepo.findProjectById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }
    await adminRepo.updateProject(itemId, {
      status: 'CHANGES_REQUESTED',
      reviewNote: reasonText,
      isPublic: false,
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    });
    await notifyStudent({
      studentId: student.id,
      title: 'Project Revision Requested',
      message: `Admin requested changes on your project "${item.title}": "${reasonText}".`,
      actionUrl: '/portfolio/projects',
    });
  } else {
    throw new AppError('BAD_REQUEST', `Unknown item type: ${type}`, 400);
  }

  await ActivityService.log({
    category: 'ADMIN',
    action: 'REQUEST_CHANGE',
    details: `Admin requested changes for ${normalizedType} ${itemId} of student ${student.rollNo}: "${reasonText}"`,
    userEmail: userEmail || 'admin',
  });

  return { success: true, message: 'Change requested successfully and student notified.' };
}

export async function deleteStudentItem(
  studentId: string,
  type: string,
  itemId: string,
  reasonText?: string,
  userEmail?: string
) {
  const student = await adminRepo.findStudentByIdOrRoll(studentId);
  if (!student) {
    throw new AppError('NOT_FOUND', 'Student not found.', 404);
  }

  const normalizedType = type.toLowerCase().replace(/_/g, '-');
  const cleanRollNo = student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  const studentRelativePath = `Students/${cleanRollNo}`;

  if (normalizedType === 'video' || normalizedType === 'intro-video' || normalizedType === 'videos') {
    let item = await adminRepo.findIntroVideoById(itemId);
    if (!item || item.studentId !== student.id) {
      const fallback = await adminRepo.findFallbackIntroVideo(itemId, student.id, student.rollNo);
      if (fallback) item = fallback;
    }

    const submissions = await adminRepo.findSubmissionsByStudentOrItem(student.rollNo, student.id, itemId);

    if (!item && !submissions.some((s) => Boolean(s.videoDriveId))) {
      throw new AppError('NOT_FOUND', 'Video not found.', 404);
    }

    if (item?.driveFileId) {
      await driveService.deleteFileById(item.driveFileId, studentRelativePath).catch(() => {});
    }

    await adminRepo.updateManyIntroVideos(
      {
        OR: [
          { studentId: student.id },
          { student: { rollNo: student.rollNo } },
        ],
      },
      {
        driveFileId: null,
        thumbnail: null,
        filename: null,
        mimeType: null,
        sizeMb: null,
        status: 'CHANGES_REQUESTED',
        reviewNote: reasonText || 'Video removed by administrator.',
        isPublic: false,
        publishedAt: null,
        changeRequestedAt: new Date(),
        changeRequestNote: reasonText || 'Your previous video was removed. Please upload a new one.',
      }
    );

    for (const sub of submissions) {
      if (sub.videoDriveId) {
        if (!item || sub.videoDriveId !== item.driveFileId) {
          await driveService.deleteFileById(sub.videoDriveId, sub.driveFolderPath).catch(() => {});
        }
        await adminRepo.updateSubmission(sub.id, { videoDriveId: null });
      }
    }

    await notifyStudent({
      studentId: student.id,
      title: 'Introduction Video Deleted',
      message: reasonText
        ? `Your introduction video was removed by administrator. Reason: "${reasonText}".`
        : 'Your introduction video was removed by administrator.',
      actionUrl: '/intro-video',
    });

    await ActivityService.log({
      category: 'ADMIN',
      action: 'DELETE_VIDEO',
      details: `Admin deleted video (${itemId}) for student ${student.rollNo}${reasonText ? ` (Reason: ${reasonText})` : ''}`,
      applicantName: student.name,
      userEmail: userEmail || 'admin',
    });
  } else if (normalizedType === 'resume' || normalizedType === 'resumes') {
    const item = await adminRepo.findResumeById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Resume not found.', 404);
    }
    if (item.driveFileId) {
      await driveService.deleteFileById(item.driveFileId, studentRelativePath).catch(() => {});
    }
    await adminRepo.deleteResume(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Resume Deleted',
      message: reasonText
        ? `Your resume was removed by administrator. Reason: "${reasonText}".`
        : 'Your resume was removed by administrator.',
      actionUrl: '/resume',
    });
  } else if (normalizedType === 'achievement' || normalizedType === 'achievements') {
    const item = await adminRepo.findAchievementById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Achievement not found.', 404);
    }
    if (item.proofDriveId) {
      await driveService.deleteFileById(item.proofDriveId, studentRelativePath).catch(() => {});
    }
    await adminRepo.deleteAchievement(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Achievement Deleted',
      message: reasonText
        ? `Your achievement "${item.title}" was removed by administrator. Reason: "${reasonText}".`
        : `Your achievement "${item.title}" was removed by administrator.`,
      actionUrl: '/portfolio/achievements',
    });
  } else if (normalizedType === 'certificate' || normalizedType === 'certificates') {
    const item = await adminRepo.findCertificateById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Certificate not found.', 404);
    }
    if (item.fileDriveId) {
      await driveService.deleteFileById(item.fileDriveId, studentRelativePath).catch(() => {});
    }
    await adminRepo.deleteCertificate(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Certificate Deleted',
      message: reasonText
        ? `Your certificate "${item.title}" was removed by administrator. Reason: "${reasonText}".`
        : `Your certificate "${item.title}" was removed by administrator.`,
      actionUrl: '/portfolio/certificates',
    });
  } else if (normalizedType === 'project' || normalizedType === 'projects') {
    const item = await adminRepo.findProjectById(itemId);
    if (!item || item.studentId !== student.id) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }
    await adminRepo.deleteProject(itemId);
    await notifyStudent({
      studentId: student.id,
      title: 'Project Deleted',
      message: reasonText
        ? `Your project "${item.title}" was removed by administrator. Reason: "${reasonText}".`
        : `Your project "${item.title}" was removed by administrator.`,
      actionUrl: '/portfolio/projects',
    });
  } else {
    throw new AppError('BAD_REQUEST', `Unknown item type: ${type}`, 400);
  }

  await ActivityService.log({
    category: 'ADMIN',
    action: 'DELETE_ITEM',
    details: `Admin deleted ${normalizedType} ${itemId} for student ${student.rollNo}${reasonText ? ` (Reason: ${reasonText})` : ''}`,
    userEmail: userEmail || 'admin',
  });

  return { success: true, message: 'Item deleted successfully.' };
}

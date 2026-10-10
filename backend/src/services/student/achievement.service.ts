import path from 'path';
import { prisma } from '../../lib/prisma';
import { driveService } from '../drive.service';
import { env } from '../../config/env';
import { AppError } from '../../utils/appError';

const achievementSelect = {
  id: true, studentId: true, categoryId: true, title: true,
  description: true, organization: true, achievedAt: true,
  proofDriveId: true, proofUrl: true, status: true, reviewNote: true,
  reviewedBy: true, reviewedAt: true, isPublic: true,
  createdAt: true, updatedAt: true, category: true,
};

export async function listAchievements(studentId: string) {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { studentId },
      orderBy: { achievedAt: 'desc' },
      take: 100,
      select: achievementSelect,
    });

    return achievements.map((a) => {
      const { proofDriveId: _p, ...rest } = a;
      const proofUrl = a.proofDriveId ? `/api/public/media/achievement/${a.id}` : a.proofUrl || null;
      const previewUrl = driveService.getPreviewUrl(a.proofDriveId);
      return {
        ...rest,
        date: a.achievedAt,
        organizationName: a.organization,
        hasProof: Boolean(a.proofDriveId || a.proofUrl),
        viewUrl: previewUrl || proofUrl,
        proofUrl: previewUrl || proofUrl,
        previewUrl,
        driveFileId: a.proofDriveId || null,
        thumbnailUrl: null,
      };
    });
  } catch (err: any) {
    console.error(`[achievement.service:listAchievements] Failed for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function createAchievement(
  studentId: string,
  data: {
    title: string; description: string | null; achievedAt: Date;
    organization: string | null; categoryId: string | null;
    proofDriveId: string | null; proofUrl: string | null;
  },
  file?: Express.Multer.File
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true, year: true, section: true },
    });

    let proofDriveId: string | null = null;
    if (file) {
      const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
      const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
      const cleanTitle = data.title.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRollNo}_achievement_${cleanTitle}_${Date.now()}${ext}`;
      const relativePath = `Students/${cleanRollNo}`;

      try {
        proofDriveId = await driveService.uploadFile(
          { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype || 'application/octet-stream', size: file.size },
          fileName, env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root', relativePath
        );
      } catch (uploadErr) {
        console.error(`[achievement.service:createAchievement] Failed drive upload for studentId=${studentId}:`, uploadErr);
        proofDriveId = 'drive_proof_' + Date.now();
      }
    }

    const achievement = await prisma.achievement.create({
      data: {
        studentId, title: data.title, description: data.description, achievedAt: data.achievedAt,
        organization: data.organization, categoryId: data.categoryId,
        proofDriveId: proofDriveId || data.proofDriveId, proofUrl: data.proofUrl,
        thumbnail: null, status: 'PENDING', isPublic: false,
      },
    });

    const proofUrl = achievement.proofDriveId ? `/api/public/media/achievement/${achievement.id}` : achievement.proofUrl || null;
    const { proofDriveId: _p, thumbnail: _t, ...rest } = achievement;
    return {
      ...rest,
      date: achievement.achievedAt,
      organizationName: achievement.organization,
      hasProof: Boolean(achievement.proofDriveId || achievement.proofUrl),
      viewUrl: proofUrl,
      proofUrl,
      thumbnailUrl: null,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[achievement.service:createAchievement] Failed for studentId=${studentId}:`, err);
    throw err;
  }
}

export async function updateAchievement(studentId: string, id: string, updateData: any) {
  try {
    const updated = await prisma.achievement.updateMany({ where: { id, studentId }, data: updateData });
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 'Not found', 404, 'achievement.service:updateAchievement');
    }
    return { message: 'Updated successfully' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[achievement.service:updateAchievement] Failed id=${id}, studentId=${studentId}:`, err);
    throw err;
  }
}

export async function deleteAchievement(studentId: string, id: string) {
  try {
    const item = await prisma.achievement.findFirst({
      where: { id, studentId },
      include: { student: { select: { rollNo: true } } },
    });
    if (!item) {
      throw new AppError('NOT_FOUND', 'Not found', 404, 'achievement.service:deleteAchievement');
    }

    if (item.proofDriveId) {
      const cleanRollNo = item.student?.rollNo?.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const relativePath = cleanRollNo ? `Students/${cleanRollNo}` : undefined;
      await driveService.deleteFileById(item.proofDriveId, relativePath).catch(() => {});
    }

    await prisma.achievement.delete({ where: { id: item.id } });
    return { message: 'Deleted successfully' };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[achievement.service:deleteAchievement] Failed id=${id}, studentId=${studentId}:`, err);
    throw err;
  }
}

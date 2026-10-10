import path from 'path';
import { prisma } from '../../lib/prisma';
import { driveService } from '../drive.service';
import { env } from '../../config/env';
import { invalidateMediaDriveIdCache } from '../../routes/public.routes';
import { AppError } from '../../utils/appError';

export interface CropData {
  photoOffsetX?: number;
  photoOffsetY?: number;
  photoZoom?: number;
}

export async function uploadProfilePhoto(
  studentId: string,
  file: Express.Multer.File,
  cropData: CropData
) {
  let driveFileId: string;
  let photoUrl: string;

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, name: true, profile: { select: { photoDriveId: true } } },
    });
    const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
    const relativePath = `Students/${cleanRollNo}`;
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `${cleanRollNo}_photo${ext}`;

    if (student?.profile?.photoDriveId) {
      await driveService.deleteFileById(student.profile.photoDriveId, relativePath).catch(() => {});
    }
    await driveService.deleteFilesByPrefix(relativePath, `${cleanRollNo}_photo`).catch(() => {});
    await driveService.deleteFilesByPrefix(relativePath, 'photo').catch(() => {});

    try {
      driveFileId = await driveService.uploadFile(
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        fileName,
        env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
        relativePath
      );
      if (!driveFileId) {
        throw new Error('Storage returned no file id for the profile photo.');
      }
      photoUrl = `/api/public/media/photo/${studentId}`;
    } catch (err: any) {
      console.error(`[profilePhoto.service:uploadProfilePhoto] Storage upload failed for studentId=${studentId}:`, err);
      throw new AppError('PHOTO_UPLOAD_FAILED', 'Could not save your photo. Please try again.', 502, 'profilePhoto.service:uploadProfilePhoto');
    }

    const updateData: any = { photoDriveId: driveFileId, photoUrl };
    if (cropData.photoOffsetX !== undefined) updateData.photoOffsetX = cropData.photoOffsetX;
    if (cropData.photoOffsetY !== undefined) updateData.photoOffsetY = cropData.photoOffsetY;
    if (cropData.photoZoom !== undefined) updateData.photoZoom = cropData.photoZoom;

    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      update: updateData,
      create: { studentId, isPublic: true, ...updateData }
    });

    invalidateMediaDriveIdCache('photo', studentId);
    if (profile.id) invalidateMediaDriveIdCache('photo', profile.id);

    const ts = Date.now();
    const maskedPhotoUrl = `/api/public/media/photo/${profile.id || studentId}?t=${ts}`;
    return {
      photoUrl: maskedPhotoUrl,
      viewUrl: maskedPhotoUrl,
      hasPhoto: true,
      photoOffsetX: profile.photoOffsetX,
      photoOffsetY: profile.photoOffsetY,
      photoZoom: profile.photoZoom
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      console.error(`[profilePhoto.service:uploadProfilePhoto] studentProfile table missing for studentId=${studentId}:`, err.message);
      throw new AppError('PROFILE_STORAGE_UNAVAILABLE', 'Profile storage is not initialised yet. Please try again later.', 500, 'profilePhoto.service:uploadProfilePhoto');
    }
    console.error(`[profilePhoto.service:uploadProfilePhoto] Error saving profile photo for studentId=${studentId}:`, err);
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profilePhoto.service:uploadProfilePhoto');
  }
}

export async function deleteProfilePhoto(studentId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { rollNo: true, profile: { select: { id: true, photoDriveId: true } } },
    });
    if (student?.profile?.photoDriveId || student?.rollNo) {
      const cleanRollNo = (student?.rollNo || 'STUDENT').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const relativePath = `Students/${cleanRollNo}`;
      if (student?.profile?.photoDriveId) {
        await driveService.deleteFileById(student.profile.photoDriveId, relativePath).catch(() => {});
      }
      await driveService.deleteFilesByPrefix(relativePath, `${cleanRollNo}_photo`).catch(() => {});
      await driveService.deleteFilesByPrefix(relativePath, 'photo').catch(() => {});
    }
    invalidateMediaDriveIdCache('photo', studentId);
    if (student?.profile?.id) invalidateMediaDriveIdCache('photo', student.profile.id);
    await prisma.studentProfile.updateMany({
      where: { studentId },
      data: { photoDriveId: null, photoUrl: null },
    });
    return { success: true, message: 'Profile photo removed.' };
  } catch (err: any) {
    console.error(`[profilePhoto.service:deleteProfilePhoto] Internal server error for studentId=${studentId}:`, err);
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500, 'profilePhoto.service:deleteProfilePhoto');
  }
}

import path from 'path';
import * as repo from '../students.repository';
import { driveService } from '../../media/drive';
import { env } from '../../../config/env';
import { invalidateMediaDriveIdCache, clearPublicStudentCaches } from '../../public';
import { AppError } from '../../../utils/appError';
import { logger } from '../../../utils/logger';

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
    const student = await repo.findStudentPhotoProfile(studentId);
    const cleanRollNo = student?.rollNo ? student.rollNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '') : 'STUDENT';
    const relativePath = `Students/${cleanRollNo}`;
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `${cleanRollNo}_photo${ext}`;

    if (typeof (driveService as any).deleteFileById === 'function' && student?.profile?.photoDriveId) {
      await Promise.resolve((driveService as any).deleteFileById(student.profile.photoDriveId, relativePath)).catch((err: any) => {
        logger.warn('Non-fatal: could not delete previous photo by ID', { error: err });
      });
    }
    if (typeof (driveService as any).deleteFilesByPrefix === 'function') {
      await Promise.resolve((driveService as any).deleteFilesByPrefix(relativePath, `${cleanRollNo}_photo`)).catch((err: any) => {
        logger.warn('Non-fatal: could not delete previous photo by roll prefix', { error: err });
      });
      await Promise.resolve((driveService as any).deleteFilesByPrefix(relativePath, 'photo')).catch((err: any) => {
        logger.warn('Non-fatal: could not delete previous photo by prefix', { error: err });
      });
    }

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
      logger.error(`[profilePhoto.service:uploadProfilePhoto] Storage upload failed for studentId=${studentId}:`, { error: err });
      throw new AppError('PHOTO_UPLOAD_FAILED', 'Could not save your photo. Please try again.', 502, 'profilePhoto.service:uploadProfilePhoto');
    }

    const updateData: any = { photoDriveId: driveFileId, photoUrl };
    if (cropData.photoOffsetX !== undefined) updateData.photoOffsetX = cropData.photoOffsetX;
    if (cropData.photoOffsetY !== undefined) updateData.photoOffsetY = cropData.photoOffsetY;
    if (cropData.photoZoom !== undefined) updateData.photoZoom = cropData.photoZoom;

    const profile = await repo.upsertStudentPhoto(studentId, updateData);

    invalidateMediaDriveIdCache('photo', studentId);
    if (profile.id) invalidateMediaDriveIdCache('photo', profile.id);
    clearPublicStudentCaches();

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
      logger.error(`[profilePhoto.service:uploadProfilePhoto] studentProfile table missing for studentId=${studentId}:`, { error: err.message });
      throw new AppError('PROFILE_STORAGE_UNAVAILABLE', 'Profile storage is not initialised yet. Please try again later.', 500, 'profilePhoto.service:uploadProfilePhoto');
    }
    logger.error(`[profilePhoto.service:uploadProfilePhoto] Error saving profile photo for studentId=${studentId}:`, { error: err });
    throw new AppError('INTERNAL_SERVER_ERROR', 'Server error', 500, 'profilePhoto.service:uploadProfilePhoto');
  }
}

export async function deleteProfilePhoto(studentId: string) {
  try {
    const student = await repo.findStudentPhotoProfile(studentId);
    if (student?.profile?.photoDriveId || student?.rollNo) {
      const cleanRollNo = (student?.rollNo || 'STUDENT').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const relativePath = `Students/${cleanRollNo}`;
      if (typeof (driveService as any).deleteFileById === 'function' && student?.profile?.photoDriveId) {
        await Promise.resolve((driveService as any).deleteFileById(student.profile.photoDriveId, relativePath)).catch((err: any) => {
          logger.warn('Non-fatal: could not delete file by ID during profile photo removal', { error: err });
        });
      }
      if (typeof (driveService as any).deleteFilesByPrefix === 'function') {
        await Promise.resolve((driveService as any).deleteFilesByPrefix(relativePath, `${cleanRollNo}_photo`)).catch((err: any) => {
          logger.warn('Non-fatal: could not delete by roll prefix during profile photo removal', { error: err });
        });
        await Promise.resolve((driveService as any).deleteFilesByPrefix(relativePath, 'photo')).catch((err: any) => {
          logger.warn('Non-fatal: could not delete by prefix during profile photo removal', { error: err });
        });
      }
    }
    invalidateMediaDriveIdCache('photo', studentId);
    if (student?.profile?.id) invalidateMediaDriveIdCache('photo', student.profile.id);
    await repo.clearStudentPhoto(studentId);
    clearPublicStudentCaches();
    return { success: true, message: 'Profile photo removed.' };
  } catch (err: any) {
    logger.error(`[profilePhoto.service:deleteProfilePhoto] Internal server error for studentId=${studentId}:`, { error: err });
    throw new AppError('SERVER_ERROR', 'An unexpected error occurred. Please try again later.', 500, 'profilePhoto.service:deleteProfilePhoto');
  }
}

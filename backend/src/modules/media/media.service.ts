import { driveService, DriveService } from '../../services/drive.service';
import * as mediaRepo from './media.repository';
import { AppError } from '../../utils/appError';
import { isValidMediaType } from './media.schemas';

export { driveService, DriveService };

export async function resolveMediaDriveId(type: string, id: string): Promise<string> {
  const cleanId = id.trim();

  switch (type) {
    case 'photo': {
      const profile = await mediaRepo.findProfilePhotoDriveId(cleanId);
      if (profile?.photoDriveId) return profile.photoDriveId;
      return cleanId;
    }
    case 'video': {
      const video = await mediaRepo.findIntroVideoDriveId(cleanId);
      if (video?.driveFileId) return video.driveFileId;
      return cleanId;
    }
    case 'resume': {
      const resume = await mediaRepo.findResumeDriveId(cleanId);
      if (resume?.driveFileId) return resume.driveFileId;
      return cleanId;
    }
    case 'certificate': {
      const cert = await mediaRepo.findCertificateDriveId(cleanId);
      if (cert?.fileDriveId) return cert.fileDriveId;
      return cleanId;
    }
    case 'achievement': {
      const ach = await mediaRepo.findAchievementDriveId(cleanId);
      if (ach?.proofDriveId) return ach.proofDriveId;
      return cleanId;
    }
    default:
      return cleanId;
  }
}

export async function streamMedia(type: string, id: string, rangeHeader?: string) {
  if (!isValidMediaType(type)) {
    throw new AppError('INVALID_MEDIA_TYPE', `Unknown media type: ${type}`, 400);
  }

  const driveFileId = await resolveMediaDriveId(type, id);
  if (!driveFileId) {
    throw new AppError('MEDIA_NOT_FOUND', `Media ${id} not found`, 404);
  }

  return driveService.streamDriveFile(driveFileId, undefined, rangeHeader);
}

export async function getThumbnail(type: string, id: string) {
  if (!isValidMediaType(type)) {
    throw new AppError('INVALID_MEDIA_TYPE', `Unknown media type: ${type}`, 400);
  }

  const driveFileId = await resolveMediaDriveId(type, id);
  if (!driveFileId) {
    throw new AppError('MEDIA_NOT_FOUND', `Media ${id} not found`, 404);
  }

  const thumbType = type === 'photo' ? 'certificate' : (type as any);
  return driveService.generateThumbnail(driveFileId, thumbType);
}

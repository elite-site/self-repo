import { prisma } from '../../../infrastructure/prisma';

export async function getStorageInventory() {
  const [
    submissionVideos,
    introVideos,
    resumes,
    certificates,
    achievementProofs,
    profilePhotos,
    cacheCount,
    cacheEntries,
  ] = await Promise.all([
    prisma.submission.count({ where: { videoDriveId: { not: null } } }),
    prisma.introVideo.count({ where: { driveFileId: { not: null } } }),
    prisma.resume.count({ where: { driveFileId: { not: null } } }),
    prisma.certificate.count({ where: { fileDriveId: { not: null } } }),
    prisma.achievement.count({ where: { proofDriveId: { not: null } } }),
    prisma.studentProfile.count({ where: { photoDriveId: { not: null } } }),
    prisma.driveFolderCache.count(),
    prisma.driveFolderCache.findMany({ take: 20 }),
  ]);

  return {
    submissionVideos,
    introVideos,
    resumes,
    certificates,
    achievementProofs,
    profilePhotos,
    cacheCount,
    cacheEntries,
  };
}

export async function clearDriveFolderCache() {
  return prisma.driveFolderCache.deleteMany();
}

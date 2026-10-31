import { prisma } from '../../infrastructure/prisma';

export async function findFolderCache(pathKey: string) {
  return prisma.driveFolderCache.findUnique({
    where: { pathKey },
  });
}

export async function upsertFolderCache(pathKey: string, driveFolderId: string) {
  return prisma.driveFolderCache.upsert({
    where: { pathKey },
    create: { pathKey, driveFolderId },
    update: { driveFolderId },
  });
}

export async function findAllMediaFileDriveIds(): Promise<{
  cachedFolders: string[];
  resumes: string[];
  certificates: string[];
  achievements: string[];
  introVideos: string[];
  submissionFiles: string[];
  profilePhotos: string[];
}> {
  const [
    cachedFolders,
    resumes,
    certs,
    achs,
    introVideos,
    submissions,
    profiles,
  ] = await Promise.all([
    prisma.driveFolderCache.findMany().then((rows) => rows.map((r) => r.driveFolderId).filter(Boolean)),
    prisma.resume.findMany({ where: { driveFileId: { not: null } }, select: { driveFileId: true } }).then((rows) => rows.map((r) => r.driveFileId!).filter(Boolean)),
    prisma.certificate.findMany({ where: { fileDriveId: { not: null } }, select: { fileDriveId: true } }).then((rows) => rows.map((r) => r.fileDriveId!).filter(Boolean)),
    prisma.achievement.findMany({ where: { proofDriveId: { not: null } }, select: { proofDriveId: true } }).then((rows) => rows.map((r) => r.proofDriveId!).filter(Boolean)),
    prisma.introVideo.findMany({ where: { driveFileId: { not: null } }, select: { driveFileId: true } }).then((rows) => rows.map((r) => r.driveFileId!).filter(Boolean)),
    prisma.submission.findMany({
      where: { videoDriveId: { not: null } },
      select: { videoDriveId: true, photo1DriveId: true, photo2DriveId: true, photo3DriveId: true },
    }).then((rows) => {
      const ids: string[] = [];
      for (const s of rows) {
        if (s.videoDriveId) ids.push(s.videoDriveId);
        if (s.photo1DriveId) ids.push(s.photo1DriveId);
        if (s.photo2DriveId) ids.push(s.photo2DriveId);
        if (s.photo3DriveId) ids.push(s.photo3DriveId);
      }
      return ids;
    }),
    prisma.studentProfile.findMany({ where: { photoDriveId: { not: null } }, select: { photoDriveId: true } }).then((rows) => rows.map((r) => r.photoDriveId!).filter(Boolean)),
  ]);

  return {
    cachedFolders,
    resumes,
    certificates: certs,
    achievements: achs,
    introVideos,
    submissionFiles: submissions,
    profilePhotos: profiles,
  };
}

export async function findProfilePhotoDriveId(idOrStudentId: string) {
  const profile = await prisma.studentProfile.findFirst({
    where: {
      OR: [
        { id: idOrStudentId },
        { studentId: idOrStudentId },
        { student: { rollNo: idOrStudentId } },
      ],
    },
    select: { photoDriveId: true, photoUrl: true },
  });
  return profile;
}

export async function findIntroVideoDriveId(id: string) {
  return prisma.introVideo.findFirst({
    where: {
      OR: [
        { id },
        { studentId: id },
        { driveFileId: id },
        { student: { rollNo: id } },
      ],
    },
    select: { id: true, driveFileId: true, isPublic: true, status: true },
  });
}

export async function findResumeDriveId(id: string) {
  return prisma.resume.findFirst({
    where: {
      OR: [{ id }, { driveFileId: id }],
    },
    select: { id: true, driveFileId: true, status: true },
  });
}

export async function findCertificateDriveId(id: string) {
  return prisma.certificate.findFirst({
    where: {
      OR: [{ id }, { fileDriveId: id }],
    },
    select: { id: true, fileDriveId: true, status: true },
  });
}

export async function findAchievementDriveId(id: string) {
  return prisma.achievement.findFirst({
    where: {
      OR: [{ id }, { proofDriveId: id }],
    },
    select: { id: true, proofDriveId: true, proofUrl: true, status: true },
  });
}

import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';
import { EXCLUDE_INTERNAL_EVENT } from '../../config/constants';

// Public Events
export async function findPublicEvents() {
  return prisma.event.findMany({
    where: {
      status: 'OPEN',
      ...EXCLUDE_INTERNAL_EVENT,
    },
    orderBy: { eventDate: 'asc' },
  });
}

export async function findPublicStudentEvents() {
  return prisma.event.findMany({
    where: {
      status: 'OPEN',
      ...EXCLUDE_INTERNAL_EVENT,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPublicEventById(id: string) {
  return prisma.event.findFirst({
    where: { id, status: { in: ['OPEN', 'CLOSED'] } },
    include: { formFields: { orderBy: { displayOrder: 'asc' } } },
  });
}

// Submissions
export async function findEventById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export async function createEventRecord(data: Prisma.EventCreateInput) {
  return prisma.event.create({ data });
}

export async function findSubmissionByEventAndStudent(eventId: string, rollNo: string, year: number, branch: string, section: string) {
  return prisma.submission.findUnique({
    where: {
      eventId_rollNo_year_branch_section: {
        eventId,
        rollNo,
        year,
        branch,
        section,
      },
    },
  });
}

export async function updateSubmissionRecord(id: string, data: any) {
  return prisma.submission.update({
    where: { id },
    data,
  });
}

export async function createSubmissionRecord(data: any) {
  return prisma.submission.create({ data });
}

export async function findStudentForSubmissionSync(rollNo: string, email: string) {
  return prisma.student.findFirst({
    where: {
      OR: [
        { rollNo: { equals: rollNo, mode: 'insensitive' } },
        { email: { equals: email, mode: 'insensitive' } },
      ],
    },
  });
}

export async function findIntroVideoByStudent(studentId: string) {
  return prisma.introVideo.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function updateIntroVideoRecord(id: string, data: any) {
  return prisma.introVideo.update({ where: { id }, data });
}

export async function createIntroVideoRecord(data: any) {
  return prisma.introVideo.create({ data });
}

// Media
export async function findCertificateById(id: string) {
  return prisma.certificate.findUnique({ where: { id } });
}

export async function findAchievementById(id: string) {
  return prisma.achievement.findUnique({ where: { id } });
}

export async function findResumeById(id: string) {
  return prisma.resume.findUnique({ where: { id } });
}

export async function findIntroVideoById(id: string) {
  return prisma.introVideo.findUnique({ where: { id } });
}

export async function findIntroVideoForPublicMedia(idOrRoll: string) {
  return prisma.introVideo.findFirst({
    where: {
      OR: [
        { id: idOrRoll },
        { studentId: idOrRoll },
        { driveFileId: idOrRoll },
        { student: { rollNo: idOrRoll } },
      ],
    },
  });
}

export async function findStudentProfileByIdOrStudent(id: string) {
  return prisma.studentProfile.findFirst({
    where: { OR: [{ id }, { studentId: id }] },
  });
}

export async function findSubmissionByIdOrRollNo(id: string) {
  return prisma.submission.findFirst({
    where: { OR: [{ id }, { rollNo: id }, { videoDriveId: id }] },
  });
}

export async function updateResumeThumbnail(id: string, thumbnail: Buffer) {
  return prisma.resume.update({ where: { id }, data: { thumbnail } }).catch(() => {});
}

export async function updateVideoThumbnail(id: string, thumbnail: Buffer) {
  return prisma.introVideo.update({ where: { id }, data: { thumbnail } }).catch(() => {});
}

export async function updateVideoThumbnailByDriveId(driveFileId: string, thumbnail: Buffer) {
  return prisma.introVideo.updateMany({
    where: { driveFileId },
    data: { thumbnail },
  }).catch(() => {});
}

export async function updateAchievementThumbnail(id: string, thumbnail: Buffer) {
  return prisma.achievement.update({ where: { id }, data: { thumbnail } });
}

export async function updateCertificateThumbnail(id: string, thumbnail: Buffer) {
  return prisma.certificate.update({ where: { id }, data: { thumbnail } });
}

// Public Students
export async function countPublicStudents(where: any) {
  return prisma.student.count({ where });
}

export async function findPublicStudents(where: any, skip: number, take: number) {
  return prisma.student.findMany({
    relationLoadStrategy: 'join',
    where,
    select: {
      id: true,
      rollNo: true,
      name: true,
      year: true,
      section: true,
      status: true,
      graduatedAt: true,
      profile: {
        select: {
          id: true,
          photoUrl: true,
          photoOffsetX: true,
          photoOffsetY: true,
          photoZoom: true,
          skills: { include: { skill: true } }
        }
      }
    },
    orderBy: [{ year: 'desc' }, { section: 'asc' }, { rollNo: 'asc' }],
    skip,
    take
  });
}

export async function findPublicStudentsIndex() {
  return prisma.student.findMany({
    relationLoadStrategy: 'join',
    where: {
      status: { in: ['ACTIVE', 'GRADUATED'] },
    },
    select: {
      id: true,
      rollNo: true,
      name: true,
      year: true,
      section: true,
      status: true,
      profile: {
        select: {
          id: true,
          photoUrl: true,
          photoOffsetX: true,
          photoOffsetY: true,
          photoZoom: true,
          skills: {
            select: {
              skill: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [{ year: 'desc' }, { section: 'asc' }, { rollNo: 'asc' }],
  });
}

export async function findActiveSkills() {
  return prisma.skill.findMany({
    where: { isActive: true },
    select: { id: true, name: true, category: true },
    orderBy: { name: 'asc' }
  });
}

export async function loadPublicProfile(rollNo: string) {
  return prisma.student.findUnique({
    relationLoadStrategy: 'join',
    where: { rollNo },
    include: {
      profile: { include: { skills: { include: { skill: true } } } },
      projects: {
        where: { status: 'APPROVED', isPublic: true },
        orderBy: { displayOrder: 'asc' },
        take: 100,
        select: {
          id: true,
          title: true,
          description: true,
          technologies: true,
          githubUrl: true,
          driveVideoUrl: true,
          displayOrder: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      achievements: {
        where: { status: 'APPROVED' },
        orderBy: { achievedAt: 'desc' },
        take: 100,
        select: {
          id: true, studentId: true, categoryId: true, title: true, description: true,
          organization: true, achievedAt: true, proofDriveId: true, proofUrl: true,
          status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
          isPublic: true, createdAt: true, updatedAt: true, category: true,
        },
      },
      certificates: {
        where: { status: 'APPROVED', isPublic: true },
        take: 100,
        select: {
          id: true, studentId: true, title: true, issuer: true, issuedAt: true,
          fileDriveId: true, status: true, reviewNote: true, reviewedBy: true,
          reviewedAt: true, isPublic: true, createdAt: true, updatedAt: true,
        },
      },
      resumes: {
        where: { status: 'APPROVED' },
        take: 1,
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true, studentId: true, driveFileId: true, filename: true, sizeMb: true,
          status: true, reviewNote: true, reviewedBy: true, reviewedAt: true,
          isActive: true, isPublic: true, submittedAt: true, updatedAt: true,
        },
      },
      introVideos: {
        where: { status: 'APPROVED', isPublic: true, driveFileId: { not: null } },
        take: 1,
        orderBy: { publishedAt: 'desc' },
        select: { id: true, submittedAt: true, publishedAt: true, sizeMb: true, driveFileId: true, status: true, isPublic: true },
      },
      githubAccount: {
        select: {
          login: true,
          avatarUrl: true,
          lastSyncedAt: true,
        },
      },
      githubRepos: {
        where: { isShowcased: true, removedFromGithub: false },
        orderBy: { showcaseRank: 'asc' },
        take: 30,
        select: {
          id: true,
          githubRepoId: true,
          name: true,
          description: true,
          readmeExcerpt: true,
          htmlUrl: true,
          stars: true,
          primaryLanguage: true,
          languages: true,
          commitCount: true,
          isFork: true,
          showcaseRank: true,
        },
      },
      githubSkills: {
        include: { skill: true },
        orderBy: [{ repoCount: 'desc' }, { totalBytes: 'desc' }],
        take: 30,
      },
    }
  });
}

export async function findPublicStudentWithResume(rollNo: string) {
  return prisma.student.findUnique({
    where: { rollNo },
    include: {
      profile: true,
      resumes: { where: { status: 'APPROVED' }, take: 1, orderBy: { submittedAt: 'desc' } }
    }
  });
}

// Public Videos
export async function listPublishedVideos(limit: number, where: any) {
  return Promise.all([
    prisma.introVideo.findMany({
      where: { ...where, driveFileId: { not: null } },
      select: {
        id: true,
        driveFileId: true,
        submittedAt: true,
        publishedAt: true,
        sizeMb: true,
        studentId: true,
        student: { select: { name: true, rollNo: true, year: true, section: true } },
      },
      orderBy: [{ publishedAt: 'desc' }, { submittedAt: 'desc' }],
      take: limit,
    }),
    prisma.introVideo.count({
      where: { ...where, driveFileId: { not: null } },
    }),
  ]).then(([videos, total]) => ({ items: videos, total }));
}

export async function findPublishedVideoById(id: string, where: any) {
  return prisma.introVideo.findFirst({
    where: { ...where, id, driveFileId: { not: null } },
    select: { id: true, driveFileId: true },
  });
}

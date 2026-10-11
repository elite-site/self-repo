import { prisma } from '../../../infrastructure/prisma';

export async function approvePendingBacklog() {
  return Promise.all([
    prisma.resume.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'APPROVED', isPublic: true },
    }),
    prisma.achievement.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'APPROVED', isPublic: true },
    }),
    prisma.certificate.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'APPROVED', isPublic: true },
    }),
    prisma.studentProfile.updateMany({
      where: { isPublic: false },
      data: { isPublic: true },
    }),
  ]);
}

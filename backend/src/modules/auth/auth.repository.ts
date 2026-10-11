import { prisma } from '../../infrastructure/prisma';

export async function findAdminUserForLogin(cleanUsername: string, lowerUsername: string) {
  return prisma.adminUser.findFirst({
    where: {
      OR: [
        { username: cleanUsername },
        { username: { equals: cleanUsername, mode: 'insensitive' } },
        { email: lowerUsername },
        { email: { equals: lowerUsername, mode: 'insensitive' } },
      ],
    },
  });
}

export async function findAdminUserWithRoles(id: string) {
  return prisma.adminUser.findUnique({
    where: { id },
    include: {
      roleAssignments: {
        include: {
          role: {
            include: { permissions: true }
          }
        }
      }
    }
  });
}

export async function findStudentByEmailForAuth(email: string) {
  return prisma.student.findUnique({
    where: { email },
    select: { id: true, rollNo: true, name: true, email: true },
  });
}

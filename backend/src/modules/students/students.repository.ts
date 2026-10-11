import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';

export async function findStudentById(id: string, includeProfile: boolean = false) {
  return prisma.student.findUnique({
    where: { id },
    include: includeProfile ? { profile: true } : undefined,
  });
}

export async function findStudentByRollNo(rollNo: string, includeProfile: boolean = false) {
  return prisma.student.findUnique({
    where: { rollNo },
    include: includeProfile ? { profile: true } : undefined,
  });
}

export async function findStudentByEmail(email: string) {
  return prisma.student.findUnique({
    where: { email },
  });
}

export async function updateStudent(id: string, data: Prisma.StudentUpdateInput) {
  return prisma.student.update({
    where: { id },
    data,
  });
}

export async function findStudentProfile(studentId: string) {
  return prisma.studentProfile.findUnique({
    where: { studentId },
  });
}

export async function upsertStudentProfile(studentId: string, data: Prisma.StudentProfileUpdateInput, createData: Prisma.StudentProfileCreateInput) {
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: data,
    create: createData,
  });
}

export async function updateStudentProfileRecord(studentId: string, data: Prisma.StudentProfileUpdateInput) {
  return prisma.studentProfile.update({
    where: { studentId },
    data,
  });
}

// Notifications
export async function findStudentNotifications(studentId: string, take: number = 50) {
  return prisma.notification.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function countUnreadNotifications(studentId: string) {
  return prisma.notification.count({
    where: { studentId, status: 'UNREAD' },
  });
}

export async function markAllNotificationsAsRead(studentId: string) {
  return prisma.notification.updateMany({
    where: { studentId, status: 'UNREAD' },
    data: { status: 'READ', readAt: new Date() },
  });
}

export async function markNotificationAsRead(id: string, studentId: string) {
  return prisma.notification.updateMany({
    where: { id, studentId },
    data: { status: 'READ', readAt: new Date() },
  });
}

// Change requests
export async function findStudentChangeRequests(studentId: string) {
  return prisma.changeRequest.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createStudentChangeRequestRecord(data: Prisma.ChangeRequestUncheckedCreateInput) {
  return prisma.changeRequest.create({
    data,
  });
}

// Videos
export async function findStudentIntroVideo(studentId: string) {
  return prisma.introVideo.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function findStudentResume(studentId: string) {
  return prisma.resume.findFirst({
    where: { studentId },
    orderBy: { submittedAt: 'desc' },
  });
}

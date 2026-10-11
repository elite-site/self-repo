import { prisma } from '../../infrastructure/prisma';
import type { Prisma } from '@prisma/client';

export async function findEmailAutomations() {
  return prisma.emailAutomation.findMany({
    include: {
      template: true,
      history: { take: 5, orderBy: { runAt: 'desc' } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createEmailTemplateRecord(data: Prisma.EmailTemplateCreateInput) {
  return prisma.emailTemplate.create({ data });
}

export async function createEmailAutomationRecord(data: Prisma.EmailAutomationCreateInput) {
  return prisma.emailAutomation.create({
    data,
    include: { template: true },
  });
}

export async function findEmailAutomationById(id: string) {
  return prisma.emailAutomation.findUnique({
    where: { id },
    include: { template: true },
  });
}

export async function updateEmailAutomationRecord(
  id: string,
  data: Prisma.EmailAutomationUpdateInput
) {
  return prisma.emailAutomation.update({
    where: { id },
    data,
    include: { template: true },
  });
}

export async function countAllStudents() {
  return prisma.student.count();
}

export async function createEmailAutomationRunRecord(data: Prisma.EmailAutomationRunCreateInput) {
  return prisma.emailAutomationRun.create({ data });
}

export async function getEmailHistoryRecords() {
  return Promise.all([
    prisma.emailAutomationRun.findMany({
      take: 50,
      orderBy: { runAt: 'desc' },
      include: { automation: { include: { template: true } } },
    }),
    prisma.emailLog.findMany({
      take: 50,
      orderBy: { sentAt: 'desc' },
      include: { event: true },
    }),
  ]);
}

export async function findAllEmailTemplates() {
  return prisma.emailTemplate.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

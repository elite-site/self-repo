import { prisma } from '../../../infrastructure/prisma';

export async function findAllPortalSettings() {
  return prisma.portalSettings.findMany();
}

export async function findPortalSettingByKey(key: string) {
  return prisma.portalSettings.findUnique({
    where: { key },
    select: { value: true },
  });
}


export async function upsertPortalSetting(key: string, value: string, group: string, updatedBy?: string) {
  return prisma.portalSettings.upsert({
    where: { key },
    update: { value, group, ...(updatedBy ? { updatedBy } : {}) },
    create: { key, value, group, ...(updatedBy ? { updatedBy } : {}) },
  });
}

export async function batchUpsertPortalSettings(entries: [string, any][], updatedBy: string) {
  return prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.portalSettings.upsert({
        where: { key },
        update: { value: String(value), updatedBy },
        create: { key, value: String(value), updatedBy },
      })
    )
  );
}

export async function findAllSkills() {
  return prisma.skill.findMany({ orderBy: { name: 'asc' } });
}

export async function createSkill(data: { name: string; category?: string; isActive?: boolean }) {
  return prisma.skill.create({ data: { ...data, category: data.category || 'General', isActive: data.isActive ?? true } });
}

export async function updateSkill(id: string, data: any) {
  return prisma.skill.update({ where: { id }, data });
}

export async function deleteSkill(id: string) {
  return prisma.skill.delete({ where: { id } });
}

export async function upsertSkill(name: string, category: string) {
  return prisma.skill.upsert({
    where: { name },
    update: {},
    create: { name, category, isActive: true },
  });
}

export async function findAllChangeRequests() {
  return prisma.changeRequest.findMany({
    include: { student: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateChangeRequest(id: string, data: any) {
  return prisma.changeRequest.update({ where: { id }, data });
}

export async function findAllSkillRequests() {
  return prisma.skillRequest.findMany({
    include: { student: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateSkillRequest(id: string, data: any) {
  return prisma.skillRequest.update({ where: { id }, data });
}

export async function findAllAnnouncements() {
  return prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function findAnnouncementById(id: string) {
  return prisma.announcement.findUnique({ where: { id } });
}

export async function createAnnouncement(data: any) {
  return prisma.announcement.create({ data });
}

export async function claimAnnouncementPublish(id: string) {
  return prisma.announcement.updateMany({
    where: { id, status: { not: 'PUBLISHED' } },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
}

import { AppError } from '../../../utils/appError';
import { deliverAnnouncementNotifications } from '../../announcements';
import * as adminRepo from '../admin.repository';
import type { CreateAnnouncementInput } from '../admin.types';

import { clearLimitsCache } from '../../../services/limits.service';

export async function getSettings() {
  return adminRepo.findAllPortalSettings();
}

export async function saveSetting(key: string, value: any, group?: string) {
  if (key) {
    await adminRepo.upsertPortalSetting(key, String(value), group || 'general');
    clearLimitsCache();
  }
}

export async function getPortalSettings() {
  const settings = await adminRepo.findAllPortalSettings();
  const map: Record<string, string> = {
    academic_year: '2026',
    portal_title: 'ELITE Student Portal',
    institution_name: 'Sasi Institute of Technology & Engineering',
    department_name: 'Department of Information Technology',
    max_video_size_mb: '100',
    max_photo_size_mb: '10',
    allowed_email_domain: 'sasi.ac.in',
    auto_approve_projects: 'true',
  };
  settings.forEach((s) => {
    map[s.key] = s.value;
  });
  return { settings: map, raw: settings };
}

export async function savePortalSettings(body: Record<string, any>, updatedBy: string = 'ADMIN') {
  const validEntries = Object.entries(body).filter(
    ([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  );
  if (validEntries.length > 0) {
    await adminRepo.batchUpsertPortalSettings(validEntries, updatedBy);
    clearLimitsCache();
  }
}

export async function listSkills() {
  return adminRepo.findAllSkills();
}

export async function createSkill(name: string, category?: string) {
  return adminRepo.createSkill({ name, category, isActive: true });
}

export async function deleteSkill(id: string) {
  return adminRepo.deleteSkill(id);
}

export async function listPortalAnnouncements() {
  return adminRepo.findAllAnnouncements();
}

export async function createPortalAnnouncement(data: CreateAnnouncementInput, createdBy: string = 'ADMIN') {
  const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const isFutureScheduled = scheduledDate !== null && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();
  const isTargetAll = data.targetAll === false ? false : (data.targetAll === true ? true : !(data.targetYear || data.targetSection));

  const announcement = await adminRepo.createAnnouncement({
    title: data.title,
    message: data.message || data.body || data.content || '',
    priority: data.priority || 'normal',
    targetYear: data.targetYear !== undefined && data.targetYear !== null && data.targetYear !== '' ? parseInt(String(data.targetYear), 10) : null,
    targetSection: data.targetSection ? String(data.targetSection) : null,
    targetAll: isTargetAll,
    createdBy,
    scheduledAt: scheduledDate,
    status: isFutureScheduled ? 'SCHEDULED' : 'PUBLISHED',
    publishedAt: isFutureScheduled ? null : (scheduledDate || new Date()),
  });

  if (!isFutureScheduled) {
    await deliverAnnouncementNotifications({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      targetAll: announcement.targetAll,
      targetYear: announcement.targetYear,
      targetSection: announcement.targetSection,
    });
  }

  return announcement;
}

export async function publishPortalAnnouncement(id: string) {
  const existing = await adminRepo.findAnnouncementById(id);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Announcement not found', 404);
  }

  if (existing.status === 'PUBLISHED') {
    return existing;
  }

  const claimed = await adminRepo.claimAnnouncementPublish(id);
  const announcement = claimed.count > 0 ? await adminRepo.findAnnouncementById(id) : existing;

  if (claimed.count > 0 && announcement) {
    await deliverAnnouncementNotifications({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      targetAll: announcement.targetAll,
      targetYear: announcement.targetYear,
      targetSection: announcement.targetSection,
    });
  }

  return announcement;
}

import * as repo from './public.repository';
import { TtlCache } from '../../utils/ttlCache';
import { driveService } from '../media/drive';
import { isInternalEvent } from '../../config/constants';
import { AppError } from '../../utils/appError';

export const mediaDriveIdCache = new TtlCache<string>(300_000, 1000);
export const videoFileIdCache = new TtlCache<string>(300_000, 500);
export const videoListCache = new TtlCache<{ items: unknown[]; total: number }>(30_000, 50);

export const studentListCache = new TtlCache<unknown>(20_000, 100);
export const studentProfileCache = new TtlCache<any>(30_000, 200);
export const skillsCache = new TtlCache<unknown>(300_000, 4);

export const clearVideoListCache = (): void => videoListCache.clear();

export const clearPublicStudentCaches = (): void => {
  studentListCache.clear();
  studentProfileCache.clear();
  skillsCache.clear();
};

export function invalidateMediaDriveIdCache(type: string, id: string): void {
  mediaDriveIdCache.delete(`${type}:${id}`);
}

export function getThumbnailPlaceholderSvg(type: string): string {
  const iconPaths: Record<string, { label: string; icon: string }> = {
    video: {
      label: 'VIDEO PREVIEW',
      icon: '<polygon points="23 7 16 12 23 17 23 7" fill="#DC2626"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="#DC2626" stroke-width="2"/>',
    },
    resume: {
      label: 'RESUME PDF',
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="#DC2626" stroke-width="2"/><polyline points="14 2 14 8 20 8" fill="none" stroke="#DC2626" stroke-width="2"/><line x1="16" y1="13" x2="8" y2="13" stroke="#DC2626" stroke-width="2"/><line x1="16" y1="17" x2="8" y2="17" stroke="#DC2626" stroke-width="2"/>',
    },
    certificate: {
      label: 'VERIFIED CERTIFICATE',
      icon: '<circle cx="12" cy="8" r="7" fill="none" stroke="#DC2626" stroke-width="2"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="none" stroke="#DC2626" stroke-width="2"/>',
    },
    achievement: {
      label: 'ACHIEVEMENT PROOF',
      icon: '<circle cx="12" cy="8" r="6" fill="none" stroke="#DC2626" stroke-width="2"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" fill="none" stroke="#DC2626" stroke-width="2"/>',
    },
  };

  const info = iconPaths[type] || {
    label: 'DOCUMENT',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#DC2626" stroke-width="2"/>',
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
  <rect width="320" height="240" fill="#0B192C"/>
  <g transform="translate(148, 85) scale(1)">
    ${info.icon}
  </g>
  <text x="160" y="145" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="1" text-anchor="middle">${info.label}</text>
  <text x="160" y="165" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="600" text-anchor="middle">SASI · IT DEPARTMENT</text>
</svg>`;
}

export async function getPublicEventsList() {
  const now = new Date();
  const events = await repo.findPublicEvents();

  const mapped = events.map((e) => {
    const eventDate = e.eventDate || e.createdAt;
    const isPast = eventDate < now;
    const status = isPast ? 'Ended' : e.status;
    const eligibility =
      e.eligibilityYears && e.eligibilityYears.length > 0
        ? e.eligibilityYears.map((y) => `Year ${y}`).join(', ')
        : 'All students';

    return {
      ...e,
      title: e.name,
      date: eventDate,
      type: e.type || 'GENERAL',
      eligibility,
      deadline: e.registrationEnd || e.createdAt,
      status,
      isPast,
    };
  });

  mapped.sort((a, b) => {
    if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return a.isPast ? timeB - timeA : timeA - timeB;
  });

  return mapped;
}

export async function getPublicEventDetail(id: string) {
  if (isInternalEvent(id)) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }
  const event = await repo.findPublicEventById(id);
  if (!event) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }
  const now = new Date();
  const eventDate = event.eventDate || event.createdAt;
  const isPast = eventDate < now;
  const status = isPast ? 'Ended' : event.status;
  const eligibility =
    event.eligibilityYears && event.eligibilityYears.length > 0
      ? event.eligibilityYears.map((y) => `Year ${y}`).join(', ')
      : 'All students';

  return {
    ...event,
    title: event.name,
    date: eventDate,
    type: event.type || 'GENERAL',
    eligibility,
    deadline: event.registrationEnd || event.createdAt,
    status,
    isPast,
    registrationFields: event.formFields,
  };
}

export function serializePublicVideo(video: {
  id: string;
  driveFileId?: string | null;
  submittedAt: Date;
  publishedAt: Date | null;
  sizeMb: number | null;
  studentId: string;
  student: { name: string; rollNo: string; year: number; section: string };
}) {
  if (video.driveFileId) {
    videoFileIdCache.set(video.id, video.driveFileId);
  }
  return {
    id: video.id,
    name: video.student.name,
    rollNo: video.student.rollNo,
    year: video.student.year,
    section: video.student.section,
    submittedAt: video.submittedAt,
    publishedAt: video.publishedAt,
    sizeMb: video.sizeMb,
    streamUrl: `/api/public/videos/stream/${encodeURIComponent(video.id)}`,
    thumbnailUrl: video.driveFileId
      ? `/api/public/media/thumbnail/video/${encodeURIComponent(video.id)}?v=${encodeURIComponent(video.driveFileId)}`
      : null,
    profileUrl: `/students/${encodeURIComponent(video.student.rollNo)}`,
    driveFileId: video.driveFileId || null,
    previewUrl: typeof driveService.getPreviewUrl === 'function' ? driveService.getPreviewUrl(video.driveFileId) : null,
  };
}

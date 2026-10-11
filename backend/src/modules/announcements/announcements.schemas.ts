export function announcementActionUrl(announcementId: string): string {
  return `/announcements/${encodeURIComponent(announcementId)}`;
}

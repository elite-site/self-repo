export interface NotificationRoutingTarget {
  id?: string;
  type?: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  title?: string;
  message?: string;
}

/**
 * Resolves destination path dynamically for notifications.
 * Routes based on actionUrl or type / entityType:
 * - TEAM / TEAM_INVITE -> /teams
 * - EVENT / EVENT_REGISTRATION -> /registrations or /events
 * - RESUME -> /resume
 * - VIDEO / SUBMISSION -> /intro-video
 * - ANNOUNCEMENT -> /dashboard
 * - DEFAULT -> /dashboard (never falling back blindly to /profile)
 */
export function getNotificationDestination(n: NotificationRoutingTarget): string {
  if (!n) return '/dashboard';

  // 1. If explicit actionUrl exists
  if (n.actionUrl && typeof n.actionUrl === 'string') {
    const trimmed = n.actionUrl.trim();
    const isProfileType =
      (n.type || '').toUpperCase().includes('PROFILE') ||
      (n.entityType || '').toUpperCase().includes('PROFILE');

    // If actionUrl is not '/profile', or if it is intentionally a profile notification
    if (trimmed && (trimmed !== '/profile' || isProfileType)) {
      return trimmed;
    }
  }

  const rawType = (n.type || '').toUpperCase();
  const rawEntityType = (n.entityType || '').toUpperCase();
  const title = (n.title || '').toLowerCase();
  const message = (n.message || '').toLowerCase();
  const text = `${title} ${message}`;

  // 2. TEAM / TEAM_INVITE -> /teams
  if (
    rawType === 'TEAM' ||
    rawType === 'TEAM_INVITE' ||
    rawType === 'TEAM_INVITATION' ||
    rawEntityType === 'TEAM' ||
    rawEntityType === 'TEAM_INVITE' ||
    rawEntityType === 'TEAM_INVITATION' ||
    text.includes('team invite') ||
    text.includes('team invitation') ||
    text.includes('joined your team') ||
    text.includes('joined team') ||
    text.includes('team')
  ) {
    return '/teams';
  }

  // 3. EVENT_REGISTRATION -> /registrations
  if (
    rawType === 'EVENT_REGISTRATION' ||
    rawType === 'REGISTRATION' ||
    rawEntityType === 'EVENT_REGISTRATION' ||
    rawEntityType === 'REGISTRATION' ||
    text.includes('registration confirmed') ||
    text.includes('registration approved') ||
    text.includes('registration status') ||
    text.includes('event registration') ||
    text.includes('registered for')
  ) {
    return '/registrations';
  }

  // 4. EVENT -> /events or /events/:id
  if (
    rawType === 'EVENT' ||
    rawEntityType === 'EVENT' ||
    text.includes('hackathon') ||
    text.includes('competition') ||
    text.includes('workshop') ||
    text.includes('event')
  ) {
    if (n.entityId) {
      return `/events/${n.entityId}`;
    }
    return '/events';
  }

  // 5. RESUME -> /resume
  if (
    rawType === 'RESUME' ||
    rawEntityType === 'RESUME' ||
    text.includes('resume') ||
    text.includes('cv')
  ) {
    return '/resume';
  }

  // 6. VIDEO / SUBMISSION -> /intro-video
  if (
    rawType === 'VIDEO' ||
    rawType === 'SUBMISSION' ||
    rawEntityType === 'VIDEO' ||
    rawEntityType === 'SUBMISSION' ||
    text.includes('intro video') ||
    text.includes('video submission') ||
    text.includes('introduction video') ||
    text.includes('video review') ||
    text.includes('submission') ||
    text.includes('video')
  ) {
    return '/intro-video';
  }

  // 7. VOTING -> /voting or /voting/:campaignId
  if (
    rawType === 'VOTING' ||
    rawEntityType === 'VOTING' ||
    text.includes('election') ||
    text.includes('ballot') ||
    text.includes('candidate') ||
    text.includes('vote') ||
    text.includes('voting')
  ) {
    if (n.entityId) {
      return `/voting/${n.entityId}`;
    }
    return '/voting';
  }

  // 8. PORTFOLIO / PROJECTS / ACHIEVEMENTS / CERTIFICATES -> /portfolio
  if (
    rawType === 'PORTFOLIO' ||
    rawType === 'PROJECT' ||
    rawType === 'ACHIEVEMENT' ||
    rawType === 'CERTIFICATE' ||
    text.includes('portfolio') ||
    text.includes('project') ||
    text.includes('achievement') ||
    text.includes('certificate')
  ) {
    return '/portfolio';
  }

  // 9. ANNOUNCEMENT -> /dashboard
  if (
    rawType === 'ANNOUNCEMENT' ||
    rawEntityType === 'ANNOUNCEMENT' ||
    text.includes('announcement')
  ) {
    return '/dashboard';
  }

  // Fallback to actionUrl if provided (even if '/profile')
  if (n.actionUrl && typeof n.actionUrl === 'string' && n.actionUrl.trim()) {
    return n.actionUrl.trim();
  }

  // 10. DEFAULT -> /dashboard
  return '/dashboard';
}

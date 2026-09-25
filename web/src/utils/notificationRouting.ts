export interface NotificationRoutingTarget {
  id?: string | null;
  type?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  /** Common aliases used by notification providers and older API responses. */
  url?: string | null;
  href?: string | null;
  link?: string | null;
  targetUrl?: string | null;
  slug?: string | null;
  announcementId?: string | null;
  eventId?: string | null;
  campaignId?: string | null;
  teamId?: string | null;
  registrationId?: string | null;
  profileId?: string | null;
  rollNo?: string | null;
  title?: string | null;
  message?: string | null;
  content?: string | null;
}

const DEFAULT_DESTINATION = '/dashboard';

function textValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/**
 * Keep notification links inside the app unless the notification explicitly
 * contains an external http(s) URL. A root URL is not a useful notification
 * destination and is usually the result of a missing target in the producer.
 */
function normalizeExplicitDestination(value: unknown): string | null {
  const candidate = textValue(value);
  if (!candidate || candidate === '/') return null;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);

      // In the browser, a same-origin absolute URL can use the router without
      // causing a full page reload. Keep external URLs intact; the click
      // handlers below use window.location for those.
      if (typeof window !== 'undefined' && url.origin === window.location.origin) {
        const sameOriginPath = `${url.pathname}${url.search}${url.hash}`;
        return sameOriginPath === '/' ? null : sameOriginPath;
      }

      return url.pathname === '/' && !url.search && !url.hash ? null : candidate;
    } catch {
      return null;
    }
  }

  // Do not allow protocol-relative URLs to escape the portal.
  if (candidate.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(candidate)) {
    return null;
  }

  const path = candidate.startsWith('./') ? candidate.slice(2) : candidate;
  if (!path || path === '/') return null;
  return path.startsWith('/') ? path : `/${path.replace(/^\/+/, '')}`;
}

function explicitDestination(notification: NotificationRoutingTarget): string | null {
  const values = [
    notification.actionUrl,
    notification.url,
    notification.href,
    notification.link,
    notification.targetUrl,
  ];

  for (const value of values) {
    const destination = normalizeExplicitDestination(value);
    if (destination) return destination;
  }

  return null;
}

function token(value: unknown): string {
  return textValue(value)
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

function idValue(...values: unknown[]): string | null {
  for (const value of values) {
    const result = textValue(value);
    if (result) return result;
  }
  return null;
}

function encodedId(value: string): string {
  return encodeURIComponent(value);
}

function hasKind(value: unknown, ...expected: string[]): boolean {
  const normalized = token(value);
  return Boolean(normalized) && expected.some((kind) => normalized === kind || normalized.includes(kind));
}

function hasWord(text: string, ...words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function destinationForId(prefix: string, value: unknown): string {
  return `${prefix}/${encodedId(textValue(value))}`;
}

/**
 * Resolve a notification to the resource it describes.
 *
 * Explicit links always win. When an older notification has no link, the
 * entity/type fields are used to construct the corresponding portal route.
 * No branch returns `/`: a missing target should keep the user in the
 * authenticated portal, not silently discard the notification by sending
 * them to the public home.
 */
export function getNotificationDestination(notification: NotificationRoutingTarget): string {
  if (!notification) return DEFAULT_DESTINATION;

  const explicit = explicitDestination(notification);
  if (explicit) return explicit;

  const type = token(notification.type);
  const entityType = token(notification.entityType);
  const title = textValue(notification.title).toLowerCase();
  const message = textValue(notification.message || notification.content).toLowerCase();
  const text = `${title} ${message}`;
  const entityId = idValue(notification.entityId);
  const slug = idValue(notification.slug);

  // Announcements are resources in their own right. The API stores their
  // canonical link in actionUrl; entityId/announcementId also support legacy
  // records and provider payloads.
  if (
    Boolean(notification.announcementId) ||
    type.includes('ANNOUNCEMENT') ||
    entityType.includes('ANNOUNCEMENT') ||
    (!type && !entityType && text.includes('announcement'))
  ) {
    const announcementId = idValue(notification.announcementId, entityId, slug);
    return announcementId
      ? destinationForId('/announcements', announcementId)
      : DEFAULT_DESTINATION;
  }

  if (
    hasKind(type, 'REGISTRATION', 'EVENT_REGISTRATION') ||
    hasKind(entityType, 'REGISTRATION', 'EVENT_REGISTRATION') ||
    Boolean(notification.registrationId) ||
    text.includes('event registration') ||
    text.includes('registration confirmed') ||
    text.includes('registration approved')
  ) {
    // A registration ID is not an event ID. Only deep-link to an event when
    // the payload explicitly identifies the event; otherwise keep the user
    // in the registrations list rather than creating a broken event URL.
    const eventId = idValue(
      notification.eventId,
      slug,
      token(entityType) === 'EVENT' ? entityId : null,
    );
    return eventId ? destinationForId('/events', eventId) : '/registrations';
  }

  if (
    hasKind(type, 'EVENT') ||
    hasKind(entityType, 'EVENT') ||
    Boolean(notification.eventId) ||
    hasWord(text, 'hackathon', 'competition', 'workshop')
  ) {
    const eventId = idValue(notification.eventId, entityId, slug);
    return eventId ? destinationForId('/events', eventId) : '/events';
  }

  if (
    hasKind(type, 'VOTING', 'VOTE', 'ELECTION', 'CANDIDATE') ||
    hasKind(entityType, 'VOTING', 'VOTE', 'ELECTION', 'CANDIDATE') ||
    Boolean(notification.campaignId) ||
    hasWord(text, 'election', 'ballot')
  ) {
    const campaignId = idValue(notification.campaignId, entityId, slug);
    return campaignId ? destinationForId('/voting', campaignId) : '/voting';
  }

  if (
    hasKind(type, 'TEAM', 'TEAM_INVITE', 'TEAM_INVITATION') ||
    hasKind(entityType, 'TEAM', 'TEAM_INVITE', 'TEAM_INVITATION') ||
    Boolean(notification.teamId) ||
    hasWord(text, 'team invite', 'team invitation')
  ) {
    return '/teams';
  }

  if (
    hasKind(type, 'PROFILE', 'STUDENT_PROFILE') ||
    hasKind(entityType, 'PROFILE', 'STUDENT_PROFILE') ||
    Boolean(notification.rollNo || notification.profileId) ||
    hasWord(text, 'profile')
  ) {
    const rollNo = idValue(notification.rollNo);
    return rollNo ? destinationForId('/students', rollNo) : '/profile';
  }

  if (hasKind(type, 'RESUME', 'CV') || hasKind(entityType, 'RESUME', 'CV')) return '/resume';

  if (
    hasKind(type, 'VIDEO', 'INTRO_VIDEO', 'SUBMISSION') ||
    hasKind(entityType, 'VIDEO', 'INTRO_VIDEO', 'SUBMISSION') ||
    hasWord(text, 'intro video', 'video submission', 'introduction video')
  ) {
    return '/intro-video';
  }

  if (
    hasKind(type, 'PORTFOLIO', 'PROJECT', 'ACHIEVEMENT', 'CERTIFICATE', 'MODERATION') ||
    hasKind(entityType, 'PORTFOLIO', 'PROJECT', 'ACHIEVEMENT', 'CERTIFICATE', 'MODERATION') ||
    hasWord(text, 'portfolio', 'project', 'achievement', 'certificate')
  ) {
    return '/portfolio';
  }

  // Some legacy system notifications do not have a structured type. Use
  // conservative keyword fallbacks only after structured routing has failed.
  if (hasWord(text, 'team')) return '/teams';
  if (hasWord(text, 'vote', 'voting', 'election')) return '/voting';
  if (hasWord(text, 'resume', 'cv')) return '/resume';
  if (hasWord(text, 'video')) return '/intro-video';
  if (hasWord(text, 'event', 'hackathon', 'competition', 'workshop')) return '/events';
  if (hasWord(text, 'profile')) return '/profile';
  if (hasWord(text, 'portfolio', 'project', 'achievement', 'certificate')) return '/portfolio';

  return DEFAULT_DESTINATION;
}

/** Whether a resolved notification target is an external browser URL. */
export function isExternalNotificationDestination(destination: string): boolean {
  return /^https?:\/\//i.test(destination);
}

/** Navigate to a notification target without sending external links through the SPA router. */
export function navigateToNotification(
  destination: string,
  navigate: (path: string) => void,
): void {
  if (isExternalNotificationDestination(destination)) {
    if (typeof window !== 'undefined') window.location.assign(destination);
    return;
  }

  navigate(destination);
}

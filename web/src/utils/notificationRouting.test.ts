import { describe, expect, it, vi } from 'vitest';
import {
  getNotificationDestination,
  isExternalNotificationDestination,
  isSafeInternalDestination,
  navigateToNotification,
  type NotificationRoutingTarget,
} from '../utils/notificationRouting';

/**
 * Security regression tests for notification link handling.
 *
 * Notification payloads are written by many producers (the announcement
 * scheduler, event registration, team invites, and third-party providers) and
 * every one of them can put a URL in `actionUrl`. Those URLs reach
 * `navigate()` in three places, so a single producer storing
 * `//evil.example` or `/\evil.example` turns a click in the notification list
 * into a redirect off-origin. That is the open-redirect class of bug
 * (CVE-2025-68470 and the react-router-dom advisory of the same shape), so the
 * rejection cases below are the point of this file.
 */

/** Destinations that must never be handed to the router. */
const ESCAPES = [
  '//evil.example/path',
  '//evil.example',
  '/\\evil.example/path',
  '\\\\evil.example',
  '/\\/evil.example',
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
];

describe('isSafeInternalDestination', () => {
  it.each(ESCAPES)('rejects %s', (destination) => {
    expect(isSafeInternalDestination(destination)).toBe(false);
  });

  it.each([
    '/dashboard',
    '/students/23A91A1201',
    '/events/self-introduction-2026',
    '/portfolio/projects',
    '/announcements/abc-123',
    // A single leading slash followed by a backslash deeper in the path is fine;
    // only the second character matters.
    '/events/a\\b',
  ])('accepts %s', (destination) => {
    expect(isSafeInternalDestination(destination)).toBe(true);
  });

  it('rejects a bare scheme-like prefix even when it looks like a path', () => {
    expect(isSafeInternalDestination('http:/example.com')).toBe(false);
  });
});

describe('isExternalNotificationDestination', () => {
  it('recognises http and https regardless of case', () => {
    expect(isExternalNotificationDestination('http://example.com')).toBe(true);
    expect(isExternalNotificationDestination('HTTPS://example.com')).toBe(true);
  });

  it('does not treat a scheme-relative or backslash URL as merely external', () => {
    // These are the dangerous ones: `isExternal` is the only branch that is
    // allowed to touch window.location, so misclassifying them here is what
    // let them through before.
    expect(isExternalNotificationDestination('//evil.example')).toBe(false);
    expect(isExternalNotificationDestination('/\\evil.example')).toBe(false);
  });
});

describe('navigateToNotification', () => {
  it('pushes a normal internal path through the router', () => {
    const navigate = vi.fn();
    navigateToNotification('/voting/camp-1', navigate);

    expect(navigate).toHaveBeenCalledWith('/voting/camp-1');
  });

  it.each(ESCAPES)('never navigates or redirects for %s', (destination) => {
    const navigate = vi.fn();
    const assign = vi.fn();
    // jsdom's location.assign throws "not implemented"; swapping the method is
    // the only way to assert that it was *not* called.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });

    navigateToNotification(destination, navigate);

    expect(navigate).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('redirects a genuine external http(s) URL via the browser, not the router', () => {
    const navigate = vi.fn();
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });

    navigateToNotification('https://example.com/apply', navigate);

    expect(navigate).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('https://example.com/apply');
  });
});

describe('getNotificationDestination', () => {
  it('never resolves to the public home page', () => {
    // `/` would bounce a signed-in student out of the portal, and it is the
    // classic symptom of a producer that stored an unusable URL.
    const payloads: NotificationRoutingTarget[] = [
      { actionUrl: '/' },
      { url: '/' },
      { href: '/' },
      { actionUrl: '' },
      { actionUrl: '   ' },
      {},
      { type: 'ANNOUNCEMENT' },
      { type: 'REGISTRATION' },
    ];

    for (const payload of payloads) {
      expect(getNotificationDestination(payload)).not.toBe('/');
    }
  });

  it.each(ESCAPES)('falls back to a safe portal route for %s', (destination) => {
    const resolved = getNotificationDestination({ actionUrl: destination });

    expect(isSafeInternalDestination(resolved)).toBe(true);
  });

  it('routes a same-origin absolute URL back through the router', () => {
    const resolved = getNotificationDestination({
      actionUrl: `${window.location.origin}/voting/camp-9`,
    });

    expect(resolved).toBe('/voting/camp-9');
  });

  it('keeps an external absolute URL so the click can leave the app', () => {
    const resolved = getNotificationDestination({
      actionUrl: 'https://example.com/forms/apply',
    });

    expect(resolved).toBe('https://example.com/forms/apply');
    expect(isExternalNotificationDestination(resolved)).toBe(true);
  });

  it('normalises a relative link into an absolute path', () => {
    expect(getNotificationDestination({ actionUrl: './resume' })).toBe('/resume');
    expect(getNotificationDestination({ actionUrl: 'teams' })).toBe('/teams');
  });

  it('encodes ids so they cannot inject extra path segments', () => {
    const resolved = getNotificationDestination({
      type: 'ANNOUNCEMENT',
      announcementId: '../../admin',
    });

    expect(isSafeInternalDestination(resolved)).toBe(true);
    // The traversal separators are percent-encoded, so the id stays a single
    // path segment and cannot climb out of /announcements. The literal dots are
    // harmless once the slashes they depended on are gone.
    expect(resolved).toBe('/announcements/..%2F..%2Fadmin');
    expect(resolved.slice('/announcements/'.length)).not.toContain('/');
  });

  describe('structured routing', () => {
    it('routes a registration without an event id to the list, not a broken event URL', () => {
      expect(
        getNotificationDestination({ type: 'REGISTRATION', registrationId: 'reg-1' }),
      ).toBe('/registrations');
    });

    it('deep-links to the event when the payload identifies one', () => {
      expect(
        getNotificationDestination({
          type: 'REGISTRATION',
          registrationId: 'reg-1',
          eventId: 'self-introduction-2026',
        }),
      ).toBe('/events/self-introduction-2026');
    });

    it('routes video notifications to /intro-video, not the legacy /video alias', () => {
      expect(getNotificationDestination({ type: 'VIDEO' })).toBe('/intro-video');
      expect(getNotificationDestination({ type: 'INTRO_VIDEO' })).toBe('/intro-video');
    });

    it('prefers an explicit link over the structured fields', () => {
      expect(
        getNotificationDestination({ type: 'VIDEO', actionUrl: '/portfolio' }),
      ).toBe('/portfolio');
    });

    it('ignores an unusable explicit link and uses the structured fields', () => {
      // An empty or root link is noise from the producer, not a real target.
      expect(getNotificationDestination({ type: 'VOTING', actionUrl: '' })).toBe('/voting');
      expect(
        getNotificationDestination({ type: 'VOTING', campaignId: 'camp-2', actionUrl: '/' }),
      ).toBe('/voting/camp-2');
    });
  });
});

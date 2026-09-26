import { describe, expect, it, vi } from 'vitest';
import {
  getNotificationDestination,
  navigateToNotification,
  type NotificationRoutingTarget,
} from '../../web/src/utils/notificationRouting';

describe('notification destination resolution', () => {
  it('prefers an explicit action URL over type-based routing', () => {
    expect(
      getNotificationDestination({
        type: 'ANNOUNCEMENT',
        entityId: 'ann_123',
        actionUrl: '/events/event-123',
      }),
    ).toBe('/events/event-123');
  });

  it('supports common URL aliases', () => {
    expect(getNotificationDestination({ type: 'EVENT', url: '/events/from-url' })).toBe('/events/from-url');
    expect(getNotificationDestination({ type: 'EVENT', href: '/events/from-href' })).toBe('/events/from-href');
    expect(getNotificationDestination({ type: 'EVENT', targetUrl: '/events/from-target' })).toBe('/events/from-target');
  });

  it('builds announcement detail routes from IDs and slugs', () => {
    expect(getNotificationDestination({ type: 'ANNOUNCEMENT', entityId: 'ann_123' })).toBe(
      '/announcements/ann_123',
    );
    expect(getNotificationDestination({ announcementId: 'ann_legacy' })).toBe(
      '/announcements/ann_legacy',
    );
    expect(getNotificationDestination({ type: 'ANNOUNCEMENT', slug: 'department-update' })).toBe(
      '/announcements/department-update',
    );
  });

  it('routes registration notifications to the event only when an event ID is explicit', () => {
    expect(getNotificationDestination({ type: 'EVENT_REGISTRATION', registrationId: 'reg_123' })).toBe(
      '/registrations',
    );
    expect(getNotificationDestination({ type: 'EVENT_REGISTRATION', eventId: 'event_123' })).toBe(
      '/events/event_123',
    );
  });

  it('does not send a notification with a missing or root target to the homepage', () => {
    expect(getNotificationDestination({ type: 'ANNOUNCEMENT', actionUrl: '/' })).toBe('/dashboard');
    expect(getNotificationDestination({ type: 'UNKNOWN' })).toBe('/dashboard');
  });

  it('keeps external HTTP links intact and uses the SPA router for internal links', () => {
    expect(getNotificationDestination({ actionUrl: 'https://example.com/announcement' })).toBe(
      'https://example.com/announcement',
    );

    const navigate = vi.fn();
    navigateToNotification('/events/event-123', navigate);
    expect(navigate).toHaveBeenCalledWith('/events/event-123');
  });

  // Regression cover for the real payloads the backend writes. These mirror
  // `announcement.service.ts` (announcementActionUrl) and
  // `notification.service.ts` (INTRO_VIDEO_ACTION_URL) exactly as
  // GET /student/notifications serialises them, so a click is guaranteed to use
  // the stored target instead of falling back to the portal landing page.
  it('uses the stored actionUrl for announcement notifications as serialised by the API', () => {
    expect(
      getNotificationDestination({
        id: 'n_1',
        studentId: 's_1',
        type: 'ANNOUNCEMENT',
        title: 'Announcement: Hackathon Registrations Open',
        message: 'Registrations close on Friday.',
        actionUrl: '/announcements/ckq123abc',
        status: 'UNREAD',
        createdAt: '2026-09-26T10:00:00.000Z',
        readAt: null,
        isRead: false,
      }),
    ).toBe('/announcements/ckq123abc');
  });

  it('uses the stored actionUrl for intro-video moderation notifications', () => {
    expect(
      getNotificationDestination({
        id: 'n_2',
        type: 'MODERATION',
        title: 'New introduction video requested',
        message: 'Your introduction video needs to be changed.',
        actionUrl: '/intro-video',
        status: 'UNREAD',
        isRead: false,
      }),
    ).toBe('/intro-video');
  });

  it('never resolves a notification to the public homepage', () => {
    const payloads: NotificationRoutingTarget[] = [
      { type: 'ANNOUNCEMENT', actionUrl: '/announcements/a1' },
      { type: 'ANNOUNCEMENT' },
      { type: 'MODERATION', actionUrl: '/intro-video' },
      { type: 'MODERATION' },
      { type: 'EVENT', eventId: 'e1' },
      { type: 'EVENT' },
      { type: 'VOTING', campaignId: 'c1' },
      { type: 'PROFILE', rollNo: '21CS042' },
      { type: 'SYSTEM', title: 'Welcome' },
      {},
    ];

    for (const payload of payloads) {
      expect(getNotificationDestination(payload)).not.toBe('/');
    }
  });
});

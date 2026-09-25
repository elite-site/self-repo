import { describe, expect, it, vi } from 'vitest';
import {
  getNotificationDestination,
  navigateToNotification,
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
});

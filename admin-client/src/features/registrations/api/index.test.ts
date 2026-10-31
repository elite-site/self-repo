import { describe, expect, it } from 'vitest';
import { registrationsApi } from './index';

describe('registrationsApi export URLs', () => {
  it('points the submissions export at the canonical /admin/api/submissions/export', () => {
    expect(registrationsApi.getSubmissionsExportUrl('event 1')).toBe(
      '/admin/api/submissions/export?eventId=event%201'
    );
  });

  it('falls back to the canonical submissions export without an event filter', () => {
    expect(registrationsApi.getSubmissionsExportUrl()).toBe('/admin/api/submissions/export?eventId=');
  });

  it('keeps the roster export on /admin/api/students/export', () => {
    expect(registrationsApi.getStudentsExportUrl('event-2')).toBe(
      '/admin/api/students/export?eventId=event-2'
    );
  });

  it('keeps the registrations export filters intact', () => {
    expect(
      registrationsApi.getRegistrationsExportUrl({ eventId: 'event-3', status: 'CONFIRMED' })
    ).toBe('/admin/api/registrations/export?eventId=event-3&status=CONFIRMED');
  });

  it('keeps the activity log export path', () => {
    expect(registrationsApi.getActivityLogsExportUrl()).toBe('/admin/api/activity-logs/export');
  });
});

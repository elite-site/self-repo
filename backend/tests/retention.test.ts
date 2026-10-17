import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseRetentionDays,
  batchDelete,
  runRetentionCleanup,
  RETENTION_DEFAULTS,
  RETENTION_SETTING_KEYS,
} from '../src/modules/admin/services/retention.service';
import { RetentionRepository } from '../src/modules/admin/repositories/retention.repository';
import { NotificationStatus } from '@prisma/client';

describe('Retention Service (D2)', () => {
  describe('parseRetentionDays and bounds enforcement', () => {
    it('returns default when value is undefined or null', () => {
      expect(parseRetentionDays(undefined, 60)).toBe(60);
      expect(parseRetentionDays(null, 90)).toBe(90);
      expect(parseRetentionDays('', 180)).toBe(180);
    });

    it('returns default when value is not a valid number', () => {
      expect(parseRetentionDays('abc', 60)).toBe(60);
      expect(parseRetentionDays('NaN', 90)).toBe(90);
    });

    it('enforces minimum 14 days when configured value is too low', () => {
      expect(parseRetentionDays('5', 60)).toBe(14);
      expect(parseRetentionDays('0', 60)).toBe(14);
      expect(parseRetentionDays('-10', 60)).toBe(14);
      expect(parseRetentionDays('13', 60)).toBe(14);
      expect(parseRetentionDays('14', 60)).toBe(14);
    });

    it('accepts valid overrides above 14 days', () => {
      expect(parseRetentionDays('30', 60)).toBe(30);
      expect(parseRetentionDays('120', 60)).toBe(120);
    });
  });

  describe('batchDelete loop', () => {
    it('terminates immediately if first batch is empty', async () => {
      const fetchIds = vi.fn().mockResolvedValue([]);
      const deleteByIds = vi.fn().mockResolvedValue(0);

      const total = await batchDelete(fetchIds, deleteByIds, 1000, 0);

      expect(total).toBe(0);
      expect(fetchIds).toHaveBeenCalledTimes(1);
      expect(deleteByIds).not.toHaveBeenCalled();
    });

    it('terminates after one batch if count is less than batchSize', async () => {
      const ids = ['id1', 'id2', 'id3'];
      const fetchIds = vi.fn().mockResolvedValue(ids);
      const deleteByIds = vi.fn().mockResolvedValue(3);

      const total = await batchDelete(fetchIds, deleteByIds, 1000, 0);

      expect(total).toBe(3);
      expect(fetchIds).toHaveBeenCalledTimes(1);
      expect(deleteByIds).toHaveBeenCalledWith(ids);
    });

    it('processes multiple batches until fewer than batchSize rows remain', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => `id_b1_${i}`);
      const batch2 = Array.from({ length: 100 }, (_, i) => `id_b2_${i}`);
      const batch3 = Array.from({ length: 45 }, (_, i) => `id_b3_${i}`);

      const fetchIds = vi
        .fn()
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce(batch3);

      const deleteByIds = vi
        .fn()
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(45);

      const total = await batchDelete(fetchIds, deleteByIds, 100, 0);

      expect(total).toBe(245);
      expect(fetchIds).toHaveBeenCalledTimes(3);
      expect(deleteByIds).toHaveBeenCalledTimes(3);
    });
  });

  describe('runRetentionCleanup full workflow', () => {
    let mockRepo: RetentionRepository;

    beforeEach(() => {
      mockRepo = {
        findNotificationIds: vi.fn().mockResolvedValue([]),
        deleteNotificationsByIds: vi.fn().mockResolvedValue(0),
        findActivityLogIds: vi.fn().mockResolvedValue([]),
        deleteActivityLogsByIds: vi.fn().mockResolvedValue(0),
        findGithubSyncLogIds: vi.fn().mockResolvedValue([]),
        deleteGithubSyncLogsByIds: vi.fn().mockResolvedValue(0),
        findEmailLogIds: vi.fn().mockResolvedValue([]),
        deleteEmailLogsByIds: vi.fn().mockResolvedValue(0),
        findPortalSettings: vi.fn().mockResolvedValue({}),
      } as unknown as RetentionRepository;
    });

    it('uses default cutoffs when no PortalSettings are configured', async () => {
      const fixedNow = new Date('2026-10-17T12:00:00Z');

      await runRetentionCleanup(mockRepo, fixedNow, 0);

      // Check Notification query 1: READ notifications older than 60 days
      const expectedReadCutoff = new Date(fixedNow.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findNotificationIds).toHaveBeenNthCalledWith(
        1,
        { createdAt: { lt: expectedReadCutoff }, status: NotificationStatus.READ },
        RETENTION_DEFAULTS.BATCH_SIZE
      );

      // Check Notification query 2: All notifications older than 180 days
      const expectedAllCutoff = new Date(fixedNow.getTime() - 180 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findNotificationIds).toHaveBeenNthCalledWith(
        2,
        { createdAt: { lt: expectedAllCutoff } },
        RETENTION_DEFAULTS.BATCH_SIZE
      );

      // Check ActivityLog query: older than 90 days
      const expectedActivityCutoff = new Date(fixedNow.getTime() - 90 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findActivityLogIds).toHaveBeenCalledWith(
        expectedActivityCutoff,
        RETENTION_DEFAULTS.BATCH_SIZE
      );

      // Check GithubSyncLog query: older than 60 days
      const expectedGithubCutoff = new Date(fixedNow.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findGithubSyncLogIds).toHaveBeenCalledWith(
        expectedGithubCutoff,
        RETENTION_DEFAULTS.BATCH_SIZE
      );

      // Check EmailLog query: older than 60 days
      const expectedEmailCutoff = new Date(fixedNow.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findEmailLogIds).toHaveBeenCalledWith(
        expectedEmailCutoff,
        RETENTION_DEFAULTS.BATCH_SIZE
      );
    });

    it('respects PortalSettings overrides and bounds', async () => {
      const fixedNow = new Date('2026-10-17T12:00:00Z');
      (mockRepo.findPortalSettings as any).mockResolvedValue({
        [RETENTION_SETTING_KEYS.NOTIFICATIONS_READ_DAYS]: '30',
        [RETENTION_SETTING_KEYS.NOTIFICATIONS_ALL_DAYS]: '5', // Below 14 -> must clamp to 14
        [RETENTION_SETTING_KEYS.ACTIVITY_LOG_DAYS]: '45',
        [RETENTION_SETTING_KEYS.GITHUB_SYNC_LOG_DAYS]: '20',
        [RETENTION_SETTING_KEYS.EMAIL_LOG_DAYS]: '15',
      });

      await runRetentionCleanup(mockRepo, fixedNow, 0);

      // Read notifications: 30 days
      const expectedReadCutoff = new Date(fixedNow.getTime() - 30 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findNotificationIds).toHaveBeenNthCalledWith(
        1,
        { createdAt: { lt: expectedReadCutoff }, status: NotificationStatus.READ },
        RETENTION_DEFAULTS.BATCH_SIZE
      );

      // All notifications: clamped to 14 days minimum
      const expectedAllCutoff = new Date(fixedNow.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findNotificationIds).toHaveBeenNthCalledWith(
        2,
        { createdAt: { lt: expectedAllCutoff } },
        RETENTION_DEFAULTS.BATCH_SIZE
      );

      // ActivityLog: 45 days
      const expectedActivityCutoff = new Date(fixedNow.getTime() - 45 * 24 * 60 * 60 * 1000);
      expect(mockRepo.findActivityLogIds).toHaveBeenCalledWith(
        expectedActivityCutoff,
        RETENTION_DEFAULTS.BATCH_SIZE
      );
    });

    it('never touches unread recent notifications', async () => {
      const fixedNow = new Date('2026-10-17T12:00:00Z');

      // Given read notifications to delete, and zero all-notifications (no old unread)
      (mockRepo.findNotificationIds as any)
        .mockResolvedValueOnce(['read_old_1', 'read_old_2'])
        .mockResolvedValueOnce([]); // no allNotifications older than 180 days

      (mockRepo.deleteNotificationsByIds as any).mockResolvedValue(2);

      const result = await runRetentionCleanup(mockRepo, fixedNow, 0);

      expect(result.readNotificationsDeleted).toBe(2);
      expect(result.allNotificationsDeleted).toBe(0);

      // Unread notifications created recently (e.g. within 180 days) are never queried without status: READ
      const firstCall = (mockRepo.findNotificationIds as any).mock.calls[0][0];
      expect(firstCall.status).toBe(NotificationStatus.READ);
    });
  });
});

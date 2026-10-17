import { NotificationStatus } from '@prisma/client';
import { RetentionRepository, retentionRepository } from '../repositories/retention.repository';
import { logger } from '../../../utils/logger';

export const RETENTION_DEFAULTS = {
  NOTIFICATIONS_READ_DAYS: 60,
  NOTIFICATIONS_ALL_DAYS: 180,
  ACTIVITY_LOG_DAYS: 90,
  GITHUB_SYNC_LOG_DAYS: 60,
  EMAIL_LOG_DAYS: 60,
  BATCH_SIZE: 1000,
  BATCH_PAUSE_MS: 50,
  MIN_DAYS: 14,
} as const;

export const RETENTION_SETTING_KEYS = {
  NOTIFICATIONS_READ_DAYS: 'retention.notifications.readDays',
  NOTIFICATIONS_ALL_DAYS: 'retention.notifications.allDays',
  ACTIVITY_LOG_DAYS: 'retention.activityLog.days',
  GITHUB_SYNC_LOG_DAYS: 'retention.githubSyncLog.days',
  EMAIL_LOG_DAYS: 'retention.emailLog.days',
} as const;

export interface RetentionCleanupResult {
  readNotificationsDeleted: number;
  allNotificationsDeleted: number;
  activityLogsDeleted: number;
  githubSyncLogsDeleted: number;
  emailLogsDeleted: number;
  durationMs: number;
}

export function parseRetentionDays(value: string | undefined | null, defaultDays: number): number {
  if (!value) return defaultDays;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultDays;
  return Math.max(parsed, RETENTION_DEFAULTS.MIN_DAYS);
}

export async function batchDelete(
  fetchIds: (take: number) => Promise<string[]>,
  deleteByIds: (ids: string[]) => Promise<number>,
  batchSize: number = RETENTION_DEFAULTS.BATCH_SIZE,
  pauseMs: number = RETENTION_DEFAULTS.BATCH_PAUSE_MS
): Promise<number> {
  let totalDeleted = 0;
  while (true) {
    const ids = await fetchIds(batchSize);
    if (!ids || ids.length === 0) break;

    const count = await deleteByIds(ids);
    totalDeleted += count;

    if (ids.length < batchSize) break;

    if (pauseMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }
  return totalDeleted;
}

export async function runRetentionCleanup(
  repo: RetentionRepository = retentionRepository,
  now: Date = new Date(),
  pauseMs: number = RETENTION_DEFAULTS.BATCH_PAUSE_MS
): Promise<RetentionCleanupResult> {
  const startTime = Date.now();

  // Read overrides from PortalSettings
  const settingKeys = [
    RETENTION_SETTING_KEYS.NOTIFICATIONS_READ_DAYS,
    RETENTION_SETTING_KEYS.NOTIFICATIONS_ALL_DAYS,
    RETENTION_SETTING_KEYS.ACTIVITY_LOG_DAYS,
    RETENTION_SETTING_KEYS.GITHUB_SYNC_LOG_DAYS,
    RETENTION_SETTING_KEYS.EMAIL_LOG_DAYS,
  ];

  let settings: Record<string, string> = {};
  try {
    settings = await repo.findPortalSettings(settingKeys);
  } catch (err) {
    // Non-fatal: if reading settings fails, proceed with defaults
    logger.warn('[Retention] Failed to fetch retention portal settings, using defaults', { err });
  }

  const readNotifDays = parseRetentionDays(
    settings[RETENTION_SETTING_KEYS.NOTIFICATIONS_READ_DAYS],
    RETENTION_DEFAULTS.NOTIFICATIONS_READ_DAYS
  );
  const allNotifDays = parseRetentionDays(
    settings[RETENTION_SETTING_KEYS.NOTIFICATIONS_ALL_DAYS],
    RETENTION_DEFAULTS.NOTIFICATIONS_ALL_DAYS
  );
  const activityDays = parseRetentionDays(
    settings[RETENTION_SETTING_KEYS.ACTIVITY_LOG_DAYS],
    RETENTION_DEFAULTS.ACTIVITY_LOG_DAYS
  );
  const githubDays = parseRetentionDays(
    settings[RETENTION_SETTING_KEYS.GITHUB_SYNC_LOG_DAYS],
    RETENTION_DEFAULTS.GITHUB_SYNC_LOG_DAYS
  );
  const emailDays = parseRetentionDays(
    settings[RETENTION_SETTING_KEYS.EMAIL_LOG_DAYS],
    RETENTION_DEFAULTS.EMAIL_LOG_DAYS
  );

  const cutoffReadNotif = new Date(now.getTime() - readNotifDays * 24 * 60 * 60 * 1000);
  const cutoffAllNotif = new Date(now.getTime() - allNotifDays * 24 * 60 * 60 * 1000);
  const cutoffActivity = new Date(now.getTime() - activityDays * 24 * 60 * 60 * 1000);
  const cutoffGithub = new Date(now.getTime() - githubDays * 24 * 60 * 60 * 1000);
  const cutoffEmail = new Date(now.getTime() - emailDays * 24 * 60 * 60 * 1000);

  // 1. READ Notifications older than cutoff
  const readNotificationsDeleted = await batchDelete(
    (take) => repo.findNotificationIds({ createdAt: { lt: cutoffReadNotif }, status: NotificationStatus.READ }, take),
    (ids) => repo.deleteNotificationsByIds(ids),
    RETENTION_DEFAULTS.BATCH_SIZE,
    pauseMs
  );

  // 2. Any Notification older than allNotif cutoff (e.g. 180 days)
  const allNotificationsDeleted = await batchDelete(
    (take) => repo.findNotificationIds({ createdAt: { lt: cutoffAllNotif } }, take),
    (ids) => repo.deleteNotificationsByIds(ids),
    RETENTION_DEFAULTS.BATCH_SIZE,
    pauseMs
  );

  // 3. ActivityLog older than cutoff (e.g. 90 days)
  const activityLogsDeleted = await batchDelete(
    (take) => repo.findActivityLogIds(cutoffActivity, take),
    (ids) => repo.deleteActivityLogsByIds(ids),
    RETENTION_DEFAULTS.BATCH_SIZE,
    pauseMs
  );

  // 4. GithubSyncLog older than cutoff (e.g. 60 days)
  const githubSyncLogsDeleted = await batchDelete(
    (take) => repo.findGithubSyncLogIds(cutoffGithub, take),
    (ids) => repo.deleteGithubSyncLogsByIds(ids),
    RETENTION_DEFAULTS.BATCH_SIZE,
    pauseMs
  );

  // 5. EmailLog older than cutoff (e.g. 60 days)
  const emailLogsDeleted = await batchDelete(
    (take) => repo.findEmailLogIds(cutoffEmail, take),
    (ids) => repo.deleteEmailLogsByIds(ids),
    RETENTION_DEFAULTS.BATCH_SIZE,
    pauseMs
  );

  const durationMs = Date.now() - startTime;

  // Log counts with logger only (do not write to ActivityLog from retention cleanup)
  logger.info('[Retention] Retention cleanup completed successfully', {
    readNotificationsDeleted,
    allNotificationsDeleted,
    activityLogsDeleted,
    githubSyncLogsDeleted,
    emailLogsDeleted,
    durationMs,
  });

  return {
    readNotificationsDeleted,
    allNotificationsDeleted,
    activityLogsDeleted,
    githubSyncLogsDeleted,
    emailLogsDeleted,
    durationMs,
  };
}

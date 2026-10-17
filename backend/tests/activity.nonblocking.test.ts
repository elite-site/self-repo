import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityService, logActivityNonBlocking } from '../src/modules/admin/services/activity.service';
import * as activityLogRepo from '../src/modules/admin/repositories/activity-log.repository';
import { logger } from '../src/utils/logger';

describe('Non-blocking Activity Logging (D7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to repository without blocking caller', async () => {
    const createSpy = vi.spyOn(activityLogRepo, 'createActivityLog').mockResolvedValue({} as any);

    ActivityService.logNonBlocking({
      category: 'AUTH',
      action: 'Student login',
      userEmail: 'student@example.com',
    });

    // Wait a tick for promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'AUTH',
        action: 'Student login',
        userEmail: 'student@example.com',
      })
    );
  });

  it('catches repository failure and logs warning without throwing or failing caller', async () => {
    const dbError = new Error('Database connection timeout on pgbouncer');
    vi.spyOn(activityLogRepo, 'createActivityLog').mockRejectedValue(dbError);
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    // Must not throw synchronously
    expect(() => {
      logActivityNonBlocking({
        category: 'FILE_UPLOAD',
        action: 'Video upload completed',
        details: 'student_123',
      });
    }).not.toThrow();

    // Wait a tick for async rejection handler to run
    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ActivityService]'),
      expect.objectContaining({
        action: 'Video upload completed',
        category: 'FILE_UPLOAD',
      })
    );
  });
});

import { ActivityStatus } from '@prisma/client';
import { INTERNAL_EVENT_ID } from '../../../config/constants';
import { createActivityLog } from '../repositories/activity-log.repository';
import { logger } from '../../../utils/logger';

export interface LogActivityParams {
  eventId?: string;
  category: 'APPLICATION' | 'ADMIN' | 'FILE_UPLOAD' | 'EMAIL' | 'GOOGLE_DRIVE' | 'DATABASE' | 'AUTH';
  action: string;
  details?: string;
  userEmail?: string;
  applicantName?: string;
  status?: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  errorMessage?: string;
}

export class ActivityService {
  /**
   * Records a new activity audit log entry for audit and security purposes.
   */
  public static async log(params: LogActivityParams): Promise<void> {
    try {
      await createActivityLog({
        eventId: params.eventId || INTERNAL_EVENT_ID,
        category: params.category,
        action: params.action,
        details: params.details || null,
        userEmail: params.userEmail || null,
        applicantName: params.applicantName || null,
        status: (params.status || 'SUCCESS') as ActivityStatus,
        errorMessage: params.errorMessage || null,
      });
    } catch (err) {
      logger.warn('[ActivityService] Failed to record activity log', {
        err,
        action: params.action,
        category: params.category,
      });
    }
  }

  /**
   * Dispatches an activity log asynchronously without awaiting it on the caller request path.
   * Catches any failures and logs with logger at warn level so student requests are never delayed or failed.
   */
  public static logNonBlocking(params: LogActivityParams): void {
    void this.log(params).catch((err) => {
      logger.warn('[ActivityService] Non-blocking activity log failed', {
        err,
        action: params.action,
        category: params.category,
      });
    });
  }
}

export const logActivityNonBlocking = ActivityService.logNonBlocking.bind(ActivityService);

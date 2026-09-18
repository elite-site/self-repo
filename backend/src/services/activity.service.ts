import { ActivityStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

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
   * Records a new activity audit log entry safely without blocking caller execution
   */
  public static async log(params: LogActivityParams): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          eventId: params.eventId || 'self-introduction-2026',
          category: params.category,
          action: params.action,
          details: params.details || null,
          userEmail: params.userEmail || null,
          applicantName: params.applicantName || null,
          status: (params.status || 'SUCCESS') as ActivityStatus,
          errorMessage: params.errorMessage || null,
        },
      });
    } catch (err) {
      console.error('[ActivityService] Failed to record activity log:', err);
    }
  }
}

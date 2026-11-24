import * as migrationRepo from '../repositories/migration.repository';
import { isAutoMigratePending, isProductionEnv } from '../../../config/env';
import { logger } from '../../../utils/logger';

export async function autoMigratePendingItems(): Promise<void> {
  if (isProductionEnv() || !isAutoMigratePending()) return;
  try {
    const [resumeRes, achRes, certRes, profRes] = await migrationRepo.approvePendingBacklog();
    if (resumeRes.count > 0 || achRes.count > 0 || certRes.count > 0 || profRes.count > 0) {
      logger.info('[Auto-Approval] Backlog migrated to APPROVED', {
        resumes: resumeRes.count,
        achievements: achRes.count,
        certificates: certRes.count,
        profiles: profRes.count,
      });
    }
  } catch (err) {
    // Non-fatal: startup migration is best-effort and must not block server boot.
    logger.warn('[Auto-Approval] Startup migration skipped or encountered error', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

import * as migrationRepo from '../repositories/migration.repository';

export async function autoMigratePendingItems(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.AUTO_MIGRATE_PENDING !== 'true') return;
  try {
    const [resumeRes, achRes, certRes, profRes] = await migrationRepo.approvePendingBacklog();
    if (resumeRes.count > 0 || achRes.count > 0 || certRes.count > 0 || profRes.count > 0) {
      console.log(
        `[Auto-Approval] Backlog migrated to APPROVED: ${resumeRes.count} resumes, ${achRes.count} achievements, ${certRes.count} certificates, ${profRes.count} profiles set public.`
      );
    }
  } catch (err: any) {
    console.warn('[Auto-Approval] Startup migration skipped or encountered error:', err?.message || err);
  }
}

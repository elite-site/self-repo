import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { driveService } from '../src/services/drive.service';

async function main() {
  const targetFileId = process.argv[2];
  if (targetFileId) {
    console.log(`[Script] Clearing copy protection for file ID: ${targetFileId}...`);
    const ok = await driveService.clearCopyRequiresWriterPermission(targetFileId);
    if (ok) {
      console.log(`[Script] Successfully cleared copyRequiresWriterPermission on ${targetFileId}`);
    } else {
      console.error(`[Script] Failed to clear copyRequiresWriterPermission on ${targetFileId}`);
      process.exitCode = 1;
    }
    return;
  }

  console.log('[Script] Clearing copy protection on all database media files in Google Drive...');
  const result = await driveService.clearAllFilesCopyProtection();
  console.log(`[Script] Finished. Updated: ${result.count}, Failed: ${result.failed}`);
}

main().catch((err) => {
  console.error('[Script] Fatal error:', err);
  process.exitCode = 1;
});

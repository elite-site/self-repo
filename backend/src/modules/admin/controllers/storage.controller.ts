import { Request, Response } from 'express';
import * as adminService from '../admin.service';

export async function getStorage(_req: Request, res: Response): Promise<void> {
  const storage = await adminService.getStorageInfo();
  res.json(storage);
}

export async function clearStorageCache(_req: Request, res: Response): Promise<void> {
  await adminService.clearStorageCache();
  res.json({ success: true, message: 'Drive folder cache purged successfully.' });
}

export async function ensureViewerPermissions(_req: Request, res: Response): Promise<void> {
  const { count, failed } = await adminService.ensureViewerPermissions();
  res.json({
    success: true,
    message:
      failed > 0
        ? `Viewer access applied to ${count} item(s); ${failed} could not be updated.`
        : `Viewer access applied to ${count} item(s).`,
    count,
    failed,
  });
}

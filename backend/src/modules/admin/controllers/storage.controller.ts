import { Request, Response } from 'express';
import * as adminService from '../admin.service';

export async function getStorage(_req: Request, res: Response): Promise<void> {
  try {
    const storage = await adminService.getStorageInfo();
    res.json(storage);
  } catch (err: any) {
    console.error('Error fetching storage:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function clearStorageCache(_req: Request, res: Response): Promise<void> {
  try {
    await adminService.clearStorageCache();
    res.json({ success: true, message: 'Drive folder cache purged successfully.' });
  } catch (err: any) {
    console.error('Error clearing storage cache:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

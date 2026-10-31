import { Request, Response } from 'express';
import * as adminService from '../admin.service';

export async function getStats(req: Request, res: Response): Promise<void> {
  const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
  const { data, cached } = await adminService.getAdminStats(eventId);

  if (cached) {
    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
  }
  res.json(data);
}

export async function getPortalAnalytics(_req: Request, res: Response): Promise<void> {
  const analytics = await adminService.getPortalAnalytics();
  res.json(analytics);
}

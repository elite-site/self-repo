import { Request, Response } from 'express';
import * as adminService from '../admin.service';

export async function getPortalSettings(_req: Request, res: Response): Promise<void> {
  const result = await adminService.getPortalSettings();
  res.json(result);
}

export async function updatePortalSettings(req: Request, res: Response): Promise<void> {
  await adminService.savePortalSettings(req.body, req.adminUser?.username);
  res.json({ success: true, message: 'Settings saved successfully' });
}

export async function listPortalAnnouncements(_req: Request, res: Response): Promise<void> {
  const announcements = await adminService.listPortalAnnouncements();
  res.json(announcements);
}

export async function createPortalAnnouncement(req: Request, res: Response): Promise<void> {
  const announcement = await adminService.createPortalAnnouncement(req.body, req.adminUser?.username);
  res.status(201).json(announcement);
}

export async function publishPortalAnnouncement(req: Request, res: Response): Promise<void> {
  const announcement = await adminService.publishPortalAnnouncement(req.params.id);
  res.json(announcement);
}

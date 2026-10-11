import { Request, Response } from 'express';
import { ActivityService } from '../admin';
import { NotFoundError } from '../../utils/appError';
import * as service from './announcements.service';

export async function listAnnouncements(_req: Request, res: Response) {
  const announcements = await service.listAnnouncements();
  res.json(announcements);
}

export async function getAudiencePreview(req: Request, res: Response) {
  const audience = req.query.audience as string | undefined;
  const preview = await service.getAudiencePreview(audience);
  res.json(preview);
}

export async function createAnnouncement(req: Request, res: Response) {
  const createdBy =
    (req as any).adminUser?.username || (req as any).user?.username || 'admin';
  const announcement = await service.createAnnouncement({
    ...req.body,
    createdBy,
  });
  res.status(201).json(announcement);
}

export async function publishAnnouncement(req: Request, res: Response) {
  const result = await service.publishAnnouncement(req.params.id);
  if ('notFound' in result) {
    throw new NotFoundError('Announcement not found');
  }
  res.json(result.announcement);
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const { id } = req.params;
  const result = await service.deleteAnnouncement(id);
  if ('notFound' in result) {
    throw new NotFoundError('Announcement not found');
  }

  await ActivityService.log({
    category: 'ADMIN',
    action: 'Admin deleted announcement',
    details: `Removed announcement "${result.announcement.title}" and ${result.deletedNotificationsCount} student notification(s)`,
    status: 'WARNING',
  });

  res.json({
    success: true,
    message: 'Announcement and its student notifications were deleted.',
    deletedNotifications: result.deletedNotificationsCount,
  });
}

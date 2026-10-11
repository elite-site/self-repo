import { Request, Response } from 'express';
import { httpError } from '../../middleware/apiError';
import { ActivityService } from '../../services/activity.service';
import * as service from './announcements.service';

export async function listAnnouncements(req: Request, res: Response) {
  try {
    const announcements = await service.listAnnouncements();
    res.json(announcements);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getAudiencePreview(req: Request, res: Response) {
  try {
    const audience = req.query.audience as string | undefined;
    const preview = await service.getAudiencePreview(audience);
    res.json(preview);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function createAnnouncement(req: Request, res: Response) {
  try {
    const createdBy =
      (req as any).adminUser?.username || (req as any).user?.username || 'admin';
    const announcement = await service.createAnnouncement({
      ...req.body,
      createdBy,
    });
    res.status(201).json(announcement);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function publishAnnouncement(req: Request, res: Response) {
  try {
    const result = await service.publishAnnouncement(req.params.id);
    if ('notFound' in result) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
    }
    res.json(result.announcement);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}

export async function deleteAnnouncement(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await service.deleteAnnouncement(id);
    if ('notFound' in result) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
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
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

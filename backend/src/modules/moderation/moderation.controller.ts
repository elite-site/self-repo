import { Request, Response } from 'express';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/appError';
import * as service from './moderation.service';

export async function listModerationItems(req: Request, res: Response): Promise<void> {
  const rawType = String(req.query.type || 'all');
  const rawStatus = String(req.query.status || 'ALL');
  const result = await service.getUnifiedModerationItems(rawType, rawStatus);
  res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
  res.json(result);
}

export async function getVideoQueue(_req: Request, res: Response): Promise<void> {
  const result = await service.getVideoModerationQueue();
  res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
  res.json(result);
}

export async function getResumeQueue(_req: Request, res: Response): Promise<void> {
  const result = await service.getResumeModerationQueue();
  res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
  res.json(result);
}

export async function getAchievementQueue(_req: Request, res: Response): Promise<void> {
  const result = await service.getAchievementModerationQueue();
  res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
  res.json(result);
}

export async function getCertificateQueue(_req: Request, res: Response): Promise<void> {
  const result = await service.getCertificateModerationQueue();
  res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
  res.json(result);
}

export async function moderateVideo(req: Request, res: Response): Promise<void> {
  const { action, reason, publish } = req.body;
  const adminUser = (req as any).adminUser;
  const result = await service.moderateVideo(req.params.id, action, reason, publish, adminUser);
  res.json({ message: 'Success', video: result.video, isPublic: result.isPublic });
}

export async function updateVideoVisibility(req: Request, res: Response): Promise<void> {
  const { isPublic } = req.body || {};
  if (typeof isPublic !== 'boolean') {
    throw new ValidationError('isPublic must be true or false');
  }
  try {
    const updated = await service.updateVideoVisibility(req.params.id, isPublic);
    res.json({
      success: true,
      video: updated,
      message: isPublic
        ? 'Video is now visible on the public page.'
        : 'Video has been removed from the public page.',
    });
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      throw new NotFoundError(err.message || 'Video not found');
    }
    if (err.statusCode === 409 || err.code === 'NOT_APPROVED') {
      throw new ConflictError(err.message || 'Video must be approved before publishing');
    }
    throw err;
  }
}

export async function moderateResume(req: Request, res: Response): Promise<void> {
  const { action, reason } = req.body;
  await service.moderateResume(req.params.id, action, reason);
  res.json({ message: 'Success' });
}

export async function moderateAchievement(req: Request, res: Response): Promise<void> {
  const { action, reason } = req.body;
  const updated = await service.moderateAchievement(req.params.id, action, reason);
  res.json({ message: 'Success', achievement: updated });
}

// Portal controllers
export async function getPortalModeration(_req: Request, res: Response): Promise<void> {
  const result = await service.getPortalModerationItems();
  res.json(result);
}

export async function portalApprove(req: Request, res: Response): Promise<void> {
  await service.handlePortalModerationDecision(req.params.type, req.params.id, 'APPROVED', req.body.reason);
  res.json({ success: true, message: 'Item approved' });
}

export async function portalReject(req: Request, res: Response): Promise<void> {
  await service.handlePortalModerationDecision(req.params.type, req.params.id, 'REJECTED', req.body.reason);
  res.json({ success: true, message: 'Item rejected' });
}

export async function portalRequestChanges(req: Request, res: Response): Promise<void> {
  await service.handlePortalModerationDecision(req.params.type, req.params.id, 'CHANGES_REQUESTED', req.body.reason);
  res.json({ success: true, message: 'Changes requested' });
}

export async function portalHide(req: Request, res: Response): Promise<void> {
  await service.handlePortalModerationDecision(req.params.type, req.params.id, 'HIDDEN', req.body.reason);
  res.json({ success: true, message: 'Item hidden' });
}

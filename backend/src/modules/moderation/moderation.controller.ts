import { Request, Response } from 'express';
import { httpError } from '../../middleware/apiError';
import * as service from './moderation.service';

export async function listModerationItems(req: Request, res: Response): Promise<Response | void> {
  try {
    const rawType = String(req.query.type || 'all');
    const rawStatus = String(req.query.status || 'ALL');
    const result = await service.getUnifiedModerationItems(rawType, rawStatus);
    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    res.json(result);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getVideoQueue(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getVideoModerationQueue();
    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    res.json(result);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getResumeQueue(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getResumeModerationQueue();
    res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
    res.json(result);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getAchievementQueue(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getAchievementModerationQueue();
    res.json(result);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getCertificateQueue(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getCertificateModerationQueue();
    res.json(result);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function moderateVideo(req: Request, res: Response): Promise<Response | void> {
  try {
    const { action, reason, publish } = req.body;
    const adminUser = (req as any).adminUser;
    const result = await service.moderateVideo(req.params.id, action, reason, publish, adminUser);
    res.json({ message: 'Success', video: result.video, isPublic: result.isPublic });
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return httpError(res, 404, err, 'NOT_FOUND');
    }
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function updateVideoVisibility(req: Request, res: Response): Promise<Response | void> {
  try {
    const { isPublic } = req.body || {};
    if (typeof isPublic !== 'boolean') {
      return httpError(res, 400, new Error('isPublic must be true or false'), 'VALIDATION_ERROR');
    }
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
      return httpError(res, 404, err, 'NOT_FOUND');
    }
    if (err.statusCode === 409 || err.code === 'NOT_APPROVED') {
      return httpError(res, 409, err, 'NOT_APPROVED');
    }
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function moderateResume(req: Request, res: Response): Promise<Response | void> {
  try {
    const { action, reason } = req.body;
    await service.moderateResume(req.params.id, action, reason);
    res.json({ message: 'Success' });
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function moderateAchievement(req: Request, res: Response): Promise<Response | void> {
  try {
    const { action, reason } = req.body;
    const updated = await service.moderateAchievement(req.params.id, action, reason);
    res.json({ message: 'Success', achievement: updated });
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

// Portal controllers
export async function getPortalModeration(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getPortalModerationItems();
    res.json(result);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function portalApprove(req: Request, res: Response): Promise<Response | void> {
  try {
    await service.handlePortalModerationDecision(req.params.type, req.params.id, 'APPROVED', req.body.reason);
    res.json({ success: true, message: 'Item approved' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function portalReject(req: Request, res: Response): Promise<Response | void> {
  try {
    await service.handlePortalModerationDecision(req.params.type, req.params.id, 'REJECTED', req.body.reason);
    res.json({ success: true, message: 'Item rejected' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function portalRequestChanges(req: Request, res: Response): Promise<Response | void> {
  try {
    await service.handlePortalModerationDecision(req.params.type, req.params.id, 'CHANGES_REQUESTED', req.body.reason);
    res.json({ success: true, message: 'Changes requested' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function portalHide(req: Request, res: Response): Promise<Response | void> {
  try {
    await service.handlePortalModerationDecision(req.params.type, req.params.id, 'HIDDEN', req.body.reason);
    res.json({ success: true, message: 'Item hidden' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

import { Request, Response } from 'express';
import { ValidationError } from '../../utils/appError';
import { parseModerationDecision, parseModerationType, readModerationNote } from './moderation.schemas';
import * as service from './moderation.service';
import type { ModerationDecisionOptions } from './moderation.types';

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

export async function getProjectQueue(_req: Request, res: Response): Promise<void> {
  const items = await service.getProjectModerationQueue();
  res.setHeader('Cache-Control', 'private, max-age=15, must-revalidate');
  res.json({ items });
}

function decisionOptions(req: Request): ModerationDecisionOptions {
  const body: Record<string, unknown> = req.body ?? {};
  return {
    note: readModerationNote(body),
    publish: typeof body.publish === 'boolean' ? body.publish : undefined,
    reviewer: req.adminUser?.username || req.adminUser?.email || undefined,
  };
}

export async function moderateItem(req: Request, res: Response): Promise<void> {
  const type = parseModerationType(req.params.type);
  const body: Record<string, unknown> = req.body ?? {};
  const decision = parseModerationDecision(body);
  const outcome = await service.applyModerationDecision(type, req.params.id, decision, decisionOptions(req));

  const payload: Record<string, unknown> = { success: true, message: 'Success', item: outcome.item };
  if (outcome.type === 'videos') {
    payload.video = outcome.item;
    payload.isPublic = outcome.isPublic;
  }
  if (outcome.type === 'achievements') {
    payload.achievement = outcome.item;
  }
  res.json(payload);
}

export async function updateItemVisibility(req: Request, res: Response): Promise<void> {
  const type = parseModerationType(req.params.type);
  const { isPublic } = req.body ?? {};
  if (typeof isPublic !== 'boolean') {
    throw new ValidationError('isPublic must be true or false');
  }

  const outcome = await service.setModerationVisibility(type, req.params.id, isPublic);
  const payload: Record<string, unknown> = { success: true, item: outcome.item };
  if (type === 'videos') {
    payload.video = outcome.item;
    payload.message = isPublic
      ? 'Video is now visible on the public page.'
      : 'Video has been removed from the public page.';
  }
  res.json(payload);
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  const type = parseModerationType(req.params.type);
  await service.deleteModerationItem(type, req.params.id);
  res.json({ success: true });
}

export async function requestItemChanges(req: Request, res: Response): Promise<void> {
  const type = parseModerationType(req.params.type);
  await service.applyModerationDecision(type, req.params.id, 'CHANGES_REQUESTED', decisionOptions(req));
  res.json({ success: true, message: 'Changes requested' });
}

// Portal controllers
export async function portalApprove(req: Request, res: Response): Promise<void> {
  await service.handlePortalModerationDecision(req.params.type, req.params.id, 'APPROVED', req.body.reason);
  res.json({ success: true, message: 'Item approved' });
}

export async function portalReject(req: Request, res: Response): Promise<void> {
  await service.handlePortalModerationDecision(req.params.type, req.params.id, 'REJECTED', req.body.reason);
  res.json({ success: true, message: 'Item rejected' });
}

export async function portalHide(req: Request, res: Response): Promise<void> {
  await service.handlePortalModerationDecision(req.params.type, req.params.id, 'HIDDEN', req.body.reason);
  res.json({ success: true, message: 'Item hidden' });
}

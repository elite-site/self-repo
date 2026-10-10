import { AppError } from '../../utils/appError';
import { INTERNAL_EVENT_ID, INTERNAL_EVENT_SLUG } from '../../config/constants';

export function validateRequiredId(id: any, fieldName: string = 'id'): string {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} is required`, 400);
  }
  return id.trim();
}

export function validateVotePayload(paramsId: any, body: any): { campaignId: string; candidateId?: string } {
  const campaignId = (paramsId || body?.campaignId)?.toString()?.trim();
  if (!campaignId) {
    throw new AppError('INVALID_CAMPAIGN', 'Campaign ID is required', 400);
  }
  const candidateId =
    body?.candidateId !== undefined && body?.candidateId !== null
      ? String(body.candidateId).trim()
      : undefined;
  return { campaignId, candidateId };
}

export function validateNotificationPagination(query: any): { limit: number; offset: number } {
  const rawLimit = parseInt(String(query?.limit), 10);
  const rawOffset = parseInt(String(query?.offset), 10);
  const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 20 : Math.min(rawLimit, 50);
  const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
  return { limit, offset };
}

export function validateTeamCreatePayload(body: any, query: any): { name: string; eventId?: string } {
  const { name } = body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Team name is required', 400);
  }

  const rawEventId = (body?.eventId || query?.eventId)?.toString()?.trim();
  if (rawEventId === INTERNAL_EVENT_ID || rawEventId === INTERNAL_EVENT_SLUG) {
    throw new AppError('NOT_FOUND', 'Event not found', 404);
  }

  return {
    name: name.trim(),
    eventId: rawEventId || undefined,
  };
}

export function validateTeamInvitePayload(body: any): { rollNo: string } {
  const { rollNo } = body || {};
  if (typeof rollNo !== 'string' || !rollNo.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Roll number is required', 400);
  }
  return { rollNo: rollNo.trim() };
}

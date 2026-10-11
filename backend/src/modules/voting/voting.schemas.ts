import { AppError } from '../../utils/appError';

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

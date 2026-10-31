import { NotFoundError, ValidationError } from '../../utils/appError';
import type { ModerationDecision, ModerationItemType } from './moderation.types';

export const MODERATION_ITEM_TYPES: readonly ModerationItemType[] = [
  'videos',
  'resumes',
  'certificates',
  'achievements',
  'projects',
];

export const MODERATION_DECISIONS: readonly ModerationDecision[] = [
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'HIDDEN',
];

export function parseModerationStatus(rawStatus?: string) {
  const normalized = String(rawStatus || 'ALL').toUpperCase();
  if (normalized === 'PENDING_REVIEW') {
    return { in: ['PENDING', 'UNDER_REVIEW'] };
  }
  if (normalized === 'ALL') {
    return undefined;
  }
  return normalized;
}

/** Resolves the `:type` route parameter, rejecting anything outside the queue. */
export function parseModerationType(rawType: string): ModerationItemType {
  const normalized = String(rawType || '').toLowerCase();
  if ((MODERATION_ITEM_TYPES as readonly string[]).includes(normalized)) {
    return normalized as ModerationItemType;
  }
  throw new NotFoundError(`Unknown moderation type: ${rawType}`);
}

const DECISION_BY_ACTION: Record<string, ModerationDecision> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  changes: 'CHANGES_REQUESTED',
  changes_requested: 'CHANGES_REQUESTED',
  'changes-requested': 'CHANGES_REQUESTED',
  hide: 'HIDDEN',
};

/**
 * Accepts both payload dialects in use: the admin queue sends `action`
 * (approve | reject | changes | hide) while newer callers send `decision`.
 */
export function parseModerationDecision(body: Record<string, unknown>): ModerationDecision {
  const rawDecision = body.decision;
  if (typeof rawDecision === 'string') {
    const normalized = rawDecision.toUpperCase();
    if ((MODERATION_DECISIONS as readonly string[]).includes(normalized)) {
      return normalized as ModerationDecision;
    }
  }

  const rawAction = body.action;
  if (typeof rawAction === 'string') {
    const mapped = DECISION_BY_ACTION[rawAction.toLowerCase()];
    if (mapped) return mapped;
  }

  throw new ValidationError('A decision (approve, reject, changes or hide) is required.', [
    { field: 'action', message: 'Must be one of approve, reject, changes, hide.' },
  ]);
}

/** The review note is not sent under a single key by every client yet. */
export function readModerationNote(body: Record<string, unknown>): string | undefined {
  for (const key of ['note', 'reason', 'reviewNote', 'rejectionReason', 'approvalNote'] as const) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

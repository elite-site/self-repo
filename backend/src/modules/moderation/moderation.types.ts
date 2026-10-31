export type ModerationItemType = 'videos' | 'resumes' | 'achievements' | 'certificates' | 'projects';

export type ModerationDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'HIDDEN';

/**
 * The mutable moderation columns common to every moderated record. Each field
 * is optional because the per-type payloads differ (only videos track
 * publishing timestamps and change requests).
 */
export interface ModerationUpdate {
  status?: ModerationDecision;
  reviewNote?: string | null;
  isPublic?: boolean;
  reviewedAt?: Date;
  reviewedBy?: string | null;
  publishedAt?: Date | null;
  changeRequestedAt?: Date | null;
  changeRequestNote?: string | null;
}

/** The fields the generic handlers need from any moderated record. */
export interface ModerationRecord {
  id: string;
  status: string;
  isPublic: boolean;
  driveFileId?: string | null;
  fileDriveId?: string | null;
  proofDriveId?: string | null;
}

export interface ModerationDecisionOptions {
  note?: string;
  publish?: boolean;
  reviewer?: string;
}

export interface ModerationDecisionOutcome {
  type: ModerationItemType;
  item: unknown;
  isPublic?: boolean;
}

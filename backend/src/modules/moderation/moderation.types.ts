export type ModerationItemType = 'videos' | 'resumes' | 'achievements' | 'certificates' | 'projects';

export interface ModerationFilter {
  type?: string;
  status?: string;
}

export interface VideoModerationAction {
  action: 'approve' | 'reject' | 'changes_requested';
  reason?: string;
  publish?: boolean;
}

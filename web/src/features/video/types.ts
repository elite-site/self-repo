import { StudentIntroVideo, StudentSubmission, PublicIntroVideo } from '@/shared/types';
import { UploadProgressInfo, DirectUploadParams } from '@/shared/api';

export type { StudentIntroVideo, StudentSubmission, PublicIntroVideo, UploadProgressInfo, DirectUploadParams };

export interface UploadStats {
  loadedMb: number;
  totalMb: number;
  speedFormatted: string;
  etaFormatted: string | null;
  phase: 'uploading' | 'confirming';
}

export interface VideoMeta {
  durationSec: number | null;
  durationFormatted: string | null;
  resolutionFormatted: string | null;
  sizeMb: number;
  isLarge: boolean;
  durationNotice: string | null;
}

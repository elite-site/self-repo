import React, { useState } from 'react';
import { VideoOff, Trash2 } from 'lucide-react';
import { Submission } from '@/types';
import { moderationApi } from '../../api';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

interface SubmissionManageActionsProps {
  submission: Submission;
  hasVideo: boolean;
  disabled: boolean;
  onVideoDeleted: (updated: Submission) => void;
  onSubmissionDeleted: (id: string) => void;
  onError: (msg: string | null) => void;
}

export const SubmissionManageActions: React.FC<SubmissionManageActionsProps> = ({
  submission,
  hasVideo,
  disabled,
  onVideoDeleted,
  onSubmissionDeleted,
  onError,
}) => {
  const confirm = useConfirm();
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const handleDeleteVideo = async () => {
    const confirmed = await confirm({
      title: 'Delete this introduction video?',
      description: `The video for ${submission.name} (${submission.rollNo}) and its file will be permanently removed. The student will then be able to upload a replacement.`,
      confirmLabel: 'Delete video',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingVideo(true);
    onError(null);
    try {
      const res = await moderationApi.deleteVideo(submission.id);
      if (res.success) {
        onVideoDeleted(res.submission);
      }
    } catch (err: any) {
      onError(`Failed to delete video: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingVideo(false);
    }
  };

  const handleDeleteRecord = async () => {
    const confirmed = await confirm({
      title: 'Delete this submission?',
      description: `The submission for ${submission.name} (${submission.rollNo}) will be removed from the database and all of its files deleted. This cannot be undone.`,
      confirmLabel: 'Delete submission',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingRecord(true);
    onError(null);
    try {
      const res = await moderationApi.deleteSubmission(submission.id);
      if (res.success) {
        onSubmissionDeleted(submission.id);
      }
    } catch (err: any) {
      onError(`Failed to delete submission: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingRecord(false);
    }
  };

  const isBusy = disabled || deletingVideo || deletingRecord;

  return (
    <div className="surface p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
      <div>
        <h3 className="text-sm font-semibold text-ink tracking-tight">Open student</h3>
        <p className="text-xs text-ink-secondary mt-0.5">
          Deleting the video lets the student upload a replacement. Removing the record is permanent.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <button
          type="button"
          disabled={isBusy || !hasVideo}
          onClick={handleDeleteVideo}
          className="btn btn-danger disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <VideoOff className="w-4 h-4" />
          <span>{deletingVideo ? 'Deleting…' : 'Delete file'}</span>
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={handleDeleteRecord}
          className="btn btn-danger"
        >
          <Trash2 className="w-4 h-4" />
          <span>{deletingRecord ? 'Deleting…' : 'Delete record'}</span>
        </button>
      </div>
    </div>
  );
};

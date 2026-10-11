import React from 'react';
import { CheckCircle, XCircle, MessageSquare, EyeOff, Loader2 } from 'lucide-react';

interface ModerationDecisionFormProps {
  action: 'approve' | 'reject' | 'changes' | 'hide' | null;
  onSelectAction: (action: 'approve' | 'reject' | 'changes' | 'hide') => void;
  reason: string;
  onChangeReason: (val: string) => void;
  approvalNote: string;
  onChangeApprovalNote: (val: string) => void;
  publishOnApprove: boolean;
  onChangePublishOnApprove: (val: boolean) => void;
  onSubmitDecision: () => void;
  submitting: boolean;
}

export const ModerationDecisionForm: React.FC<ModerationDecisionFormProps> = ({
  action,
  onSelectAction,
  reason,
  onChangeReason,
  approvalNote,
  onChangeApprovalNote,
  publishOnApprove,
  onChangePublishOnApprove,
  onSubmitDecision,
  submitting,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-ink flex items-center justify-between">
        <span>Moderation decision</span>
      </h3>

      {/* Decision Action Buttons */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Decision actions">
        <button
          type="button"
          onClick={() => onSelectAction('approve')}
          className={`btn ${
            action === 'approve' ? 'btn-primary' : 'btn-secondary'
          } text-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
          aria-pressed={action === 'approve'}
        >
          <CheckCircle className="w-4 h-4 text-status-approved" />
          <span>Approve</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectAction('reject')}
          className={`btn ${
            action === 'reject' ? 'btn-danger' : 'btn-secondary'
          } text-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
          aria-pressed={action === 'reject'}
        >
          <XCircle className="w-4 h-4 text-status-rejected" />
          <span>Reject</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectAction('changes')}
          className={`btn ${
            action === 'changes' ? 'btn-primary' : 'btn-secondary'
          } text-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
          aria-pressed={action === 'changes'}
        >
          <MessageSquare className="w-4 h-4 text-status-changes" />
          <span>Request changes</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectAction('hide')}
          className={`btn ${
            action === 'hide' ? 'btn-secondary bg-surface-sunken' : 'btn-ghost'
          } text-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
          aria-pressed={action === 'hide'}
        >
          <EyeOff className="w-4 h-4 text-ink-muted" />
          <span>Unpublish</span>
        </button>
      </div>

      {/* Reason Textarea (Required for Reject & Changes) */}
      {(action === 'reject' || action === 'changes') && (
        <div className="space-y-1.5 animate-fade-in">
          <label htmlFor="moderation-reason" className="label text-sm font-semibold flex items-center justify-between">
            <span>Note to student</span>
            <span className="text-status-rejected font-medium">Required</span>
          </label>
          <textarea
            id="moderation-reason"
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            rows={3}
            placeholder={
              action === 'changes'
                ? 'Explain what needs to be changed before re-uploading…'
                : 'State the reason for rejecting this submission…'
            }
            className="textarea text-sm w-full"
            aria-required="true"
            autoFocus
          />
          {!reason.trim() && (
            <p className="text-xs text-status-rejected font-medium">
              Please provide a note so the student knows what to do.
            </p>
          )}
        </div>
      )}

      {/* Approval Note (Optional, For Approve) */}
      {action === 'approve' && (
        <div className="space-y-1.5 animate-fade-in">
          <label
            htmlFor="moderation-approval-note"
            className="label text-sm font-semibold flex items-center justify-between"
          >
            <span>Note to student</span>
            <span className="text-ink-muted font-normal">Optional</span>
          </label>
          <textarea
            id="moderation-approval-note"
            value={approvalNote}
            onChange={(e) => onChangeApprovalNote(e.target.value)}
            rows={2}
            placeholder="Why this passed review (visible to the student as feedback)…"
            className="textarea text-sm w-full"
          />
        </div>
      )}

      {/* Publish on Profile Option (For Approve) */}
      {action === 'approve' && (
        <label className="flex items-start gap-2.5 p-3 rounded-lg border border-status-approved/30 bg-status-bg-approved cursor-pointer animate-fade-in">
          <input
            type="checkbox"
            checked={publishOnApprove}
            onChange={(e) => onChangePublishOnApprove(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-edge text-brand focus:ring-brand focus:ring-2 cursor-pointer"
          />
          <span className="text-label-sm text-status-approved leading-relaxed">
            <span className="font-semibold">Show on public profile.</span> Visitors can view this
            item on the public showcase.
          </span>
        </label>
      )}

      {/* Confirm Action Button */}
      {action && (
        <button
          type="button"
          onClick={onSubmitDecision}
          disabled={submitting || ((action === 'reject' || action === 'changes') && !reason.trim())}
          className="btn btn-primary w-full py-2.5 text-sm font-semibold shadow-xs cursor-pointer"
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Saving…</span>
            </>
          ) : (
            <span>
              {action === 'approve'
                ? 'Approve'
                : action === 'reject'
                ? 'Reject'
                : action === 'changes'
                ? 'Send change request'
                : 'Unpublish'}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

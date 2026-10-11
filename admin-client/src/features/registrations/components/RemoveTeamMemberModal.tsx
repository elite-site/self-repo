import React from 'react';
import { UserMinus, Loader2 } from 'lucide-react';
import { MemberToRemove } from '../types';

export interface RemoveTeamMemberModalProps {
  memberToRemove: MemberToRemove | null;
  removeReason: string;
  removingMember: boolean;
  onClose: () => void;
  onRemoveReasonChange: (reason: string) => void;
  onConfirmRemove: () => void;
}

export const RemoveTeamMemberModal: React.FC<RemoveTeamMemberModalProps> = ({
  memberToRemove,
  removeReason,
  removingMember,
  onClose,
  onRemoveReasonChange,
  onConfirmRemove,
}) => {
  if (!memberToRemove) return null;

  return (
    <div className="fixed inset-0 z-50 bg-scrim flex items-center justify-center p-4">
      <div className="bg-surface text-ink rounded-lg shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in duration-fast border border-edge">
        <div className="flex items-center gap-3 text-status-rejected">
          <div className="w-10 h-10 rounded-xl bg-status-bg-rejected flex items-center justify-center shrink-0">
            <UserMinus className="w-5 h-5 text-status-rejected" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Remove Team Member</h3>
            <p className="text-xs text-ink-muted">Team: {memberToRemove.teamName}</p>
          </div>
        </div>

        <p className="text-xs text-ink-secondary leading-relaxed">
          Are you sure you want to remove <strong className="text-ink">{memberToRemove.studentName}</strong> (
          <span className="font-mono font-bold">{memberToRemove.rollNo}</span>) from the team?
        </p>

        <div>
          <label className="block text-xs font-bold text-ink-secondary mb-1">
            Reason for Removal (Required for audit log)
          </label>
          <textarea
            value={removeReason}
            onChange={(e) => onRemoveReasonChange(e.target.value)}
            placeholder="e.g. Student requested removal, section mismatch, inactive participant…"
            rows={3}
            className="w-full text-xs p-3 bg-surface-sunken border border-edge rounded-xl focus:outline-none focus:border-status-rejected resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={removingMember}
            className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmRemove}
            disabled={removingMember}
            className="flex items-center gap-1.5 px-4 py-2 bg-status-solid-rejected hover:opacity-90 text-on-primary text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {removingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm Removal
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Eye, EyeOff, Upload, Trash2, Loader2 } from 'lucide-react';
import { UnifiedModerationItem } from '../../types';

interface ModerationPostActionsProps {
  selectedItem: UnifiedModerationItem;
  onToggleVisibility: () => void;
  visibilityBusy: boolean;
  onRequestChanges: () => void;
  actionBusy: boolean;
  onDeleteItem: () => void;
  deleteBusy: boolean;
}

export const ModerationPostActions: React.FC<ModerationPostActionsProps> = ({
  selectedItem,
  onToggleVisibility,
  visibilityBusy,
  onRequestChanges,
  actionBusy,
  onDeleteItem,
  deleteBusy,
}) => {
  return (
    <>
      {/* Previous Note / Feedback (if available) */}
      {(selectedItem.reviewNote || selectedItem.changeRequestNote) && (
        <div className="surface-sunken p-4 rounded-xl border border-edge space-y-1">
          <span className="text-xs font-semibold text-ink-secondary">Previous feedback history</span>
          <p className="text-sm text-ink-muted leading-relaxed">
            {selectedItem.changeRequestNote || selectedItem.reviewNote}
          </p>
        </div>
      )}

      {/* Post-Decision Controls: visibility, re-upload request, delete */}
      <div className="space-y-3 pt-3 border-t border-edge">
        <h3 className="text-sm font-semibold text-ink">Publication &amp; files</h3>

        {/* Publish / unpublish — only meaningful once APPROVED. */}
        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={visibilityBusy || selectedItem.status !== 'APPROVED'}
          title={
            selectedItem.status !== 'APPROVED'
              ? 'Only approved items can be published'
              : undefined
          }
          className="btn btn-secondary w-full py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {visibilityBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : selectedItem.isPublic ? (
            <EyeOff className="w-4 h-4 text-ink-muted" />
          ) : (
            <Eye className="w-4 h-4 text-brand" />
          )}
          <span>{selectedItem.isPublic ? 'Hide from public profile' : 'Show on public profile'}</span>
        </button>

        {/* Ask the student to upload a replacement. */}
        <button
          type="button"
          onClick={onRequestChanges}
          disabled={actionBusy}
          className="btn btn-secondary w-full py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {actionBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-status-changes" />
          )}
          <span>Request new upload</span>
        </button>

        {/* Destructive: removes the file and asks for a replacement. */}
        <button
          type="button"
          onClick={onDeleteItem}
          disabled={deleteBusy}
          className="btn btn-danger w-full py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {deleteBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          <span>Delete file</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="p-3 surface-sunken rounded-lg border border-edge text-xs text-ink-muted space-y-1">
        <div className="font-semibold text-ink-secondary">Hotkeys</div>
        <div className="flex flex-wrap gap-2">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">A</kbd> Approve
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">R</kbd> Reject
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">C</kbd> Changes
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">←/→</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">Esc</kbd> Close
          </span>
        </div>
      </div>
    </>
  );
};

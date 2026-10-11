import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UnifiedModerationItem, ModerationType } from '../types';
import { moderationApi } from '../api';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { ModerationReviewHeader } from './subcomponents/ModerationReviewHeader';
import { ModerationItemPreview } from './subcomponents/ModerationItemPreview';
import { ModerationDecisionForm } from './subcomponents/ModerationDecisionForm';
import { ModerationPostActions } from './subcomponents/ModerationPostActions';

export interface ModerationReviewModalProps {
  selectedItem: UnifiedModerationItem;
  filteredItems: UnifiedModerationItem[];
  selectedIndex: number;
  onClose: () => void;
  onSelectItem: (id: string | null) => void;
  onUpdateItems: (updater: (prev: UnifiedModerationItem[]) => UnifiedModerationItem[]) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  getDriveWatchUrl: (item: UnifiedModerationItem) => string | null;
  typeKeyFor: (item: UnifiedModerationItem) => ModerationType;
}

export const ModerationReviewModal: React.FC<ModerationReviewModalProps> = ({
  selectedItem,
  filteredItems,
  selectedIndex,
  onClose,
  onSelectItem,
  onUpdateItems,
  showToast,
  getDriveWatchUrl,
  typeKeyFor,
}) => {
  const confirm = useConfirm();

  // Decision Form State
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | 'hide' | null>(null);
  const [reason, setReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [publishOnApprove, setPublishOnApprove] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Reset form whenever selectedItem changes
  useEffect(() => {
    setAction(null);
    setReason('');
    setApprovalNote('');
    setPublishOnApprove(true);
  }, [selectedItem.id]);

  // Keyboard navigation when reviewing an item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        onSelectItem(filteredItems[selectedIndex - 1].id);
      } else if (e.key === 'ArrowRight' && selectedIndex < filteredItems.length - 1) {
        onSelectItem(filteredItems[selectedIndex + 1].id);
      } else if (e.key === 'a' || e.key === 'A') {
        setAction('approve');
      } else if (e.key === 'r' || e.key === 'R') {
        setAction('reject');
      } else if (e.key === 'c' || e.key === 'C') {
        setAction('changes');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, selectedIndex, filteredItems, onClose, onSelectItem]);

  const readableTypeOf = (item: UnifiedModerationItem) =>
    item.itemType === 'video'
      ? 'Intro video'
      : item.itemType === 'resume'
      ? 'Resume'
      : item.itemType === 'certificate'
      ? 'Certificate'
      : item.itemType === 'project'
      ? 'Project'
      : 'Achievement';

  const handleDecision = async () => {
    if (!action) return;
    if ((action === 'reject' || action === 'changes') && !reason.trim()) {
      showToast('Add a note explaining what to change.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const typeKey: ModerationType = typeKeyFor(selectedItem);

      await moderationApi.moderationDecision(typeKey, selectedItem.id, {
        action,
        reason: reason.trim() || undefined,
        approvalNote: approvalNote.trim() || undefined,
        publish: action === 'approve' ? publishOnApprove : false,
      });

      const readableType = readableTypeOf(selectedItem);

      showToast(
        action === 'approve'
          ? `${readableType} approved.`
          : action === 'reject'
          ? `${readableType} rejected.`
          : action === 'changes'
          ? 'Change request sent.'
          : `${readableType} unpublished.`
      );

      const newStatus =
        action === 'approve'
          ? 'APPROVED'
          : action === 'reject'
          ? 'REJECTED'
          : action === 'changes'
          ? 'CHANGES_REQUESTED'
          : 'HIDDEN';

      onUpdateItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? {
                ...i,
                status: newStatus,
                isPublic: action === 'approve' ? publishOnApprove : i.isPublic,
                reviewNote: approvalNote.trim() || reason.trim() || i.reviewNote,
              }
            : i
        )
      );

      const nextRemaining = filteredItems.filter((i) => i.id !== selectedItem.id);
      if (nextRemaining.length > 0) {
        const nextIndex = Math.min(selectedIndex, nextRemaining.length - 1);
        onSelectItem(nextRemaining[nextIndex].id);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Decision error:', err);
      showToast("Couldn't save the decision. Try again.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /** Publish / unpublish without altering the approval decision. */
  const handleToggleVisibility = async () => {
    const next = !selectedItem.isPublic;
    setVisibilityBusy(true);
    try {
      await moderationApi.setModerationVisibility(typeKeyFor(selectedItem), selectedItem.id, next);
      onUpdateItems((prev) => prev.map((i) => (i.id === selectedItem.id ? { ...i, isPublic: next } : i)));
      showToast(next ? 'Showing on public profile.' : 'Hidden from public profile.');
    } catch {
      showToast("Couldn't change visibility. Try again.", 'error');
    } finally {
      setVisibilityBusy(false);
    }
  };

  /** Ask the student to upload a replacement for this item. */
  const handleRequestChanges = () => {
    setAction('changes');
    showToast('Specify feedback in the decision form below and submit.', 'success');
  };

  /** Destructive: remove the item and drop it out of the queue. */
  const handleDeleteItem = async () => {
    const confirmed = await confirm({
      title: `Delete this ${readableTypeOf(selectedItem).toLowerCase()}?`,
      description: 'This permanently deletes the record and its file. The student will be asked to upload again.',
      confirmLabel: 'Delete file',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeleteBusy(true);
    try {
      await moderationApi.deleteModerationItem(typeKeyFor(selectedItem), selectedItem.id);
      showToast(`Deleted ${readableTypeOf(selectedItem).toLowerCase()}.`);

      const nextRemaining = filteredItems.filter((i) => i.id !== selectedItem.id);
      onUpdateItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      if (nextRemaining.length > 0) {
        onSelectItem(nextRemaining[Math.min(selectedIndex, nextRemaining.length - 1)].id);
      } else {
        onClose();
      }
    } catch {
      showToast("Couldn't delete this item. Try again.", 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-scrim overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[1700px] bg-surface rounded-lg shadow-2xl border border-edge flex flex-col overflow-hidden my-auto max-h-[95vh]">
        <ModerationReviewHeader
          selectedItem={selectedItem}
          selectedIndex={selectedIndex}
          totalCount={filteredItems.length}
          onSelectPrevious={() => selectedIndex > 0 && onSelectItem(filteredItems[selectedIndex - 1].id)}
          onSelectNext={() =>
            selectedIndex < filteredItems.length - 1 && onSelectItem(filteredItems[selectedIndex + 1].id)
          }
          onClose={onClose}
        />

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <ModerationItemPreview
              selectedItem={selectedItem}
              driveWatchUrl={getDriveWatchUrl(selectedItem)}
            />

            <div className="lg:col-span-4 flex flex-col p-6 overflow-y-auto max-h-[85vh] space-y-5 bg-surface rounded-xl border border-edge">
              <ModerationDecisionForm
                action={action}
                onSelectAction={setAction}
                reason={reason}
                onChangeReason={setReason}
                approvalNote={approvalNote}
                onChangeApprovalNote={setApprovalNote}
                publishOnApprove={publishOnApprove}
                onChangePublishOnApprove={setPublishOnApprove}
                onSubmitDecision={handleDecision}
                submitting={submitting}
              />

              <ModerationPostActions
                selectedItem={selectedItem}
                onToggleVisibility={handleToggleVisibility}
                visibilityBusy={visibilityBusy}
                onRequestChanges={handleRequestChanges}
                actionBusy={submitting && action === 'changes'}
                onDeleteItem={handleDeleteItem}
                deleteBusy={deleteBusy}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

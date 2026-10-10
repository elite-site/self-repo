import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  Upload,
  Download,
  Film,
  FileText,
  Award,
  FolderGit2,
  Trophy,
} from 'lucide-react';
import { UnifiedModerationItem, ModerationType } from '../../types';
import { adminApi } from '../../services/api';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import {
  StatusBadge,
  ItemTypeBadge,
  DocumentOrImagePreview,
  VideoPreviewPlayer,
} from './ModerationPreview';

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
  const [actionBusy, setActionBusy] = useState(false);
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
    item.itemType === 'video' ? 'Intro video' :
    item.itemType === 'resume' ? 'Resume' :
    item.itemType === 'certificate' ? 'Certificate' :
    item.itemType === 'project' ? 'Project' : 'Achievement';

  const handleDecision = async () => {
    if (!action) return;
    if ((action === 'reject' || action === 'changes') && !reason.trim()) {
      showToast('Add a note explaining what to change.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const typeKey: ModerationType = typeKeyFor(selectedItem);

      await adminApi.moderationDecision(typeKey, selectedItem.id, {
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
        action === 'approve' ? 'APPROVED' :
        action === 'reject' ? 'REJECTED' :
        action === 'changes' ? 'CHANGES_REQUESTED' : 'HIDDEN';

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
      await adminApi.setModerationVisibility(typeKeyFor(selectedItem), selectedItem.id, next);
      onUpdateItems((prev) => prev.map((i) => (i.id === selectedItem.id ? { ...i, isPublic: next } : i)));
      showToast(next ? 'Showing on public profile.' : 'Hidden from public profile.');
    } catch (err: any) {
      showToast("Couldn't change visibility. Try again.", 'error');
    } finally {
      setVisibilityBusy(false);
    }
  };

  /** Ask the student to upload a replacement for this item. */
  const handleRequestChanges = async () => {
    const note = window.prompt(
      `What should the student change before re-uploading their ${readableTypeOf(selectedItem).toLowerCase()}?`,
      'Please upload an updated version.',
    );
    if (note === null) return;

    setActionBusy(true);
    try {
      await adminApi.requestModerationChanges(typeKeyFor(selectedItem), selectedItem.id, note.trim() || undefined);
      showToast('Change request sent.');
    } catch (err: any) {
      showToast("Couldn't send the request. Try again.", 'error');
    } finally {
      setActionBusy(false);
    }
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
      await adminApi.deleteModerationItem(typeKeyFor(selectedItem), selectedItem.id);
      showToast(`Deleted ${readableTypeOf(selectedItem).toLowerCase()}.`);

      const nextRemaining = filteredItems.filter((i) => i.id !== selectedItem.id);
      onUpdateItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      if (nextRemaining.length > 0) {
        onSelectItem(nextRemaining[Math.min(selectedIndex, nextRemaining.length - 1)].id);
      } else {
        onClose();
      }
    } catch (err: any) {
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
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-edge bg-surface-sunken shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center font-bold text-body-md border border-brand/20 shrink-0">
                    {selectedItem.studentName?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 id="review-modal-title" className="font-semibold text-ink text-body-md truncate">
                        {selectedItem.studentName}
                      </h2>
                      <ItemTypeBadge itemType={selectedItem.itemType} />
                      <StatusBadge status={selectedItem.status} />
                    </div>
                    <div className="text-label-sm font-mono text-ink-muted">
                      {selectedItem.studentRoll}
                      {selectedItem.studentBranch && ` · ${selectedItem.studentBranch}`}
                      {selectedItem.studentYear && ` · Year ${selectedItem.studentYear}`}
                      {selectedItem.studentSection && `-${selectedItem.studentSection}`}
                    </div>
                  </div>
                </div>

                {/* Triage Navigation & Close */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 mr-2 text-label-sm font-bold text-ink-muted bg-surface px-2.5 py-1 rounded-md border border-edge">
                    <span>{selectedIndex + 1}</span>
                    <span>of</span>
                    <span>{filteredItems.length}</span>
                  </div>
                  <button
                    onClick={() => selectedIndex > 0 && onSelectItem(filteredItems[selectedIndex - 1].id)}
                    disabled={selectedIndex <= 0}
                    className="btn btn-ghost p-2"
                    aria-label="Previous submission"
                    title="Previous (Left Arrow)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => selectedIndex < filteredItems.length - 1 && onSelectItem(filteredItems[selectedIndex + 1].id)}
                    disabled={selectedIndex >= filteredItems.length - 1}
                    className="btn btn-ghost p-2"
                    aria-label="Next submission"
                    title="Next (Right Arrow)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onClose()}
                    className="btn btn-ghost p-2 text-ink-muted hover:text-ink ml-1"
                    aria-label="Close review"
                    title="Close (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: 12-Column Responsive Layout */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left evidence/media column */}
                  <div className="lg:col-span-8 flex flex-col justify-center items-center bg-surface-sunken rounded-xl p-4 min-h-[400px]">
                    {/* Media Action Strip */}
                    <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-edge shrink-0">
                      <span className="text-label-sm font-semibold text-ink-muted">
                        {selectedItem.itemType === 'video'
                          ? 'Video Player'
                          : selectedItem.itemType === 'resume'
                          ? 'Resume Document'
                          : selectedItem.itemType === 'certificate'
                          ? 'Certificate Document'
                          : selectedItem.itemType === 'project'
                          ? 'Project Dossier'
                          : 'Achievement Proof'}
                      </span>
                      <div className="flex items-center gap-2">
                        {getDriveWatchUrl(selectedItem) && (
                          <a
                            href={getDriveWatchUrl(selectedItem)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost text-label-sm py-1 px-2.5 inline-flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-brand" />
                            <span>Open in Drive</span>
                          </a>
                        )}
                        {selectedItem.fileUrl && (
                          <a
                            href={selectedItem.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost text-label-sm py-1 px-2.5 inline-flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-brand" />
                            <span>Open in new tab</span>
                          </a>
                        )}
                        {selectedItem.fileUrl && (
                          <a
                            href={`${selectedItem.fileUrl}${selectedItem.fileUrl.includes('?') ? '&' : '?'}download=1`}
                            className="btn btn-ghost text-label-sm py-1 px-2.5 inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-brand" />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Media Container: Conditional per Artifact Type */}
                    <div className="w-full flex-1 flex flex-col items-center justify-center">
                      {/* 1. INTRO VIDEO */}
                      {selectedItem.itemType === 'video' && (
                        <div className="w-full flex flex-col items-center justify-center">
                          <VideoPreviewPlayer
                            url={selectedItem.fileUrl}
                            driveFileId={selectedItem.driveFileId}
                            id={selectedItem.id}
                            title={selectedItem.title}
                          />
                          <div className="w-full text-label-sm text-ink-muted flex items-center justify-between px-1 mt-3">
                            <span>Submitted: {new Date(selectedItem.submittedAt).toLocaleString()}</span>
                            {selectedItem.driveFileId && (
                              <span className="font-mono text-xs">File ID: {selectedItem.driveFileId}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 2. RESUME */}
                      {selectedItem.itemType === 'resume' && (
                        <div className="w-full flex-1 flex flex-col space-y-3">
                          {selectedItem.fileUrl ? (
                            <div className="w-full h-[65vh] min-h-[420px] rounded-lg overflow-hidden border border-edge bg-surface">
                              <iframe
                                src={selectedItem.fileUrl}
                                title={selectedItem.title}
                                className="w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center gap-3 my-auto">
                              <div className="w-16 h-16 rounded-full bg-brand-soft flex items-center justify-center text-brand border border-brand/20">
                                <FileText className="w-8 h-8" />
                              </div>
                              <div className="font-bold text-ink">{selectedItem.title}</div>
                              <p className="text-body-sm text-ink-muted">
                                Resume document is ready for review.
                              </p>
                            </div>
                          )}
                          <div className="text-label-sm text-ink-muted flex items-center justify-between px-1">
                            <span>Submitted: {new Date(selectedItem.submittedAt).toLocaleString()}</span>
                            <span>{selectedItem.description || 'PDF Document'}</span>
                          </div>
                        </div>
                      )}

                      {/* 3. CERTIFICATE */}
                      {selectedItem.itemType === 'certificate' && (() => {
                        const certUrl = selectedItem.fileUrl || selectedItem.thumbnailUrl;
                        return (
                          <div className="w-full flex-1 flex flex-col space-y-3">
                            <div className="w-full flex-1 min-h-[320px] flex items-center justify-center">
                              {certUrl ? (
                                <DocumentOrImagePreview
                                  url={certUrl}
                                  title={selectedItem.title}
                                  isPdfHint={Boolean(certUrl.toLowerCase().includes('.pdf') || certUrl.toLowerCase().includes('/pdf'))}
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center gap-3 my-auto">
                                  <div className="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-brand border border-brand/20">
                                    <Award className="w-10 h-10" />
                                  </div>
                                  <p className="font-bold text-ink text-body-md">{selectedItem.title}</p>
                                  <p className="text-body-sm text-ink-muted">No preview document attached</p>
                                </div>
                              )}
                            </div>
                            <div className="p-3 surface rounded-lg border border-edge space-y-1 w-full">
                              <div className="font-bold text-ink text-body-sm">{selectedItem.title}</div>
                              {selectedItem.description && (
                                <p className="text-body-sm text-ink-muted">{selectedItem.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4. PROJECT */}
                      {selectedItem.itemType === 'project' && (
                        <div className="w-full flex-1 flex flex-col justify-center space-y-4 p-5 surface rounded-xl border border-edge">
                          <div className="space-y-2">
                            <h3 className="text-headline-sm font-bold text-ink">{selectedItem.title}</h3>
                            {selectedItem.description && (
                              <p className="text-body-sm text-ink leading-relaxed whitespace-pre-wrap">
                                {selectedItem.description}
                              </p>
                            )}
                          </div>

                          {selectedItem.technologies && selectedItem.technologies.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-label-sm font-semibold text-ink-muted">Tech stack</span>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedItem.technologies.map((tech, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-md text-label-sm font-medium bg-brand-soft text-brand border border-brand/20"
                                  >
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            {selectedItem.githubUrl && (
                              <a
                                href={selectedItem.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary text-body-sm inline-flex items-center gap-2"
                              >
                                <FolderGit2 className="w-4 h-4 text-brand" />
                                <span>GitHub Repository</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {selectedItem.driveVideoUrl && (
                              <a
                                href={selectedItem.driveVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary text-body-sm inline-flex items-center gap-2"
                              >
                                <Film className="w-4 h-4 text-brand" />
                                <span>Demo Video</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 5. ACHIEVEMENT */}
                      {selectedItem.itemType === 'achievement' && (() => {
                        const proofUrl = selectedItem.fileUrl || selectedItem.proofUrl;
                        return (
                          <div className="w-full flex-1 flex flex-col space-y-4">
                            <div className="w-full flex-1 min-h-[320px] flex items-center justify-center">
                              {proofUrl ? (
                                <DocumentOrImagePreview
                                  url={proofUrl}
                                  title={selectedItem.title}
                                  isPdfHint={Boolean(proofUrl.toLowerCase().includes('.pdf') || proofUrl.toLowerCase().includes('/pdf'))}
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center gap-3 my-auto">
                                  <div className="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-brand border border-brand/20">
                                    <Trophy className="w-10 h-10" />
                                  </div>
                                  <p className="font-bold text-ink text-body-md">{selectedItem.title}</p>
                                  <p className="text-body-sm text-ink-muted">No proof document attached</p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 p-4 surface rounded-xl border border-edge w-full">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="badge badge-pending text-xs font-semibold">
                                    {selectedItem.category || 'Achievement'}
                                  </span>
                                  {selectedItem.organization && (
                                    <span className="text-label-sm text-ink-muted">• {selectedItem.organization}</span>
                                  )}
                                </div>
                                <h3 className="text-headline-sm font-bold text-ink">{selectedItem.title}</h3>
                              </div>

                              {selectedItem.description && (
                                <p className="text-body-sm text-ink leading-relaxed whitespace-pre-wrap">
                                  {selectedItem.description}
                                </p>
                              )}

                              {proofUrl && (
                                <div className="pt-2 border-t border-edge">
                                  <a
                                    href={proofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary text-body-sm inline-flex items-center gap-2"
                                  >
                                    <Award className="w-4 h-4 text-brand" />
                                    <span>Open Proof in New Tab</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right review & decision column: lg:col-span-4 flex flex-col p-6 overflow-y-auto max-h-[85vh] */}
                  <div className="lg:col-span-4 flex flex-col p-6 overflow-y-auto max-h-[85vh] space-y-5 bg-surface rounded-xl border border-edge">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-ink flex items-center justify-between">
                        <span>Moderation decision</span>
                      </h3>

                      {/* Decision Action Buttons */}
                      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Decision actions">
                        <button
                          type="button"
                          onClick={() => setAction('approve')}
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
                          onClick={() => setAction('reject')}
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
                          onClick={() => setAction('changes')}
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
                          onClick={() => setAction('hide')}
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
                            onChange={(e) => setReason(e.target.value)}
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
                          <label htmlFor="moderation-approval-note" className="label text-sm font-semibold flex items-center justify-between">
                            <span>Note to student</span>
                            <span className="text-ink-muted font-normal">Optional</span>
                          </label>
                          <textarea
                            id="moderation-approval-note"
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
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
                            onChange={(e) => setPublishOnApprove(e.target.checked)}
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
                          onClick={handleDecision}
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
                              {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : action === 'changes' ? 'Send change request' : 'Unpublish'}
                            </span>
                          )}
                        </button>
                      )}
                    </div>

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
                      <h3 className="text-sm font-semibold text-ink">
                        Publication &amp; files
                      </h3>

                      {/* Publish / unpublish — only meaningful once APPROVED. */}
                      <button
                        type="button"
                        onClick={handleToggleVisibility}
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
                        <span>
                          {selectedItem.isPublic ? 'Hide from public profile' : 'Show on public profile'}
                        </span>
                      </button>

                      {/* Ask the student to upload a replacement. */}
                      <button
                        type="button"
                        onClick={handleRequestChanges}
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
                        onClick={handleDeleteItem}
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
                        <span><kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">A</kbd> Approve</span>
                        <span><kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">R</kbd> Reject</span>
                        <span><kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">C</kbd> Changes</span>
                        <span><kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">←/→</kbd> Navigate</span>
                        <span><kbd className="px-1.5 py-0.5 rounded bg-surface border border-edge font-mono font-semibold">Esc</kbd> Close</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
};

import React from 'react';
import { MessageSquare, X, Trash2, Loader2 } from 'lucide-react';

interface RequestModalState {
  open: boolean;
  type: string;
  itemId: string;
  title: string;
}

interface DeleteModalState {
  open: boolean;
  type: string;
  itemId: string;
  title: string;
}

interface StudentActionModalsProps {
  requestModal: RequestModalState | null;
  requestNote: string;
  onRequestNoteChange: (val: string) => void;
  onRequestClose: () => void;
  onRequestSubmit: (e: React.FormEvent) => void;

  deleteModal: DeleteModalState | null;
  deleteReason: string;
  onDeleteReasonChange: (val: string) => void;
  onDeleteClose: () => void;
  onDeleteSubmit: (e: React.FormEvent) => void;

  actionLoading: boolean;
}

export const StudentActionModals: React.FC<StudentActionModalsProps> = ({
  requestModal,
  requestNote,
  onRequestNoteChange,
  onRequestClose,
  onRequestSubmit,
  deleteModal,
  deleteReason,
  onDeleteReasonChange,
  onDeleteClose,
  onDeleteSubmit,
  actionLoading,
}) => {
  return (
    <>
      {/* ── MODAL: REQUEST CHANGES ── */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
          <div className="bg-surface text-ink rounded-lg max-w-lg w-full p-6 shadow-2xl border border-edge text-left animate-scale-in duration-fast">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-status-changes" />
                <h3 className="text-base font-semibold text-ink">
                  Request new upload
                </h3>
              </div>
              <button
                onClick={onRequestClose}
                className="p-1 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onRequestSubmit} className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-ink-muted mb-2">
                  Item to revise: <strong className="text-ink">{requestModal.title}</strong>
                </p>
                <p className="text-xs text-ink-muted mb-3">
                  The student will receive an in-portal notification with your note and instructions to submit a corrected version.
                </p>

                {/* Quick preset suggestions */}
                <div className="mb-3 space-y-1">
                  <span className="text-xs font-bold text-ink-muted">Quick suggestions:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Please upload a clearer, high-resolution copy',
                      'Dates or organization details need verification',
                      'File is unreadable or truncated, please re-upload',
                      'Please ensure professional formatting is followed',
                    ].map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => onRequestNoteChange(preset)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-surface-sunken hover:bg-surface-inset text-ink-secondary font-medium transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-bold text-ink mb-1">
                  Revision Instructions for Student *
                </label>
                <textarea
                  required
                  rows={4}
                  value={requestNote}
                  onChange={(e) => onRequestNoteChange(e.target.value)}
                  placeholder="Explain clearly what the student should correct before re-uploading..."
                  className="w-full text-xs border border-edge-strong bg-surface rounded-xl p-3 resize-none focus:outline-none focus:border-status-changes text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={onRequestClose}
                  className="px-4 py-2 text-xs font-bold text-ink-secondary hover:bg-surface-sunken rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !requestNote.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-status-solid-changes hover:bg-status-solid-changes disabled:opacity-50 text-on-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Send Revision Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE ITEM ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim">
          <div className="bg-surface text-ink rounded-lg max-w-md w-full p-6 shadow-2xl border border-edge text-left animate-scale-in duration-fast">
            <div className="flex items-center justify-between pb-3 border-b border-edge">
              <div className="flex items-center gap-2 text-status-rejected">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-semibold">Delete {deleteModal.title}?</h3>
              </div>
              <button
                onClick={onDeleteClose}
                className="p-1 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onDeleteSubmit} className="space-y-4 pt-4">
              <div className="p-3 bg-status-bg-rejected border border-edge rounded-xl text-xs text-ink leading-relaxed">
                This permanently deletes the record and its file. It can't be undone.
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1">
                  Optional Reason (sent to student)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => onDeleteReasonChange(e.target.value)}
                  placeholder="e.g. Duplicate upload / Policy violation"
                  className="w-full text-xs border border-edge-strong bg-surface rounded-xl p-2.5 focus:outline-none focus:border-status-rejected text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={onDeleteClose}
                  className="px-4 py-2 text-xs font-bold text-ink-secondary hover:bg-surface-sunken rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand disabled:opacity-50 text-on-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Delete file</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

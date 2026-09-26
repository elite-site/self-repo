import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle, XCircle, MessageSquare, EyeOff,
  Film, FileText, Trophy, Award, ChevronRight, ChevronLeft,
  Inbox, AlertCircle, Loader2,
} from 'lucide-react';
import { adminApi } from '../services/api';

type ModerationTab = 'videos' | 'resumes' | 'achievements' | 'certificates';

interface ModerationItem {
  id: string;
  studentName: string;
  studentRoll: string;
  submittedAt: string;
  fileUrl?: string;
  driveFileId?: string;
  status: string;
  title?: string;
  reason?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    UNDER_REVIEW: { label: 'Under Review', cls: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
    APPROVED: { label: 'Approved', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    REJECTED: { label: 'Rejected', cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
    CHANGES_REQUESTED: { label: 'Changes Requested', cls: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
};

export const Moderation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ModerationTab>('videos');
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | 'hide' | null>(null);
  const [reason, setReason] = useState('');
  const [publishOnApprove, setPublishOnApprove] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const tabs: { id: ModerationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'videos', label: 'Intro Videos', icon: Film },
    { id: 'resumes', label: 'Resumes', icon: FileText },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ];

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    setIdx(0);
    try {
      // Each tab maps to a different endpoint
      let data: ModerationItem[] = [];
      if (activeTab === 'videos') {
        const res = await adminApi.getModerationVideos?.() ?? { items: [] };
        data = res.items ?? [];
      } else if (activeTab === 'resumes') {
        const res = await adminApi.getModerationResumes?.() ?? { items: [] };
        data = res.items ?? [];
      } else if (activeTab === 'achievements') {
        const res = await adminApi.getModerationAchievements?.() ?? { items: [] };
        data = res.items ?? [];
      } else {
        const res = await adminApi.getModerationCertificates?.() ?? { items: [] };
        data = res.items ?? [];
      }
      setItems(data);
    } catch {
      setError('Failed to load moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [activeTab]);

  const currentItem = items[idx] ?? null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDecision = async () => {
    if (!currentItem || !action) return;
    if ((action === 'reject' || action === 'changes') && !reason.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.moderationDecision?.(activeTab, currentItem.id, {
        action,
        reason,
        // Approving an intro video can publish it on the public page; the
        // student can also publish it themselves once it is approved.
        publish: activeTab === 'videos' ? publishOnApprove : undefined,
      });
      showToast(
        action === 'approve'
          ? activeTab === 'videos' && publishOnApprove
            ? 'Approved and published.'
            : 'Approved!'
          : action === 'reject'
          ? 'Rejected.'
          : action === 'changes'
          ? 'Change requested — the student has been notified.'
          : 'Hidden.'
      );
      setAction(null);
      setReason('');
      // Remove item from list
      const next = items.filter((_, i) => i !== idx);
      setItems(next);
      setIdx(Math.min(idx, next.length - 1));
    } catch {
      showToast('Action failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B192C] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <ShieldCheck className="w-6 h-6 text-[#DC2626]" />
        <div>
          <h1 className="text-xl font-extrabold text-[#0B192C] dark:text-white">Moderation Queue</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Review and decide on student submissions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit border border-neutral-200 dark:border-neutral-700">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive ? 'bg-white dark:bg-neutral-900 text-[#DC2626] dark:text-elite-red shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800">
          <Loader2 className="w-7 h-7 animate-spin text-[#DC2626]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-neutral-900 rounded-2xl border border-red-200 dark:border-red-900/50 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
          <button onClick={fetchItems} className="text-xs text-[#DC2626] font-semibold hover:underline">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 gap-3">
          <Inbox className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Queue is empty</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">No pending {activeTab} to review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Content Preview */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 overflow-hidden shadow-sm">
              {/* Navigation */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] dark:border-neutral-800 bg-[#F8FAFC] dark:bg-neutral-800/60">
                <button
                  onClick={() => setIdx(Math.max(0, idx - 1))}
                  disabled={idx === 0}
                  className="flex items-center gap-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 disabled:opacity-30 hover:text-[#0B192C] dark:hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  {idx + 1} of {items.length}
                </span>
                <button
                  onClick={() => setIdx(Math.min(items.length - 1, idx + 1))}
                  disabled={idx === items.length - 1}
                  className="flex items-center gap-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 disabled:opacity-30 hover:text-[#0B192C] dark:hover:text-white cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Preview area */}
              <div className="p-5">
                {currentItem && (
                  <>
                    {/* Student info */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E2E8F0] dark:border-neutral-800">
                      <div className="w-10 h-10 rounded-full bg-[#0B192C] dark:bg-neutral-800 text-white flex items-center justify-center font-bold text-sm">
                        {currentItem.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[#0B192C] dark:text-white text-sm">{currentItem.studentName}</div>
                        <div className="text-xs text-neutral-400">{currentItem.studentRoll}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <StatusBadge status={currentItem.status} />
                        <span className="text-[10px] text-neutral-400">
                          {new Date(currentItem.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {currentItem.title && (
                      <p className="text-sm font-semibold text-[#0B192C] dark:text-white mb-3">{currentItem.title}</p>
                    )}

                    {/* Media preview */}
                    {activeTab === 'videos' && currentItem.fileUrl ? (
                      <div className="bg-neutral-900 rounded-xl overflow-hidden aspect-video">
                        <video src={currentItem.fileUrl} controls className="w-full h-full object-contain" />
                      </div>
                    ) : activeTab === 'resumes' && currentItem.fileUrl ? (
                      <iframe src={currentItem.fileUrl} className="w-full h-[500px] rounded-xl border border-[#E2E8F0]" title="Resume" />
                    ) : activeTab === 'achievements' || activeTab === 'certificates' ? (
                      currentItem.fileUrl ? (
                        <iframe src={currentItem.fileUrl} className="w-full h-96 rounded-xl border border-[#E2E8F0]" title="Proof" />
                      ) : (
                        <div className="flex items-center justify-center h-32 bg-neutral-50 rounded-xl border border-[#E2E8F0] text-neutral-400 text-sm">
                          No file attached
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-32 bg-neutral-50 rounded-xl text-neutral-400 text-sm">
                        No preview available
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Decision Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-extrabold text-[#0B192C] dark:text-white uppercase tracking-wide">Decision</h3>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAction('approve')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    action === 'approve'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    action === 'reject'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => setAction('changes')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    action === 'changes'
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" /> Request Changes
                </button>
                <button
                  onClick={() => setAction('hide')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    action === 'hide'
                      ? 'bg-slate-600 text-white border-slate-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <EyeOff className="w-4 h-4" /> Hide
                </button>
              </div>

              {/* Reason textarea — required for reject/changes */}
              {(action === 'reject' || action === 'changes') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                    Reason <span className="text-[#DC2626]">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Explain why this is being rejected or what needs to change..."
                    className="w-full text-xs border border-[#E2E8F0] dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg p-3 resize-none focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] text-[#0B192C] dark:text-white"
                  />
                  {!reason.trim() && (
                    <p className="text-[10px] text-[#DC2626]">Reason is required for this action.</p>
                  )}
                </div>
              )}

              {/* Publish option — intro videos only, shown when approving */}
              {activeTab === 'videos' && action === 'approve' && (
                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishOnApprove}
                    onChange={(e) => setPublishOnApprove(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    <span className="font-bold">Publish on the public page.</span> The video becomes watchable by
                    anyone on the public home page, without logging in. Uncheck to approve it but keep it private.
                  </span>
                </label>
              )}

              {action && (
                <button
                  onClick={handleDecision}
                  disabled={submitting || ((action === 'reject' || action === 'changes') && !reason.trim())}
                  className="w-full py-3 rounded-lg text-xs font-bold bg-[#0B192C] dark:bg-white text-white dark:text-neutral-900 hover:bg-[#0B192C]/90 dark:hover:bg-neutral-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm {action === 'approve' ? 'Approval' : action === 'reject' ? 'Rejection' : action === 'changes' ? 'Change Request' : 'Hide'}
                </button>
              )}
            </div>

            {/* Previous decision (if exists) */}
            {currentItem?.reason && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1">Previous Feedback</p>
                <p className="text-xs text-amber-800">{currentItem.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

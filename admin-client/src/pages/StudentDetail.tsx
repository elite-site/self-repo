import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  Trash2,
  MessageSquare,
  Loader2,
  RefreshCw,
  Github,
  Linkedin,
  Globe,
  X,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { LeetCodeIcon, CodeChefIcon } from '../components/icons/PlatformIcons';
import { MediaTab } from './StudentDetail/MediaTab';
import { PortfolioTab } from './StudentDetail/PortfolioTab';

interface StudentDetailProps {
  studentId: string;
  onBack?: () => void;
}

export const StudentDetail: React.FC<StudentDetailProps> = ({ studentId, onBack }) => {
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modal states
  const [requestModal, setRequestModal] = useState<{
    open: boolean;
    type: string;
    itemId: string;
    title: string;
  } | null>(null);
  const [requestNote, setRequestNote] = useState('');

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: string;
    itemId: string;
    title: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'media'>('overview');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  };

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getStudent(studentId);
      setStudent(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load student profile.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  // Handle request change submit
  const handleRequestChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModal || !student) return;
    if (!requestNote.trim()) {
      showToast('Add a note explaining what to change.');
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.requestItemChange(
        student.id,
        requestModal.type,
        requestModal.itemId,
        requestNote.trim()
      );
      showToast('Change request sent.');
      setRequestModal(null);
      setRequestNote('');
      await loadStudent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to request changes.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete submit
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModal || !student) return;
    setActionLoading(true);
    try {
      await adminApi.deleteStudentItem(
        student.id,
        deleteModal.type,
        deleteModal.itemId,
        deleteReason.trim() || undefined
      );
      showToast(`Deleted ${deleteModal.title}.`);
      setDeleteModal(null);
      setDeleteReason('');
      await loadStudent();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete item.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only" role="status">Loading student profile</span>
        <div className="skeleton h-9 w-56" />
        <div className="bg-surface border border-edge rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="skeleton h-16 w-16 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-4 w-64" />
            </div>
          </div>
          <div className="skeleton h-12 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-56 w-full rounded-lg" />
          <div className="skeleton h-56 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 text-center bg-surface border border-edge rounded-lg max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-status-rejected mx-auto mb-3" />
        <h3 className="text-base font-bold text-ink">Student Not Found</h3>
        <p className="text-xs text-ink-muted mt-1 mb-5">{error || 'Unable to retrieve student profile.'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-inverse text-ink-inverse text-xs font-bold rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Roster
          </button>
        )}
      </div>
    );
  }

  const profile = student.profile || {};
  const skillsList = profile.skills || [];
  const introVideo = student.introVideos?.[0] || null;
  const resume = student.resumes?.[0] || null;
  const achievements = student.achievements || [];
  const certificates = student.certificates || [];
  const projects = student.projects || [];


  // Collect any items that currently have CHANGES_REQUESTED
  const pendingChanges: { type: string; title: string; note?: string }[] = [];
  if (introVideo && introVideo.status === 'CHANGES_REQUESTED') {
    pendingChanges.push({
      type: 'Introduction Video',
      title: 'Introduction Video',
      note: introVideo.reviewNote || introVideo.changeRequestNote || undefined,
    });
  }
  if (resume && resume.status === 'CHANGES_REQUESTED') {
    pendingChanges.push({
      type: 'Resume',
      title: resume.filename || 'Professional Resume',
      note: resume.reviewNote || undefined,
    });
  }
  achievements.forEach((a: any) => {
    if (a.status === 'CHANGES_REQUESTED') {
      pendingChanges.push({
        type: 'Achievement',
        title: a.title,
        note: a.reviewNote || undefined,
      });
    }
  });
  certificates.forEach((c: any) => {
    if (c.status === 'CHANGES_REQUESTED') {
      pendingChanges.push({
        type: 'Certificate',
        title: c.title,
        note: c.reviewNote || undefined,
      });
    }
  });
  projects.forEach((p: any) => {
    if (p.status === 'CHANGES_REQUESTED') {
      pendingChanges.push({
        type: 'Project',
        title: p.title,
        note: p.reviewNote || undefined,
      });
    }
  });

  return (
    <div className="space-y-6 text-left pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-overlay bg-surface-inverse text-ink-inverse text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:opacity-75 rounded ml-2 text-current cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-surface hover:bg-surface-sunken text-ink-secondary text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Roster</span>
            </button>
          )}
          <span className="text-xs text-ink-muted">/</span>
          <span className="text-xs font-mono font-bold text-ink-brand uppercase">{student.rollNo}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStudent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-surface hover:bg-surface-sunken text-ink-secondary text-xs font-semibold cursor-pointer"
            title="Refresh student data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href={`/students/${student.rollNo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand text-on-primary text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <span>Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-surface border border-edge rounded-lg p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg bg-status-bg-rejected text-ink-brand flex items-center justify-center text-2xl font-semibold border border-edge overflow-hidden shadow-xs shrink-0">
              <span>{student.name?.charAt(0) || 'S'}</span>
              {profile.photoUrl && (
                <img
                  src={profile.photoUrl}
                  alt={student.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-semibold text-ink font-display">
                  {student.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-sunken text-ink-secondary">
                  {student.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Roll No: <span className="font-bold text-ink">{student.rollNo}</span> • Year{' '}
                {student.year} Section {student.section} • {student.branch || 'IT'}
              </p>
              {student.email && (
                <p className="text-xs text-ink-muted mt-0.5">{student.email}</p>
              )}
            </div>
          </div>

          {/* Social / Portfolio Links */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Linkedin className="w-3.5 h-3.5 text-status-approved" /> LinkedIn
              </a>
            )}
            {profile.leetcodeUrl && (
              <a
                href={profile.leetcodeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-amber-500"
              >
                <LeetCodeIcon className="w-3.5 h-3.5" /> LeetCode
              </a>
            )}
            {profile.codechefUrl && (
              <a
                href={profile.codechefUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-amber-700"
              >
                <CodeChefIcon className="w-3.5 h-3.5" /> CodeChef
              </a>
            )}
            {profile.portfolioUrl && (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Globe className="w-3.5 h-3.5 text-status-approved" /> Website
              </a>
            )}
          </div>
        </div>

        {/* Bio & Skills */}
        {(profile.biography || skillsList.length > 0) && (
          <div className="mt-5 pt-5 border-t border-edge grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold  text-ink-muted mb-1">Biography</h4>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {profile.biography || 'No biography written yet.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold  text-ink-muted mb-1.5">
                Skills ({skillsList.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((s: any) => (
                  <span
                    key={s.id || s.skill?.id}
                    className="px-2 py-0.5 rounded-md text-xs font-bold bg-surface-sunken text-ink-secondary"
                  >
                    {s.skill?.name || s.name}
                  </span>
                ))}
                {skillsList.length === 0 && (
                  <span className="text-xs text-ink-muted italic">No skills added</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b border-edge overflow-x-auto" role="tablist" aria-label="Student record sections">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'portfolio', label: 'Portfolio' },
          { id: 'media', label: 'Media' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 -mb-px whitespace-nowrap border-b-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.id === 'overview' && pendingChanges.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-status-bg-changes text-status-changes text-xs font-bold">
                {pendingChanges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
      {/* Pending Revisions Banner (if any item was flagged with CHANGES_REQUESTED) */}
      {pendingChanges.length > 0 && (
        <div className="p-4 bg-status-bg-changes/80 border border-edge rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-changes shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-ink">
              {pendingChanges.length} Revision Request{pendingChanges.length > 1 ? 's' : ''} Pending on Student
            </p>
            <div className="space-y-1 pt-1">
              {pendingChanges.map((item, i) => (
                <div key={i} className="text-ink">
                  • <strong>{item.type} ({item.title}):</strong> {item.note || 'Awaiting revised submission'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

          {/* At a glance */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Projects', value: String(projects.length) },
              { label: 'Achievements', value: String(achievements.length) },
              { label: 'Certificates', value: String(certificates.length) },
              { label: 'Intro Video', value: introVideo ? introVideo.status.replace(/_/g, ' ') : 'Not uploaded' },
              { label: 'Resume', value: resume ? resume.status.replace(/_/g, ' ') : 'Not uploaded' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface border border-edge rounded-lg p-4">
                <p className="text-xs font-bold  text-ink-muted">{stat.label}</p>
                <p className="text-sm font-semibold text-ink mt-1 capitalize">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Video & Resume */}
      {activeTab === 'media' && (
        <MediaTab
          introVideo={introVideo}
          resume={resume}
          onRequestChanges={(type, itemId, itemTitle) => {
            setRequestModal({ open: true, type, itemId, title: itemTitle });
            setRequestNote('');
          }}
          onDelete={(type, itemId, itemTitle) => {
            setDeleteModal({ open: true, type, itemId, title: itemTitle });
            setDeleteReason('');
          }}
        />
      )}

      {/* Portfolio Section */}
      {activeTab === 'portfolio' && (
        <PortfolioTab
          student={student}
          onRequestChanges={(type, itemId, itemTitle) => {
            setRequestModal({ open: true, type, itemId, title: itemTitle });
            setRequestNote('');
          }}
          onDelete={(type, itemId, itemTitle) => {
            setDeleteModal({ open: true, type, itemId, title: itemTitle });
            setDeleteReason('');
          }}
        />
      )}

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
                onClick={() => setRequestModal(null)}
                className="p-1 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestChangeSubmit} className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-ink-muted mb-2">
                  Item to revise: <strong className="text-ink">{requestModal.title}</strong>
                </p>
                <p className="text-xs text-ink-muted mb-3">
                  The student will receive an in-portal notification with your note and instructions to submit a corrected version.
                </p>

                {/* Quick preset suggestions */}
                <div className="mb-3 space-y-1">
                  <span className="text-xs font-bold text-ink-muted ">Quick suggestions:</span>
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
                        onClick={() => setRequestNote(preset)}
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
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Explain clearly what the student should correct before re-uploading..."
                  className="w-full text-xs border border-edge-strong bg-surface rounded-xl p-3 resize-none focus:outline-none focus:border-status-changes text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setRequestModal(null)}
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
                onClick={() => setDeleteModal(null)}
                className="p-1 text-ink-muted hover:text-ink-secondary rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4 pt-4">
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
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicate upload / Policy violation"
                  className="w-full text-xs border border-edge-strong bg-surface rounded-xl p-2.5 focus:outline-none focus:border-status-rejected text-ink"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
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
    </div>
  );
};

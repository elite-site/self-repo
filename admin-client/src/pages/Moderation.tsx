import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  EyeOff,
  Film,
  FileText,
  Award,
  FolderGit2,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Inbox,
  AlertCircle,
  Loader2,
  ExternalLink,
  Download,
  Filter,
  Search,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { UnifiedModerationItem, ModerationType } from '../types';

type TabType = 'all' | 'videos' | 'resumes' | 'certificates' | 'projects' | 'achievements';
type StatusFilter = 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'ALL';

const TAB_CONFIG: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: 'All Submissions', icon: Inbox },
  { id: 'videos', label: 'Intro Videos', icon: Film },
  { id: 'resumes', label: 'Resumes', icon: FileText },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending Review', cls: 'badge badge-pending' },
    UNDER_REVIEW: { label: 'Under Review', cls: 'badge badge-review' },
    APPROVED: { label: 'Approved', cls: 'badge badge-approved' },
    REJECTED: { label: 'Rejected', cls: 'badge badge-rejected' },
    CHANGES_REQUESTED: { label: 'Changes Requested', cls: 'badge badge-changes' },
    HIDDEN: { label: 'Hidden', cls: 'badge badge-draft' },
  };
  const s = map[status] ?? { label: status, cls: 'badge badge-draft' };
  return <span className={s.cls}>{s.label}</span>;
};

const ItemTypeBadge: React.FC<{ itemType: string }> = ({ itemType }) => {
  switch (itemType) {
    case 'video':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <Film className="w-3 h-3" />
          <span>Intro Video</span>
        </span>
      );
    case 'resume':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <FileText className="w-3 h-3" />
          <span>Resume</span>
        </span>
      );
    case 'certificate':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Award className="w-3 h-3" />
          <span>Certificate</span>
        </span>
      );
    case 'project':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <FolderGit2 className="w-3 h-3" />
          <span>Project</span>
        </span>
      );
    case 'achievement':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Trophy className="w-3 h-3" />
          <span>Achievement</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-sunken text-ink-secondary border border-edge">
          <span>{itemType}</span>
        </span>
      );
  }
};

export const Moderation: React.FC = () => {
  const [items, setItems] = useState<UnifiedModerationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Item for Unified Review (NO video loads when selectedItem is null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Decision Form State
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | 'hide' | null>(null);
  const [reason, setReason] = useState('');
  const [publishOnApprove, setPublishOnApprove] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getModerationItems('all');
      setItems(res.items ?? []);
    } catch (err: any) {
      console.error('Failed to load moderation queue:', err);
      setError('Failed to load moderation queue. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Compute counts per tab
  const counts = useMemo(() => {
    const map: Record<TabType, number> = {
      all: items.length,
      videos: 0,
      resumes: 0,
      certificates: 0,
      projects: 0,
      achievements: 0,
    };
    for (const item of items) {
      if (item.type === 'videos' || item.itemType === 'video') map.videos += 1;
      else if (item.type === 'resumes' || item.itemType === 'resume') map.resumes += 1;
      else if (item.type === 'certificates' || item.itemType === 'certificate') map.certificates += 1;
      else if (item.type === 'projects' || item.itemType === 'project') map.projects += 1;
      else if (item.type === 'achievements' || item.itemType === 'achievement') map.achievements += 1;
    }
    return map;
  }, [items]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === 'videos' && item.type !== 'videos' && item.itemType !== 'video') return false;
      if (activeTab === 'resumes' && item.type !== 'resumes' && item.itemType !== 'resume') return false;
      if (activeTab === 'certificates' && item.type !== 'certificates' && item.itemType !== 'certificate') return false;
      if (activeTab === 'projects' && item.type !== 'projects' && item.itemType !== 'project') return false;
      if (activeTab === 'achievements' && item.type !== 'achievements' && item.itemType !== 'achievement') return false;

      // Status filter
      if (statusFilter === 'PENDING_REVIEW') {
        if (item.status !== 'PENDING' && item.status !== 'UNDER_REVIEW') return false;
      } else if (statusFilter === 'CHANGES_REQUESTED') {
        if (item.status !== 'CHANGES_REQUESTED') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.studentName?.toLowerCase().includes(q);
        const matchesRoll = item.studentRoll?.toLowerCase().includes(q);
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, activeTab, statusFilter, searchQuery]);

  // Active selected item in review
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((i) => i.id === selectedItemId) ?? null;
  }, [items, selectedItemId]);

  const selectedIndex = useMemo(() => {
    if (!selectedItemId) return -1;
    return filteredItems.findIndex((i) => i.id === selectedItemId);
  }, [filteredItems, selectedItemId]);

  // Reset decision fields whenever selected item changes
  useEffect(() => {
    if (selectedItem) {
      setAction(null);
      setReason('');
      setPublishOnApprove(true);
    }
  }, [selectedItem?.id]);

  // Keyboard navigation when reviewing an item
  useEffect(() => {
    if (!selectedItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger hotkeys if typing in textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        setSelectedItemId(null);
      } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        setSelectedItemId(filteredItems[selectedIndex - 1].id);
      } else if (e.key === 'ArrowRight' && selectedIndex < filteredItems.length - 1) {
        setSelectedItemId(filteredItems[selectedIndex + 1].id);
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
  }, [selectedItem, selectedIndex, filteredItems]);

  const handleDecision = async () => {
    if (!selectedItem || !action) return;
    if ((action === 'reject' || action === 'changes') && !reason.trim()) {
      showToast('Reason is required when rejecting or requesting changes.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const typeKey: ModerationType = selectedItem.type || (
        selectedItem.itemType === 'video' ? 'videos' :
        selectedItem.itemType === 'resume' ? 'resumes' :
        selectedItem.itemType === 'certificate' ? 'certificates' :
        selectedItem.itemType === 'project' ? 'projects' : 'achievements'
      );

      await adminApi.moderationDecision(typeKey, selectedItem.id, {
        action,
        reason: reason.trim() || undefined,
        publish: action === 'approve' ? publishOnApprove : false,
      });

      const readableType =
        selectedItem.itemType === 'video' ? 'Intro video' :
        selectedItem.itemType === 'resume' ? 'Resume' :
        selectedItem.itemType === 'certificate' ? 'Certificate' :
        selectedItem.itemType === 'project' ? 'Project' : 'Achievement';

      showToast(
        action === 'approve'
          ? `${readableType} approved ${publishOnApprove ? 'and published.' : 'successfully.'}`
          : action === 'reject'
          ? `${readableType} rejected.`
          : action === 'changes'
          ? `Change request sent to ${selectedItem.studentName}.`
          : `${readableType} hidden.`
      );

      // Advance to next item in the filtered list
      const nextRemaining = filteredItems.filter((i) => i.id !== selectedItem.id);
      const updatedAll = items.filter((i) => i.id !== selectedItem.id);
      setItems(updatedAll);

      if (nextRemaining.length > 0) {
        const nextIndex = Math.min(selectedIndex, nextRemaining.length - 1);
        setSelectedItemId(nextRemaining[nextIndex].id);
      } else {
        setSelectedItemId(null);
      }
    } catch (err: any) {
      console.error('Decision error:', err);
      showToast('Failed to record decision. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getDriveWatchUrl = (item: UnifiedModerationItem) => {
    const driveId = item.driveFileId || item.fileDriveId || item.proofDriveId;
    if (driveId && !driveId.startsWith('mock_') && !driveId.startsWith('drive_')) {
      return `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
    }
    return null;
  };

  return (
    <div className="space-y-6 text-left page-enter">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-toast text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-status-bg-rejected text-status-rejected border border-status-rejected/30'
              : 'bg-surface-inverse text-ink-inverse'
          }`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-headline-sm font-extrabold text-ink">Moderation Queue</h1>
            <p className="text-body-sm text-ink-muted">
              Unified review for Intro Videos, Resumes, Certificates, Projects, and Achievements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchItems}
            disabled={loading}
            className="btn btn-secondary inline-flex items-center gap-2"
            aria-label="Refresh moderation queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-edge" role="tablist">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-body-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-brand text-ink-inverse shadow-xs'
                  : 'text-ink-secondary hover:text-ink hover:bg-surface-sunken'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-sunken text-ink-muted border border-edge'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, or title..."
            className="input pl-9 pr-8 text-body-sm w-full"
            aria-label="Search submissions"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-ink-muted hidden sm:inline-block" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="select text-body-sm min-w-[170px]"
            aria-label="Filter by status"
          >
            <option value="PENDING_REVIEW">Pending & In Review</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="ALL">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Main Queue Content */}
      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" aria-hidden="true" />
          <p className="text-body-sm text-ink-muted font-medium">Loading moderation items...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center" role="alert">
          <AlertCircle className="w-8 h-8 text-status-rejected" aria-hidden="true" />
          <p className="text-body-sm text-ink-muted">{error}</p>
          <button onClick={fetchItems} className="btn btn-secondary text-body-sm">
            Retry Loading
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center p-6">
          <Inbox className="w-12 h-12 text-ink-muted" aria-hidden="true" />
          <p className="text-body-md font-bold text-ink">Queue is Clear</p>
          <p className="text-body-sm text-ink-muted max-w-md">
            No submissions matching your current filters require moderation right now.
          </p>
          {(searchQuery || statusFilter !== 'PENDING_REVIEW' || activeTab !== 'all') && (
            <button
              onClick={() => {
                setActiveTab('all');
                setStatusFilter('PENDING_REVIEW');
                setSearchQuery('');
              }}
              className="text-body-sm font-semibold text-brand hover:underline cursor-pointer mt-1"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        /* FAST QUEUE TABLE - ZERO VIDEOS ARE LOADED HERE */
        <div className="surface border border-edge rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-edge bg-surface-sunken text-label-sm font-bold text-ink-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Artifact Type</th>
                  <th className="py-3 px-4">Title / Summary</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {filteredItems.map((item) => {
                  const academicInfo = [
                    item.studentBranch || 'IT',
                    item.studentYear ? `Year ${item.studentYear}` : null,
                    item.studentSection ? `Sec ${item.studentSection}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className="hover:bg-brand-soft/40 cursor-pointer transition-colors group"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center font-bold text-body-sm shrink-0 border border-brand/20">
                            {item.studentName?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-ink truncate group-hover:text-brand transition-colors">
                              {item.studentName}
                            </div>
                            <div className="text-[12px] font-mono text-ink-muted">
                              {item.studentRoll} {academicInfo && `• ${academicInfo}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Artifact Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <ItemTypeBadge itemType={item.itemType} />
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink truncate max-w-xs sm:max-w-md">
                          {item.title || 'Untitled Submission'}
                        </div>
                        {item.description && (
                          <div className="text-[12px] text-ink-muted truncate max-w-xs sm:max-w-md">
                            {item.description}
                          </div>
                        )}
                        {item.technologies && item.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.technologies.slice(0, 3).map((tech, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-surface-sunken text-ink-muted border border-edge"
                              >
                                {tech}
                              </span>
                            ))}
                            {item.technologies.length > 3 && (
                              <span className="text-[10px] text-ink-muted">
                                +{item.technologies.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-ink-muted text-label-sm">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Review Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemId(item.id);
                          }}
                          className="btn btn-secondary text-body-sm py-1.5 px-3 inline-flex items-center gap-1 group-hover:btn-primary transition-all"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UNIFIED REVIEW DOSSIER (MODAL / OVERLAY) - Media ONLY loads when selectedItem is active */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-modal bg-scrim/80 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="surface w-full max-w-5xl rounded-2xl border border-edge shadow-modal overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge bg-surface-sunken shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center font-bold text-body-md border border-brand/20 shrink-0">
                  {selectedItem.studentName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 id="review-modal-title" className="font-extrabold text-ink text-body-md truncate">
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
                  onClick={() => selectedIndex > 0 && setSelectedItemId(filteredItems[selectedIndex - 1].id)}
                  disabled={selectedIndex <= 0}
                  className="btn btn-ghost p-2"
                  aria-label="Previous submission"
                  title="Previous (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => selectedIndex < filteredItems.length - 1 && setSelectedItemId(filteredItems[selectedIndex + 1].id)}
                  disabled={selectedIndex >= filteredItems.length - 1}
                  className="btn btn-ghost p-2"
                  aria-label="Next submission"
                  title="Next (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedItemId(null)}
                  className="btn btn-ghost p-2 text-ink-muted hover:text-ink ml-1"
                  aria-label="Close review"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two-Column Unified Layout */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* LEFT COLUMN: Media / Artifact Evidence Viewer */}
              <div className="lg:col-span-3 space-y-4">
                {/* Media Action Strip */}
                <div className="flex items-center justify-between pb-2 border-b border-edge">
                  <span className="text-label-sm font-bold text-ink-muted uppercase tracking-wider">
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
                        <span>Drive</span>
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
                        <span>Open Tab</span>
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
                <div className="surface-sunken rounded-xl p-3 border border-edge">
                  {/* 1. INTRO VIDEO */}
                  {selectedItem.itemType === 'video' && (
                    <div className="space-y-3">
                      <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center shadow-inner">
                        {selectedItem.fileUrl ? (
                          <video
                            key={selectedItem.id}
                            src={selectedItem.fileUrl}
                            controls
                            preload="metadata"
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-6 text-white/70">
                            <Film className="w-12 h-12 mx-auto mb-2 text-white/40" />
                            <p className="text-body-sm font-semibold">Video file not streamable</p>
                          </div>
                        )}
                      </div>
                      <div className="text-label-sm text-ink-muted flex items-center justify-between px-1">
                        <span>Submitted: {new Date(selectedItem.submittedAt).toLocaleString()}</span>
                        {selectedItem.driveFileId && (
                          <span className="font-mono text-[11px]">Drive ID: {selectedItem.driveFileId}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. RESUME */}
                  {selectedItem.itemType === 'resume' && (
                    <div className="space-y-4">
                      {selectedItem.fileUrl ? (
                        <div className="w-full h-[460px] rounded-lg overflow-hidden border border-edge bg-white">
                          <iframe
                            src={selectedItem.fileUrl}
                            title={selectedItem.title}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
                          <FileText className="w-16 h-16 text-brand" />
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
                  {selectedItem.itemType === 'certificate' && (
                    <div className="space-y-3">
                      <div className="min-h-[320px] max-h-[460px] rounded-lg overflow-hidden flex items-center justify-center bg-surface border border-edge p-2">
                        {selectedItem.fileUrl || selectedItem.thumbnailUrl ? (
                          <img
                            src={selectedItem.fileUrl || selectedItem.thumbnailUrl || ''}
                            alt={selectedItem.title}
                            className="max-h-[440px] w-auto object-contain rounded"
                          />
                        ) : (
                          <div className="text-center p-8">
                            <Award className="w-16 h-16 mx-auto mb-2 text-brand" />
                            <p className="font-bold text-ink">{selectedItem.title}</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 surface rounded-lg border border-edge space-y-1">
                        <div className="font-bold text-ink text-body-sm">{selectedItem.title}</div>
                        {selectedItem.description && (
                          <p className="text-body-sm text-ink-muted">{selectedItem.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. PROJECT */}
                  {selectedItem.itemType === 'project' && (
                    <div className="space-y-4 p-4 surface rounded-lg border border-edge">
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
                          <span className="text-label-sm font-bold text-ink-muted uppercase">Tech Stack</span>
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
                  {selectedItem.itemType === 'achievement' && (
                    <div className="space-y-4 p-4 surface rounded-lg border border-edge">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-pending text-[11px] font-bold">
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

                      {(selectedItem.fileUrl || selectedItem.proofUrl) && (
                        <div className="pt-2 border-t border-edge">
                          <a
                            href={selectedItem.fileUrl || selectedItem.proofUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary text-body-sm inline-flex items-center gap-2"
                          >
                            <Award className="w-4 h-4 text-brand" />
                            <span>View Proof / Certificate</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Fast Decision & Faculty Action Panel */}
              <div className="lg:col-span-2 space-y-5">
                <div className="surface p-5 rounded-xl border border-edge space-y-4">
                  <h3 className="text-label-md font-extrabold text-ink uppercase tracking-wider flex items-center justify-between">
                    <span>Moderation Decision</span>
                    <span className="text-[11px] text-ink-muted font-normal">One-Click Triage</span>
                  </h3>

                  {/* Decision Action Buttons */}
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Decision actions">
                    <button
                      type="button"
                      onClick={() => setAction('approve')}
                      className={`btn ${
                        action === 'approve' ? 'btn-primary' : 'btn-secondary'
                      } text-body-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
                      aria-pressed={action === 'approve'}
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAction('reject')}
                      className={`btn ${
                        action === 'reject' ? 'btn-danger' : 'btn-secondary'
                      } text-body-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
                      aria-pressed={action === 'reject'}
                    >
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAction('changes')}
                      className={`btn ${
                        action === 'changes' ? 'btn-primary' : 'btn-secondary'
                      } text-body-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
                      aria-pressed={action === 'changes'}
                    >
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                      <span>Changes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAction('hide')}
                      className={`btn ${
                        action === 'hide' ? 'btn-secondary bg-surface-sunken' : 'btn-ghost'
                      } text-body-sm py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer`}
                      aria-pressed={action === 'hide'}
                    >
                      <EyeOff className="w-4 h-4 text-ink-muted" />
                      <span>Hide</span>
                    </button>
                  </div>

                  {/* Reason Textarea (Required for Reject & Changes) */}
                  {(action === 'reject' || action === 'changes') && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label htmlFor="moderation-reason" className="label text-label-sm font-bold flex items-center justify-between">
                        <span>Feedback / Instructions to Student</span>
                        <span className="text-status-rejected">* Required</span>
                      </label>
                      <textarea
                        id="moderation-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder={
                          action === 'changes'
                            ? 'Explain specifically what needs to be changed before re-uploading...'
                            : 'State the specific reason for rejecting this submission...'
                        }
                        className="textarea text-body-sm w-full"
                        aria-required="true"
                        autoFocus
                      />
                      {!reason.trim() && (
                        <p className="text-[12px] text-status-rejected font-medium">
                          Please provide a note so the student knows what to do.
                        </p>
                      )}
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
                        <span className="font-bold">Publish to student's public profile.</span> Visitors can view this
                        verified item on the public showcase.
                      </span>
                    </label>
                  )}

                  {/* Confirm Action Button */}
                  {action && (
                    <button
                      type="button"
                      onClick={handleDecision}
                      disabled={submitting || ((action === 'reject' || action === 'changes') && !reason.trim())}
                      className="btn btn-primary w-full py-2.5 text-body-sm font-bold shadow-xs cursor-pointer"
                      aria-busy={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>
                          Confirm {action === 'approve' ? 'Approval' : action === 'reject' ? 'Rejection' : action === 'changes' ? 'Change Request' : 'Hide'}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* Previous Note / Feedback (if available) */}
                {(selectedItem.reviewNote || selectedItem.changeRequestNote) && (
                  <div className="surface-sunken p-4 rounded-xl border border-edge space-y-1">
                    <span className="text-label-sm font-bold text-ink-secondary">Previous Feedback History:</span>
                    <p className="text-body-sm text-ink-muted leading-relaxed">
                      {selectedItem.changeRequestNote || selectedItem.reviewNote}
                    </p>
                  </div>
                )}

                {/* Keyboard Shortcuts Hint */}
                <div className="p-3 surface rounded-xl border border-edge text-[11px] text-ink-muted space-y-1">
                  <div className="font-bold uppercase tracking-wider text-ink-secondary">Hotkeys</div>
                  <div className="flex flex-wrap gap-2">
                    <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-edge font-mono font-bold">A</kbd> Approve</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-edge font-mono font-bold">R</kbd> Reject</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-edge font-mono font-bold">C</kbd> Changes</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-edge font-mono font-bold">←/→</kbd> Navigate</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-edge font-mono font-bold">Esc</kbd> Close</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

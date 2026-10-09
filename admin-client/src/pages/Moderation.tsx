import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle,
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
  Filter,
  Search,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { UnifiedModerationItem, ModerationType } from '../types';

type TabType = 'all' | 'videos' | 'resumes' | 'certificates' | 'projects' | 'github-projects' | 'achievements';
type StatusFilter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

const TAB_CONFIG: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: 'All Submissions', icon: Inbox },
  { id: 'videos', label: 'Intro Videos', icon: Film },
  { id: 'resumes', label: 'Resumes', icon: FileText },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'github-projects', label: 'GitHub Projects', icon: FolderGit2 },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
];

import {
  StatusBadge,
  ItemTypeBadge,
} from './Moderation/ModerationPreview';
import { ModerationReviewModal } from './Moderation/ModerationReviewModal';

export const Moderation: React.FC = () => {
  const [items, setItems] = useState<UnifiedModerationItem[]>([]);
  const [githubProjects, setGithubProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Item for Unified Review (NO video loads when selectedItem is null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQuery]);

  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, ghRes] = await Promise.all([
        adminApi.getModerationItems('all', 'ALL'),
        adminApi.getGithubShowcasedProjects({ limit: 100 }),
      ]);
      setItems(res.items ?? []);
      setGithubProjects(ghRes.items ?? []);
    } catch (err: any) {
      console.error('Failed to load moderation queue:', err);
      setError("Couldn't load the queue. Try again.");
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
      'github-projects': githubProjects.length,
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
  }, [items, githubProjects]);

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
      } else if (statusFilter === 'APPROVED') {
        if (item.status !== 'APPROVED') return false;
      } else if (statusFilter === 'CHANGES_REQUESTED') {
        if (item.status !== 'CHANGES_REQUESTED') return false;
      } else if (statusFilter === 'REJECTED') {
        if (item.status !== 'REJECTED') return false;
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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  // Active selected item in review
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((i) => i.id === selectedItemId) ?? null;
  }, [items, selectedItemId]);

  const selectedIndex = useMemo(() => {
    if (!selectedItemId) return -1;
    return filteredItems.findIndex((i) => i.id === selectedItemId);
  }, [filteredItems, selectedItemId]);

  const typeKeyFor = useCallback((item: UnifiedModerationItem): ModerationType => {
    if (item.type) return item.type;
    return item.itemType === 'video' ? 'videos' :
      item.itemType === 'resume' ? 'resumes' :
      item.itemType === 'certificate' ? 'certificates' :
      item.itemType === 'project' ? 'projects' : 'achievements';
  }, []);

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
          className={`fixed bottom-5 right-5 z-overlay text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-status-bg-rejected text-status-rejected border border-status-rejected/30'
              : 'bg-surface-inverse text-ink-inverse'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />}
          <span>{toast.message}</span>
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

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-headline-sm font-semibold text-ink">Moderation queue</h1>
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
                className={`ml-1 text-xs px-1.5 py-0.2 rounded-full font-mono ${
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
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending & In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Queue Content */}
      {activeTab === 'github-projects' ? (
        <div className="surface border border-edge rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-edge bg-surface-sunken flex items-center justify-between">
            <div>
              <h3 className="text-body-sm font-bold text-ink">Showcased GitHub Projects (Read-only)</h3>
              <p className="text-xs text-ink-muted">Showcased repositories selected by students (no faculty approval required)</p>
            </div>
            <span className="text-xs font-mono text-ink-muted">{githubProjects.length} projects</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-edge bg-surface-sunken text-label-sm font-semibold text-ink-secondary">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-4">Language / Stars</th>
                  <th className="py-3 px-4">README Excerpt / Description</th>
                  <th className="py-3 px-4 text-right">GitHub Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {githubProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-muted text-xs">
                      No showcased GitHub projects found.
                    </td>
                  </tr>
                ) : (
                  githubProjects.map((gp: any) => (
                    <tr key={gp.id} className="hover:bg-surface-sunken/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{gp.student?.name}</div>
                        <div className="text-[11px] text-ink-muted font-mono">{gp.student?.rollNo}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        {gp.name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-xs">
                          {gp.primaryLanguage && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-inset text-[11px] font-semibold text-ink-secondary">
                              {gp.primaryLanguage}
                            </span>
                          )}
                          <span className="text-ink-muted font-mono">★ {gp.stars ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        {gp.readmeExcerpt ? (
                          <p className="text-xs text-ink-muted line-clamp-2 font-mono">
                            {gp.readmeExcerpt}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-secondary line-clamp-2">
                            {gp.description || 'No description provided.'}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {gp.htmlUrl && (
                          <a
                            href={gp.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost text-xs px-2 py-1 inline-flex items-center gap-1"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" aria-hidden="true" />
          <p className="text-body-sm text-ink-muted font-medium">Loading moderation items…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center" role="alert">
          <AlertCircle className="w-8 h-8 text-status-rejected" aria-hidden="true" />
          <p className="text-body-sm text-ink-muted">{error}</p>
          <button onClick={fetchItems} className="btn btn-secondary text-body-sm">
            Try again
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center p-6">
          <Inbox className="w-12 h-12 text-ink-muted" aria-hidden="true" />
          <p className="text-body-md font-semibold text-ink">Queue is clear</p>
          <p className="text-body-sm text-ink-muted max-w-md">
            No submissions matching your current filters require moderation right now.
          </p>
          {(searchQuery || statusFilter !== 'ALL' || activeTab !== 'all') && (
            <button
              onClick={() => {
                setActiveTab('all');
                setStatusFilter('ALL');
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
                <tr className="border-b border-edge bg-surface-sunken text-label-sm font-semibold text-ink-secondary">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Artifact type</th>
                  <th className="py-3 px-4">Title / summary</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {paginatedItems.map((item) => {
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
                            <div className="text-xs font-mono text-ink-muted">
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
                          <div className="text-xs text-ink-muted truncate max-w-xs sm:max-w-md">
                            {item.description}
                          </div>
                        )}
                        {item.technologies && item.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.technologies.slice(0, 3).map((tech, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-1.5 py-0.5 rounded bg-surface-sunken text-ink-muted border border-edge"
                              >
                                {tech}
                              </span>
                            ))}
                            {item.technologies.length > 3 && (
                              <span className="text-xs text-ink-muted">
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

          {/* Pagination Bar (10 per page) */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-edge bg-surface-sunken">
              <div className="text-body-sm text-ink-muted">
                Showing <span className="font-semibold text-ink">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-semibold text-ink">{Math.min(currentPage * PAGE_SIZE, filteredItems.length)}</span> of{' '}
                <span className="font-semibold text-ink">{filteredItems.length}</span> submissions
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="btn btn-ghost text-body-sm p-1.5 sm:px-3 sm:py-1.5 inline-flex items-center gap-1"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <span className="text-label-sm font-semibold text-ink px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="btn btn-ghost text-body-sm p-1.5 sm:px-3 sm:py-1.5 inline-flex items-center gap-1"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UNIFIED REVIEW DOSSIER (MODAL / OVERLAY) - Media ONLY loads when selectedItem is active */}
      {selectedItem && (
        <ModerationReviewModal
          selectedItem={selectedItem}
          filteredItems={filteredItems}
          selectedIndex={selectedIndex}
          onClose={() => setSelectedItemId(null)}
          onSelectItem={(id) => setSelectedItemId(id)}
          onUpdateItems={(updater) => setItems(updater)}
          showToast={showToast}
          getDriveWatchUrl={getDriveWatchUrl}
          typeKeyFor={typeKeyFor}
        />
      )}
    </div>
  );
};

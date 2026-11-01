import React from 'react';
import { Loader2, AlertCircle, Inbox, ShieldCheck } from 'lucide-react';
import { useModeration } from '../hooks/useModeration';
import { ModerationHeader } from '../components/ModerationHeader';
import { ModerationFilterTabs } from '../components/ModerationFilterTabs';
import { ModerationQueueTable } from '../components/ModerationQueueTable';
import { GithubProjectsTable } from '../components/GithubProjectsTable';
import { ModerationReviewModal } from '../components/ModerationReviewModal';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

export const ModerationPage: React.FC = () => {
  const {
    items,
    setItems,
    githubProjects,
    loading,
    error,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    PAGE_SIZE,
    totalPages,
    paginatedItems,
    filteredItems,
    counts,
    setSelectedItemId,
    selectedItem,
    selectedIndex,
    toast,
    setToast,
    showToast,
    fetchItems,
    typeKeyFor,
    getDriveWatchUrl,
  } = useModeration();

  return (
    <div className="space-y-8 text-left animate-fade-in-up">
      {/* 1. ASYMMETRICAL QUEUE STATUS & FILTER CONTROLS */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <ModerationHeader
            toast={toast}
            loading={loading}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onDismissToast={() => setToast(null)}
            onRefresh={fetchItems}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
          />
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <ShieldCheck size={13} />
                  Queue Control
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {counts.all} Total
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Artifact Verification Pipeline</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Review submissions for quality, authenticity, and compliance with SASI IT department guidelines.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-brand/20 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Videos & Resumes</span>
                  <span className="font-bold text-ink text-sm tabular-nums">{counts.videos + counts.resumes}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Projects & Awards</span>
                  <span className="font-bold text-ink text-sm tabular-nums">{counts.projects + counts.certificates + counts.achievements}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center justify-between text-xs text-ink-muted">
              <span>Status: <strong className="text-ink">{statusFilter}</strong></span>
              <span>Showing: <strong className="text-ink">{filteredItems.length}</strong> items</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. PILL / CHIP FILTER BAR */}
      <ModerationFilterTabs activeTab={activeTab} counts={counts} onTabChange={setActiveTab} />

      {/* 3. RESPONSIVE TABLE VIEW */}
      {activeTab === 'github-projects' ? (
        <GithubProjectsTable githubProjects={githubProjects} />
      ) : loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-ink-muted font-medium">Loading moderation items…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center p-6">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
          <button onClick={fetchItems} className="btn btn-secondary text-sm cursor-pointer shadow-xs">
            Try again
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center p-6">
          <Inbox className="w-12 h-12 text-ink-muted" />
          <p className="text-base font-semibold text-ink">Queue is clear</p>
          <p className="text-sm text-ink-muted max-w-md">
            No submissions matching your current filters require moderation right now.
          </p>
        </div>
      ) : (
        <ModerationQueueTable
          paginatedItems={paginatedItems}
          filteredCount={filteredItems.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={PAGE_SIZE}
          onSelect={(id) => setSelectedItemId(id)}
          onPageChange={setCurrentPage}
        />
      )}

      {selectedItem && (
        <ModerationReviewModal
          selectedItem={selectedItem}
          filteredItems={filteredItems}
          selectedIndex={selectedIndex}
          typeKeyFor={typeKeyFor}
          onClose={() => setSelectedItemId(null)}
          onSelectItem={(id) => setSelectedItemId(id)}
          onUpdateItems={(updater) => setItems(updater)}
          showToast={showToast}
          getDriveWatchUrl={getDriveWatchUrl}
        />
      )}
    </div>
  );
};

export default ModerationPage;

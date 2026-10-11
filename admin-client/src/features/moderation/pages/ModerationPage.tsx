import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { useModeration } from '../hooks/useModeration';
import { ModerationHeader } from '../components/ModerationHeader';
import { ModerationFilterTabs } from '../components/ModerationFilterTabs';
import { ModerationQueueTable } from '../components/ModerationQueueTable';
import { GithubProjectsTable } from '../components/GithubProjectsTable';
import { ModerationReviewModal } from '../components/ModerationReviewModal';

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
    <div className="space-y-6 text-left page-enter">
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

      <ModerationFilterTabs activeTab={activeTab} counts={counts} onTabChange={setActiveTab} />

      {activeTab === 'github-projects' ? (
        <GithubProjectsTable githubProjects={githubProjects} />
      ) : loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-body-sm text-ink-muted font-medium">Loading moderation items…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-body-sm text-ink-muted">{error}</p>
          <button onClick={fetchItems} className="btn btn-secondary text-body-sm cursor-pointer">
            Try again
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 surface-sunken rounded-xl gap-3 text-center p-6">
          <Inbox className="w-12 h-12 text-ink-muted" />
          <p className="text-body-md font-semibold text-ink">Queue is clear</p>
          <p className="text-body-sm text-ink-muted max-w-md">
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

export default ModerationPage;

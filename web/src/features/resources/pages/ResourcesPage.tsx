import React from 'react';
import { BookOpen, FolderOpen } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useResources } from '../hooks/useResources';
import { SemesterTabs } from '../components/SemesterTabs';
import { ResourcesFilterBar } from '../components/ResourcesFilterBar';
import { SubjectCard } from '../components/SubjectCard';

export const ResourcesPage: React.FC = () => {
  const {
    allowedSemesters,
    selectedSemester,
    setSelectedSemester,
    selectedType,
    setSelectedType,
    searchQuery,
    setSearchQuery,
    groupedBySubject,
    isLoading,
    isError,
    error,
    refetch,
  } = useResources();

  if (isLoading) {
    return <SkeletonPage label="Loading study resources" cards={3} rows={3} />;
  }

  return (
    <div className="space-y-6 text-left page-enter max-w-5xl mx-auto pb-12 select-none" role="main">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 border-b border-edge pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <BookOpen className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-title-md sm:text-title-lg font-bold text-ink">
              Study Resources
            </h1>
            <p className="text-body-sm text-ink-secondary">
              Verified lecture notes, presentation decks, past question papers, and lab manuals.
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <ErrorState
          title="Could not load resources"
          message={error || 'An error occurred while fetching study materials. Please try again.'}
          onRetry={refetch}
        />
      )}

      {/* Semester Navigation Tabs */}
      <SemesterTabs
        allowedSemesters={allowedSemesters}
        selectedSemester={selectedSemester}
        onSelectSemester={setSelectedSemester}
      />

      {/* Filter and Search Controls */}
      <ResourcesFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />

      {/* Resources Content List */}
      {groupedBySubject.length > 0 ? (
        <div className="grid gap-6">
          {groupedBySubject.map((group) => (
            <SubjectCard
              key={group.subject}
              subject={group.subject}
              items={group.items}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="No materials uploaded yet for this semester"
          description={
            searchQuery || selectedType !== 'ALL'
              ? 'No resources match your search criteria. Try clearing the filter or search term.'
              : `Semester ${selectedSemester} study materials are currently being prepared and curated by department coordinators.`
          }
          action={
            searchQuery || selectedType !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('ALL');
                }}
                className="btn btn-secondary text-xs sm:text-sm"
              >
                Clear all filters
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
};

export default ResourcesPage;

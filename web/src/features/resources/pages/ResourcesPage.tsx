import React from 'react';
import { BookOpen, FolderOpen, Sparkles } from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { EmptyState } from '@/shared/ui/EmptyState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
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
    isFetching,
    isError,
    error,
    refetch,
  } = useResources();

  if (isLoading && !groupedBySubject.length) {
    return <SkeletonPage label="Loading study resources" cards={3} rows={3} />;
  }

  const totalMaterials = groupedBySubject.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-12 select-none" role="main">
      {/* 1. ASYMMETRIC RESOURCE HERO */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <header className="space-y-2">
            <span className="badge badge-brand text-xs font-semibold">Department Library</span>
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <BookOpen className="size-5" aria-hidden="true" />
              </div>
              <h1 className="font-heading text-title-md sm:text-headline-lg font-bold text-ink">
                Study Resources
              </h1>
            </div>
            <p className="text-body-md text-ink-secondary max-w-xl">
              Verified lecture notes, presentation decks, past question papers, and lab manuals.
            </p>
          </header>

          <div className="space-y-3 pt-2">
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
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <Sparkles size={16} aria-hidden="true" />
                  Resource Spotlight
                </span>
                <span className="badge badge-brand text-[11px]">
                  Semester {selectedSemester}
                </span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Study materials are reviewed by faculty for curriculum alignment and exam preparation.
              </p>
              <div className="space-y-1.5 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Subjects: <span className="font-bold text-ink">{groupedBySubject.length}</span></div>
                <div>Available Documents: <span className="text-ink">{totalMaterials}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between text-label-xs text-ink-muted">
              <span>Verified Department Notes</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* Error state */}
      {isError && (
        <ErrorState
          title="Could not load resources"
          message={error || 'An error occurred while fetching study materials. Please try again.'}
          onRetry={refetch}
        />
      )}

      {/* 2. MASONRY RESOURCE CARDS */}
      <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
        {groupedBySubject.length > 0 ? (
        <MasonryGrid cols={2}>
          {groupedBySubject.map((group) => (
            <MasonryItem key={group.subject}>
              <div className="card-lift">
                <SubjectCard
                  subject={group.subject}
                  items={group.items}
                />
              </div>
            </MasonryItem>
          ))}
        </MasonryGrid>
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
                className="btn btn-secondary text-sm"
              >
                Clear all filters
              </button>
            ) : undefined
          }
        />
      )}
      </div>
    </div>
  );
};

export default ResourcesPage;


import React, { useEffect } from 'react';
import { Search, SlidersHorizontal, Users, Sparkles } from 'lucide-react';
import { StudentSession } from '@/shared/types';
import { Navbar } from '@/shared/layout/Navbar';
import { FooterReveal } from '@/shared/layout/FooterReveal';
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Skeleton, SkeletonAvatar } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { useDirectory } from '../hooks/useDirectory';
import { FilterControls, DirectoryStudentCard, DirectoryPagination } from '../components';

interface StudentDirectoryProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const StudentDirectoryPage: React.FC<StudentDirectoryProps> = ({ session, onLogout }) => {
  const {
    students,
    loading,
    failed,
    search,
    setSearch,
    yearFilter,
    updateYearFilter,
    sectionFilter,
    updateSectionFilter,
    skillFilter,
    updateSkillFilter,
    availableSkills,
    statusFilter,
    updateStatusFilter,
    page,
    setPage,
    total,
    totalPages,
    filtersOpen,
    setFiltersOpen,
    resetFilters,
    retry,
  } = useDirectory();

  useEffect(() => {
    document.title = 'Student Directory — ELITE Portal';
  }, []);

  const hasActiveFilters =
    Boolean(search) ||
    yearFilter !== 'ALL' ||
    sectionFilter !== 'ALL' ||
    Boolean(skillFilter) ||
    statusFilter !== 'ALL';

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-canvas px-6 sm:px-10 space-y-10">
          {/* 1. ASYMMETRICAL SEARCH/FILTERS HERO BANNER */}
          <AsymGrid>
            <AsymFeatured cols="8">
              <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-brand text-xs font-semibold">
                    Department of Information Technology
                  </span>
                  <span className="text-label-xs sm:text-label-sm font-medium text-ink-muted">
                    {loading ? 'Searching catalog…' : `${total} students enrolled`}
                  </span>
                </div>
                <h1 className="font-heading text-headline-xl-mobile font-extrabold tracking-tight text-ink sm:text-headline-xl">
                  Student Directory
                </h1>
                <p className="text-body-md sm:text-body-lg text-ink-secondary max-w-2xl">
                  Explore profiles of students across all academic years. Filter by batch, section, or core technical skills.
                </p>

                {/* Integrated Search Input in Featured Hero */}
                <div className="pt-2 flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <label htmlFor="search-input" className="sr-only">Search directory</label>
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                      aria-hidden="true"
                    />
                    <input
                      id="search-input"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, roll number, or skill…"
                      className="input pl-10 h-11 text-sm sm:text-base rounded-xl"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    className="lg:hidden min-h-[44px] min-w-[44px] px-4"
                    onClick={() => setFiltersOpen(true)}
                    icon={SlidersHorizontal}
                    aria-label="Open filter options"
                  >
                    Filters
                  </Button>
                </div>
              </header>
            </AsymFeatured>

            <AsymSide cols="4">
              <AsymAccent className="flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                      <Sparkles size={14} aria-hidden="true" />
                      Directory Spotlight
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="text-label-xs font-semibold text-ink-brand hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                  <p className="text-body-xs font-medium text-ink-secondary">
                    Connect with peers, find hackathon teammates, and benchmark technical portfolios.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-brand/15 flex items-center justify-between text-label-xs text-ink-muted">
                  <span>Showing {students.length} of {total}</span>
                  <span className="font-semibold text-brand">Page {page} / {totalPages || 1}</span>
                </div>
              </AsymAccent>
            </AsymSide>
          </AsymGrid>

          {/* MAIN DIRECTORY BODY: Filters + Masonry Grid */}
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <aside className="hidden lg:col-span-4 lg:block">
              <Card className="sticky top-24 space-y-5 p-6 rounded-2xl">
                <div className="flex items-center justify-between border-b border-edge pb-3">
                  <h2 className="font-heading text-headline-sm font-bold text-ink">Filters</h2>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-label-sm font-semibold text-ink-brand hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <FilterControls
                  idPrefix="desktop"
                  yearFilter={yearFilter}
                  setYearFilter={updateYearFilter}
                  sectionFilter={sectionFilter}
                  setSectionFilter={updateSectionFilter}
                  skillFilter={skillFilter}
                  setSkillFilter={updateSkillFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={updateStatusFilter}
                  availableSkills={availableSkills}
                />
              </Card>
            </aside>

            <section className="lg:col-span-8">
              <div className="mb-4 flex items-center justify-between text-label-md text-ink-secondary">
                <span>{loading ? 'Searching…' : `${total} students found`}</span>
              </div>

              {/* 2. MASONRY STUDENT CARD GRID */}
              <div>
                {loading ? (
                  <MasonryGrid cols={2}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <MasonryItem key={i}>
                        <Card className="flex items-start gap-4 p-5 rounded-xl">
                          <SkeletonAvatar className="size-12 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </Card>
                      </MasonryItem>
                    ))}
                  </MasonryGrid>
                ) : failed ? (
                  <ErrorState
                    title="Unable to load directory"
                    message="We couldn't reach the student directory."
                    onRetry={retry}
                  />
                ) : students.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No students found"
                    description="Try loosening your filters or searching with a different term."
                  />
                ) : (
                  <MasonryGrid cols={2}>
                    {students.map((st) => (
                      <MasonryItem key={st.rollNo}>
                        <DirectoryStudentCard student={st} />
                      </MasonryItem>
                    ))}
                  </MasonryGrid>
                )}
              </div>

              <DirectoryPagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </section>
          </div>
        </div>
      </main>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter directory">
        <div className="space-y-4">
          <FilterControls
            idPrefix="mobile"
            yearFilter={yearFilter}
            setYearFilter={updateYearFilter}
            sectionFilter={sectionFilter}
            setSectionFilter={updateSectionFilter}
            skillFilter={skillFilter}
            setSkillFilter={updateSkillFilter}
            statusFilter={statusFilter}
            setStatusFilter={updateStatusFilter}
            availableSkills={availableSkills}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={resetFilters} className="min-h-[44px]">Reset</Button>
            <Button onClick={() => setFiltersOpen(false)} className="min-h-[44px]">Done</Button>
          </div>
        </div>
      </Modal>

      <FooterReveal />
    </div>
  );
};

export default StudentDirectoryPage;

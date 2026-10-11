import React, { useEffect } from 'react';
import { Search, SlidersHorizontal, Users } from 'lucide-react';
import { StudentSession } from '@/shared/types';
import { Navbar } from '@/shared/layout/Navbar';
import { Footer } from '@/shared/layout/Footer';
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Skeleton, SkeletonAvatar } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
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
        <div className="mx-auto max-w-canvas px-6 sm:px-10">
          <header className="max-w-2xl">
            <p className="text-label-md uppercase tracking-widest text-ink-brand">
              Department of Information Technology
            </p>
            <h1 className="mt-3 font-heading text-headline-xl-mobile font-extrabold tracking-tight text-ink sm:text-headline-xl">
              Student Directory
            </h1>
            <p className="mt-4 text-body-lg text-ink-secondary">
              Explore profiles of students across all academic years. Filter by batch, section, or core technical skills.
            </p>
          </header>

          <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <aside className="hidden lg:col-span-4 lg:block">
              <Card className="sticky top-24 space-y-5 p-6">
                <div className="flex items-center justify-between border-b border-edge pb-3">
                  <h2 className="font-heading text-headline-sm font-bold text-ink">Filters</h2>
                  {hasActiveFilters && (
                    <button type="button" onClick={resetFilters} className="text-label-sm font-semibold text-ink-brand hover:underline">
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
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <label htmlFor="search-input" className="sr-only">Search directory</label>
                  <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                  <input
                    id="search-input"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, roll number, or skill…"
                    className="input pl-10"
                  />
                </div>
                <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(true)} icon={SlidersHorizontal}>
                  Filters
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-between text-label-md text-ink-secondary">
                <span>{loading ? 'Searching…' : `${total} students found`}</span>
              </div>

              <div className="mt-6">
                {loading ? (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="flex items-start gap-4 p-5">
                        <SkeletonAvatar className="size-12" />
                        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                      </Card>
                    ))}
                  </ul>
                ) : failed ? (
                  <ErrorState title="Unable to load directory" message="We couldn't reach the student directory." onRetry={retry} />
                ) : students.length === 0 ? (
                  <EmptyState icon={Users} title="No students found" description="Try loosening your filters or searching with a different term." />
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {students.map((st) => (
                      <DirectoryStudentCard key={st.rollNo} student={st} />
                    ))}
                  </ul>
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
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
};

export default StudentDirectoryPage;

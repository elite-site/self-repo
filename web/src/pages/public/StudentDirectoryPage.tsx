import React, { useEffect, useState } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { getPhotoStyle } from '../../utils/photoStyle';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Chip } from '../../components/ui/Chip';
import { Skeleton, SkeletonAvatar } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { selectVariantsByName } from '../../lib/motion';

interface StudentDirectoryProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'GRADUATED';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'GRADUATED', label: 'Alumni' },
] as const;

/* ── What this page reads ───────────────────────────────────────────────────
 * The list endpoint returns `skills` on the profile as `{ skill: { name } }`
 * rows. Nothing outside that shape is requested: the directory is
 * unauthenticated, so the page may only render what `/public/students` already
 * returns to anyone.
 */

interface DirectorySkill {
  skill?: { name?: string | null } | null;
  name?: string | null;
}

interface DirectoryPhotoFields {
  photoUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  photoZoom?: number | null;
  skills?: DirectorySkill[] | null;
}

interface DirectoryStudent {
  id?: string;
  rollNo: string;
  name?: string | null;
  year?: number | null;
  section?: string | null;
  status?: string | null;
  photoUrl?: string | null;
  skills?: DirectorySkill[] | null;
  profile?: DirectoryPhotoFields | null;
}

interface FilterControlsProps {
  /** Desktop and mobile render the same controls, so their ids have to differ. */
  idPrefix: string;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  sectionFilter: string;
  setSectionFilter: (value: string) => void;
  skillFilter: string;
  setSkillFilter: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  availableSkills: Array<{ id: string; name: string }>;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  idPrefix,
  yearFilter,
  setYearFilter,
  sectionFilter,
  setSectionFilter,
  skillFilter,
  setSkillFilter,
  statusFilter,
  setStatusFilter,
  availableSkills,
}) => (
  <>
    <div>
      <span className="label">Status</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Student status">
        {STATUS_FILTERS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={statusFilter === option.value}
            onClick={() => setStatusFilter(option.value)}
          />
        ))}
      </div>
    </div>

    <div>
      <label htmlFor={`${idPrefix}-year`} className="label">
        Academic year
      </label>
      <select
        id={`${idPrefix}-year`}
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
        className="select"
      >
        <option value="ALL">All years</option>
        <option value="1">1st year</option>
        <option value="2">2nd year</option>
        <option value="3">3rd year</option>
        <option value="4">4th year</option>
      </select>
    </div>

    <div>
      <label htmlFor={`${idPrefix}-section`} className="label">
        Class section
      </label>
      <select
        id={`${idPrefix}-section`}
        value={sectionFilter}
        onChange={(e) => setSectionFilter(e.target.value)}
        className="select"
      >
        <option value="ALL">All sections</option>
        <option value="A">Section A</option>
        <option value="B">Section B</option>
        <option value="C">Section C</option>
      </select>
    </div>

    <div>
      <label htmlFor={`${idPrefix}-skill`} className="label">
        Skill
      </label>
      <select
        id={`${idPrefix}-skill`}
        value={skillFilter}
        onChange={(e) => setSkillFilter(e.target.value)}
        className="select"
      >
        <option value="">All technical skills</option>
        {availableSkills.map((sk) => (
          <option key={sk.id} value={sk.name}>
            {sk.name}
          </option>
        ))}
      </select>
    </div>
  </>
);

/**
 * A directory row: the student's photo (or their initials), their name, their
 * place on the roster, and the first three skills they list.
 *
 * The photo element is hand-rolled for the same reason the profile page's is —
 * `getPhotoStyle` carries the crop offsets the student chose in the photo
 * editor, and the `Avatar` primitive owns its own `<img>` with no way to pass
 * them. The wrapper carries the accessible name, so the image itself stays out
 * of the accessibility tree.
 */
const DirectoryPhoto: React.FC<{
  name: string;
  src: string | null;
  profile?: DirectoryPhotoFields | null;
}> = ({ name, src, profile }) => {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge bg-brand font-heading text-headline-sm font-bold text-on-brand">
      <span aria-hidden="true">{initials || 'IT'}</span>
      {src && (
        <img
          src={src}
          alt={`${name}'s profile photo`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full"
          style={getPhotoStyle(profile)}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </span>
  );
};

export const StudentDirectoryPage: React.FC<StudentDirectoryProps> = ({ session, onLogout }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const shouldReduce = useReducedMotion();
  const reveal = selectVariantsByName(shouldReduce, 'scrollReveal');

  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('');
  const [availableSkills, setAvailableSkills] = useState<Array<{ id: string; name: string }>>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const limit = 24;

  // Debounce search input to avoid hitting backend on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Synchronize search state if the URL search query param changes
  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== search) {
      setSearch(q);
      setDebouncedSearch(q);
      setPage(1);
    }
  }, [searchParams]);

  // Load real skills from the Skill table
  useEffect(() => {
    api
      .getPublicSkills()
      .then((skills) => {
        if (Array.isArray(skills)) setAvailableSkills(skills);
      })
      .catch(() => {});
  }, []);

  // Fetch paginated students whenever search, filters or page change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    api
      .getPublicStudents({
        search: debouncedSearch.trim() || undefined,
        year: yearFilter === 'ALL' ? undefined : yearFilter,
        section: sectionFilter === 'ALL' ? undefined : sectionFilter,
        skillName: skillFilter || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit,
      })
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.students)) {
          setStudents(data.students);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages || Math.ceil((data.total ?? 0) / limit) || 1);
        } else if (Array.isArray(data)) {
          setStudents(data);
          setTotal(data.length);
          setTotalPages(1);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStudents([]);
        setTotal(0);
        setTotalPages(1);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, yearFilter, sectionFilter, skillFilter, statusFilter, page, reloadKey]);

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setYearFilter('ALL');
    setSectionFilter('ALL');
    setSkillFilter('');
    setStatusFilter('ALL');
    setPage(1);
    if (searchParams.get('search')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('search');
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Every filter resets the page. Changing the year while on page 4 used to keep
  // the page number, which returned an empty list for a filter with one page.
  const handleYearChange = (value: string) => {
    setYearFilter(value);
    setPage(1);
  };
  const handleSectionChange = (value: string) => {
    setSectionFilter(value);
    setPage(1);
  };
  const handleSkillChange = (value: string) => {
    setSkillFilter(value);
    setPage(1);
  };
  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    if (searchParams.get('search')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('search');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const activeFilterCount = [
    yearFilter !== 'ALL',
    sectionFilter !== 'ALL',
    Boolean(skillFilter),
    statusFilter !== 'ALL',
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(search) || activeFilterCount > 0;

  const resultCountText = loading
    ? 'Loading students'
    : failed
      ? 'Could not load students'
      : students.length === 0
        ? 'No students found'
        : `Showing ${students.length} of ${total} students`;

  const filterProps = {
    yearFilter,
    setYearFilter: handleYearChange,
    sectionFilter,
    setSectionFilter: handleSectionChange,
    skillFilter,
    setSkillFilter: handleSkillChange,
    statusFilter,
    setStatusFilter: handleStatusChange,
    availableSkills,
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />

      <main className="mx-auto w-full max-w-canvas flex-1 px-6 py-8 sm:px-10 sm:py-10">
        <header className="mb-6">
          <h1 className="font-heading text-headline-lg-mobile text-ink sm:text-headline-lg">Students</h1>
          <p className="mt-1 text-body-md text-ink-secondary">
            Explore the people building the department.
          </p>
        </header>

        {/* SEARCH + FILTERS */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="directory-search-main" className="sr-only">
              Search students
            </label>
            <Search
              size={16}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-4 top-3 text-ink-muted"
              aria-hidden="true"
            />
            <input
              id="directory-search-main"
              type="text"
              placeholder="Search by name, roll number or skill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-11"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-2.5 flex size-6 cursor-pointer items-center justify-center rounded text-ink-muted transition-colors hover:text-ink"
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="lg:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              icon={SlidersHorizontal}
            >
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <Badge label={String(activeFilterCount)} variant="brand" dot={false} />
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters}>
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Desktop keeps the controls inline: four controls in one row is a
            toolbar, not the two-column wall of dropdowns this page used to be. */}
        <div className="mt-4 hidden items-end gap-3 lg:flex [&>*]:w-44">
          <FilterControls idPrefix="desktop" {...filterProps} />
        </div>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {resultCountText}
        </div>

        <p className="mb-4 mt-6 text-body-sm text-ink-secondary">
          {loading ? 'Searching…' : `${total} ${total === 1 ? 'student' : 'students'}`}
          {hasActiveFilters && !loading ? ' matching your filters' : ''}
        </p>

        {loading ? (
          <div aria-busy="true">
            <span className="sr-only" role="status">
              Loading students
            </span>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i} className="surface flex items-start gap-4 p-4">
                  <SkeletonAvatar className="size-14" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : failed ? (
          <ErrorState
            title="We could not load the directory"
            message="Something went wrong while loading student profiles."
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasActiveFilters ? 'No students match these filters' : 'No public profiles yet'}
            description={
              hasActiveFilters
                ? 'Try a different skill, year or section, or clear the filters to see everyone.'
                : 'As students publish their portfolios they will appear in this directory.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="primary" onClick={resetFilters}>
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => {
                const rawPhoto = student.profile?.photoUrl || student.photoUrl;
                const photoUrl = rawPhoto ? resolveMediaUrl(rawPhoto) : null;
                const skillsList = student.profile?.skills || student.skills || [];
                const name = student.name || '';

                return (
                  <li key={student.id || student.rollNo}>
                    <motion.div
                      variants={reveal}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, amount: 0.2 }}
                      className="h-full"
                    >
                      <Link
                        to={`/students/${student.rollNo}`}
                        className="group block h-full rounded-xl"
                      >
                        <Card variant="interactive" className="flex h-full items-start gap-4 p-4">
                          <DirectoryPhoto
                            name={name}
                            src={photoUrl}
                            profile={student.profile}
                          />

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="line-clamp-2 break-words font-heading text-label-lg font-semibold text-ink">
                                {name}
                              </span>
                              {student.status === 'GRADUATED' && (
                                <span className="badge badge-draft">Alumni</span>
                              )}
                            </span>
                            <span className="mt-0.5 block line-clamp-2 text-body-sm text-ink-muted">
                              {student.rollNo} · Year {student.year || 1} · Section{' '}
                              {student.section || 'A'}
                            </span>

                            {skillsList.length > 0 && (
                              <span className="mt-2 flex flex-wrap gap-1.5">
                                {skillsList.slice(0, 3).map((entry, index) => {
                                  const skillName =
                                    typeof entry === 'string'
                                      ? entry
                                      : entry.skill?.name || entry.name || '';
                                  if (!skillName) return null;
                                  return (
                                    <span
                                      key={`${skillName}-${index}`}
                                      className="rounded border border-edge bg-surface-inset px-2 py-0.5 text-label-md text-ink-secondary"
                                    >
                                      {skillName}
                                    </span>
                                  );
                                })}
                                {skillsList.length > 3 && (
                                  <span className="px-1 py-0.5 text-label-md text-ink-muted">
                                    +{skillsList.length - 3}
                                  </span>
                                )}
                              </span>
                            )}
                          </span>

                          <ChevronRight
                            size={16}
                            strokeWidth={1.75}
                            className="mt-1 shrink-0 text-ink-muted transition-transform duration-fast group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </Card>
                      </Link>
                    </motion.div>
                  </li>
                );
              })}
            </ul>

            {total > 0 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-edge pt-6 sm:flex-row">
                <p className="text-body-sm text-ink-secondary">
                  Showing{' '}
                  <span className="font-semibold text-ink">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-semibold text-ink">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="font-semibold text-ink">{total} students</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    aria-label="Previous page"
                    icon={ChevronLeft}
                  >
                    <span>Previous</span>
                  </Button>
                  <span className="px-2 text-body-sm text-ink-secondary">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    aria-label="Next page"
                    icon={ChevronRight}
                    iconPosition="end"
                  >
                    <span>Next</span>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MOBILE FILTER SHEET — `Modal`, which is a bottom sheet under `md`. */}
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={resetFilters}>
              Clear all
            </Button>
            <Button variant="primary" onClick={() => setFiltersOpen(false)}>
              Show results
            </Button>
          </>
        }
      >
        <FilterControls idPrefix="mobile" {...filterProps} />
      </Modal>

      <Footer />
    </div>
  );
};

export default StudentDirectoryPage;
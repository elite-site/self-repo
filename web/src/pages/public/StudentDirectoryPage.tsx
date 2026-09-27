import React, { useEffect, useState } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Users, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { BrandedLoading } from '../../components/BrandedLoading';
import { getPhotoStyle } from '../../utils/photoStyle';

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

export const StudentDirectoryPage: React.FC<StudentDirectoryProps> = ({ session, onLogout }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Load real skills from Skill table
  useEffect(() => {
    api.getPublicSkills()
      .then((skills) => {
        if (Array.isArray(skills)) setAvailableSkills(skills);
      })
      .catch(() => {});
  }, []);

  // Fetch paginated students whenever search or filters or page changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getPublicStudents({
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, yearFilter, sectionFilter, skillFilter, statusFilter, page]);

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

  const hasActiveFilters = search || yearFilter !== 'ALL' || sectionFilter !== 'ALL' || skillFilter || statusFilter !== 'ALL';

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col font-sans text-left text-[#0F172A]">
      <Navbar session={session} onLogout={onLogout} />

      {/* HEADER BANNER */}
      <div className="bg-white border-b border-[#E4E7F2] py-12 sm:py-14">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-[#E11D48] border border-rose-200 text-xs font-mono font-bold tracking-widest uppercase">
            <Users className="w-3.5 h-3.5" />
            <span>VERIFIED IT DIRECTORY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading text-[#0F172A]">
            Student Directory
          </h1>
          <p className="text-[#475569] max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
            Discover verified students, technical projects, engineering portfolios, and department credentials.
          </p>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-6 sm:px-10 py-10 w-full">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT SIDEBAR: FILTERS */}
          <aside className="w-full lg:w-72 shrink-0 space-y-5">
            <div className="bg-white p-6 rounded-lg border border-[#E4E7F2] shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
              <div className="flex items-center justify-between border-b border-[#E4E7F2] pb-3">
                <h3 className="font-bold text-sm text-[#0F172A] font-heading flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#4F46E5]" />
                  <span>Filter Directory</span>
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-[#E11D48] hover:underline font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div>
                <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">
                  Student Status
                </div>
                <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Student status">
                  {STATUS_FILTERS.map((option) => {
                    const isActive = statusFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setStatusFilter(option.value)}
                        className={`min-h-10 px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 ${
                          isActive
                            ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                            : 'bg-[#F7F8FC] text-[#475569] border-[#E4E7F2] hover:bg-[#EEF2FF]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Year Filter */}
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block mb-1.5">
                  Academic Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full p-2.5 bg-[#F7F8FC] border border-[#E4E7F2] rounded-lg text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="ALL">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block mb-1.5">
                  Class Section
                </label>
                <select
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full p-2.5 bg-[#F7F8FC] border border-[#E4E7F2] rounded-lg text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#4F46E5] cursor-pointer"
                >
                  <option value="ALL">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              {/* Skill Filter */}
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block mb-1.5">
                  Filter by Skill
                </label>
                <select
                  value={skillFilter}
                  onChange={(e) => {
                    setSkillFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full p-2.5 bg-[#F7F8FC] border border-[#E4E7F2] rounded-lg text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#4F46E5] cursor-pointer"
                >
                  <option value="">All Technical Skills</option>
                  {availableSkills.map((sk) => (
                    <option key={sk.id} value={sk.name}>
                      {sk.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* RIGHT: SEARCH & STUDENT CARDS */}
          <div className="flex-1 w-full space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search by student name, roll number, or skill (e.g. React, Python)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#E4E7F2] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    if (searchParams.get('search')) {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.delete('search');
                      setSearchParams(nextParams, { replace: true });
                    }
                  }}
                  className="absolute right-3.5 top-3 text-[#94A3B8] hover:text-[#475569] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* RESULTS */}
            {loading ? (
              <div className="py-16">
                <BrandedLoading fullScreen={false} message="Loading Student Directory..." />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-20 px-6 bg-white border border-[#E4E7F2] rounded-lg space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-[#0F172A] font-heading">
                  {search || hasActiveFilters
                    ? 'No students match your search criteria.'
                    : 'No public student profiles yet.'}
                </h3>
                <p className="text-xs text-[#475569] max-w-sm mx-auto leading-relaxed">
                  {search || hasActiveFilters
                    ? 'Try searching with a different skill, name, or roll number.'
                    : 'As students update their portfolios, they will appear in this directory.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-lg text-xs font-bold transition-opacity cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map((s: any) => {
                  const photoUrl = s.profile?.photoUrl || s.photoUrl
                    ? resolveMediaUrl(s.profile?.photoUrl || s.photoUrl!)
                    : null;
                  const skillsList = s.profile?.skills || s.skills || [];
                  const initials = (s.name || '')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0]?.toUpperCase())
                    .join('');

                  return (
                    <Link
                      to={`/students/${s.rollNo}`}
                      key={s.id || s.rollNo}
                      className="bg-white border border-[#E4E7F2] rounded-lg p-6 hover:shadow-md hover:border-[#4F46E5]/40 transition-all group flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-14 h-14 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-base shadow-xs group-hover:bg-[#4F46E5] group-hover:text-white transition-colors overflow-hidden">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={s.name}
                                loading="lazy"
                                decoding="async"
                                style={getPhotoStyle(s.profile)}
                              />
                            ) : (
                              initials || 'IT'
                            )}
                          </div>
                          <span className="text-[11px] font-semibold bg-[#F7F8FC] text-[#475569] px-2.5 py-1 rounded-full border border-[#E4E7F2]">
                            Year {s.year || 1} · Sec {s.section || 'A'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-[#0F172A] font-heading group-hover:text-[#4F46E5] transition-colors line-clamp-1">
                            {s.name}
                          </h3>
                          <div className="text-xs text-[#94A3B8] mt-0.5">
                            {s.rollNo}
                          </div>
                        </div>

                        {skillsList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {skillsList.slice(0, 3).map((sk: any, idx: number) => {
                              const skillName = sk.skill?.name || sk.name || sk;
                              return (
                                <span
                                  key={idx}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5]"
                                >
                                  {skillName}
                                </span>
                              );
                            })}
                            {skillsList.length > 3 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#F7F8FC] text-[#94A3B8]">
                                +{skillsList.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#E4E7F2] flex items-center justify-between text-xs font-bold text-[#4F46E5] group-hover:translate-x-0.5 transition-transform">
                        <span>View Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })}

                {/* PAGINATION CONTROLS */}
                {total > 0 && (
                  <div className="col-span-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E4E7F2] mt-2">
                    <div className="text-xs text-[#475569]">
                      Showing <span className="font-bold text-[#0F172A]">{(page - 1) * limit + 1}</span>–
                      <span className="font-bold text-[#0F172A]">{Math.min(page * limit, total)}</span> of{' '}
                      <span className="font-bold text-[#0F172A]">{total}</span> students
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E4E7F2] bg-white text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>
                      <span className="text-xs font-medium text-[#475569] px-2">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E4E7F2] bg-white text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StudentDirectoryPage;

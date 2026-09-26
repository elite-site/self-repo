import React, { useEffect, useState } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { StudentSession } from '../../types';
import { Link } from 'react-router-dom';
import { Search, Filter, Loader2, Users, ArrowRight, Sparkles, X } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

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
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'name'>('latest');

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getPublicStudents({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      if (Array.isArray(data)) setStudents(data);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [statusFilter]);

  const filtered = students.filter((s) => {
    // Search by name or roll number
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchRoll = s.rollNo?.toLowerCase().includes(q);
      if (!matchName && !matchRoll) return false;
    }

    // Filter by Year
    if (yearFilter !== 'ALL' && String(s.year) !== yearFilter) {
      return false;
    }

    // Filter by Section
    if (sectionFilter !== 'ALL' && String(s.section).toUpperCase() !== sectionFilter) {
      return false;
    }

    // Filter by Skill
    if (skillFilter.trim()) {
      const qSkill = skillFilter.toLowerCase();
      const studentSkills = (s.profile?.skills || []).map((sk: any) =>
        (sk.skill?.name || sk.name || sk).toLowerCase()
      );
      const hasSkill = studentSkills.some((sk: string) => sk.includes(qSkill));
      if (!hasSkill) return false;
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    return 0; // Default order from DB
  });

  const resetFilters = () => {
    setSearch('');
    setYearFilter('ALL');
    setSectionFilter('ALL');
    setSkillFilter('');
    setStatusFilter('ALL');
    setSortBy('latest');
  };

  const hasActiveFilters = search || yearFilter !== 'ALL' || sectionFilter !== 'ALL' || skillFilter || statusFilter !== 'ALL';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-left">
      <Navbar session={session} onLogout={onLogout} />

      {/* HEADER BANNER */}
      <div className="bg-[#0B192C] text-white py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-mono font-bold tracking-widest uppercase">
            <Users className="w-3.5 h-3.5" />
            <span>VERIFIED IT DIRECTORY</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display">
            Student Directory
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
            Discover verified students, technical projects, engineering portfolios, and department credentials.
          </p>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-6 sm:px-10 py-10 w-full">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT SIDEBAR: FILTERS */}
          <aside className="w-full lg:w-72 shrink-0 space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-bold text-sm text-[#0B192C] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-elite-red" />
                  <span>Filter Directory</span>
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-elite-red hover:underline font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                        className={`min-h-10 px-2 py-2 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-elite-red focus:ring-offset-2 ${
                          isActive
                            ? 'bg-[#0B192C] text-white border-[#0B192C]'
                            : 'bg-neutral-50 text-slate-600 border-[#E2E8F0] hover:bg-neutral-100'
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
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Academic Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-[#E2E8F0] rounded-xl text-xs text-[#0B192C] font-medium focus:outline-none focus:border-elite-red"
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
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Class Section
                </label>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-[#E2E8F0] rounded-xl text-xs text-[#0B192C] font-medium focus:outline-none focus:border-elite-red"
                >
                  <option value="ALL">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              {/* Skill Filter */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Skills & Tech Stack
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Python, Java..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-[#E2E8F0] rounded-xl text-xs text-[#0B192C] font-medium focus:outline-none focus:border-elite-red"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Sort Order
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full p-2.5 bg-neutral-50 border border-[#E2E8F0] rounded-xl text-xs text-[#0B192C] font-medium focus:outline-none focus:border-elite-red"
                >
                  <option value="latest">Latest Profiles</option>
                  <option value="name">Name (A – Z)</option>
                </select>
              </div>
            </div>
          </aside>

          {/* RIGHT: SEARCH & STUDENT CARDS */}
          <div className="flex-1 w-full space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name or roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-xl shadow-xs text-xs text-[#0B192C] font-medium focus:outline-none focus:border-elite-red"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* RESULTS */}
            {loading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-elite-red" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-20 px-6 bg-white border border-[#E2E8F0] rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-[#0B192C]">
                  {students.length === 0
                    ? 'No public student profiles yet.'
                    : 'No students match your filter criteria.'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {students.length === 0
                    ? 'As students enable public visibility on their portfolios, they will appear in this directory.'
                    : 'Try clearing your search terms or filters to see more student profiles.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sorted.map((s) => {
                  // Root-relative API paths must be resolved against the API
                  // origin; the portal and API are served from different origins
                  // in production, so a bare path would 404.
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
                   const graduationYear =
                     typeof s.graduatedAt === 'string' ? s.graduatedAt.match(/^\d{4}/)?.[0] : undefined;

                   return (
                    <Link
                      to={`/students/${s.rollNo}`}
                      key={s.id || s.rollNo}
                      className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:shadow-md hover:border-neutral-300 transition-all group flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-14 h-14 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-elite-red transition-colors overflow-hidden">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              initials || 'IT'
                            )}
                          </div>
                          <span className="text-[11px] font-mono font-semibold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full border border-neutral-200/60">
                            Year {s.year || 1} · Sec {s.section || 'A'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-[#0B192C] group-hover:text-elite-red transition-colors line-clamp-1">
                            {s.name}
                          </h3>
                          <div className="text-xs font-mono text-neutral-400 mt-0.5">
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
                                  className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700"
                                >
                                  {skillName}
                                </span>
                              );
                            })}
                            {skillsList.length > 3 && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-neutral-50 text-neutral-400">
                                +{skillsList.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-elite-red group-hover:translate-x-0.5 transition-transform">
                        <span>View Profile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { StudentSession } from '../../types';
import { api, resolveMediaUrl } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { ArrowRight, Search, Users, Calendar, GraduationCap, CheckCircle2 } from 'lucide-react';

interface HomePageProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [featuredStudents, setFeaturedStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentTotal, setStudentTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .getPublicStudents({ limit: 3 })
      .then((data) => {
        if (cancelled) return;
        setFeaturedStudents(Array.isArray(data?.students) ? data.students : []);
        if (typeof data?.total === 'number') setStudentTotal(data.total);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) {
      navigate('/students');
      return;
    }
    navigate(`/students?search=${encodeURIComponent(clean)}`);
  };

  const handleSignIn = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  const stats = [
    studentTotal !== null ? { label: 'Verified profiles in the directory', value: studentTotal } : null,
  ].filter((stat): stat is { label: string; value: number } => stat !== null);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        {/* ── HERO: copy left, real featured content right ────────────────── */}
        <section className="border-b border-edge bg-surface">
          <div className="mx-auto grid grid-cols-1 max-w-canvas items-center gap-12 px-6 pb-16 pt-14 sm:px-10 sm:pb-20 sm:pt-20 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 lg:col-span-6">
              <p className="text-label-sm uppercase tracking-widest text-ink-brand">
                Department of Information Technology
              </p>
              <h1 className="mt-4 font-heading text-headline-xl-mobile font-extrabold tracking-tight text-ink sm:text-headline-xl">
                Meet the department, one student at a time.
              </h1>
              <p className="mt-5 max-w-[52ch] text-body-lg text-ink-secondary">
                Browse verified profiles, explore student portfolios, and register for department
                events. Sign in to publish your own.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={handleSignIn} className="btn btn-primary px-5 py-2.5">
                  <span>Student Sign In</span>
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                <Link to="/students" className="btn btn-secondary px-5 py-2.5">
                  <Users size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>Browse directory</span>
                </Link>
              </div>
              <p className="mt-3 text-label-md text-ink-muted">
                Sign in with your verified college Google account (@sasi.ac.in)
              </p>
            </div>

            <div className="min-w-0 lg:col-span-6">
              <div className="rounded-xl border border-edge bg-surface p-5 shadow-card sm:p-6">
                <div className="flex items-center justify-between gap-3 border-b border-edge pb-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-text">
                      <GraduationCap size={18} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-heading text-label-lg font-semibold text-ink">
                        Department Spotlight
                      </h2>
                      <p className="truncate text-label-md text-ink-muted">Information Technology · SASI</p>
                    </div>
                  </div>
                  <span className="badge badge-approved shrink-0">
                    <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                    Verified Roster
                  </span>
                </div>

                {studentsLoading ? (
                  <div className="py-8 text-center text-body-sm text-ink-secondary">
                    Loading department profiles…
                  </div>
                ) : featuredStudents.length > 0 ? (
                  <div className="divide-y divide-edge pt-2">
                    {featuredStudents.map((st) => (
                      <div key={st.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-soft-text overflow-hidden">
                            {st.profile?.photoUrl ? (
                              <img
                                src={resolveMediaUrl(st.profile.photoUrl)}
                                alt={st.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              st.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 break-words font-heading text-label-lg font-semibold text-ink">
                              {st.name}
                            </p>
                            <p className="line-clamp-2 text-label-sm text-ink-muted">
                              {st.rollNo} · Year {st.year} ({st.section})
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/students/${st.rollNo || st.id}`}
                          className="shrink-0 text-label-md font-semibold text-ink-brand hover:text-brand-hover"
                        >
                          View profile
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-body-sm text-ink-secondary">
                    Browse verified student profiles in the department directory.
                  </p>
                )}

                <div className="mt-4 border-t border-edge pt-4">
                  <Link
                    to="/students"
                    className="inline-flex items-center gap-1.5 text-label-lg font-semibold text-ink-brand hover:text-brand-hover"
                  >
                    <span>Browse the directory</span>
                    <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HIGHLIGHTS: fetched counts, or nothing at all ───────────────── */}
        {stats.length > 0 && (
          <section aria-label="Directory highlights" className="border-b border-edge">
            <div className="mx-auto max-w-canvas px-6 py-10 sm:px-10">
              <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dd className="font-heading text-headline-lg font-extrabold tabular-nums text-ink">
                      {stat.value}
                    </dd>
                    <dt className="mt-1 text-body-sm text-ink-secondary">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* ── SEARCH BAND: its own section, not a box inside the hero ─────── */}
        <section aria-labelledby="directory-search-title" className="border-b border-edge">
          <div className="mx-auto max-w-canvas px-6 py-14 sm:px-10 sm:py-16">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="min-w-0 lg:col-span-5">
                <h2
                  id="directory-search-title"
                  className="font-heading text-headline-lg-mobile font-extrabold tracking-tight text-ink sm:text-headline-lg"
                >
                  Search the student directory
                </h2>
                <p className="mt-3 max-w-[48ch] text-body-md text-ink-secondary">
                  Find students by name, roll number, or skill and open their verified profile,
                  portfolio, and resume.
                </p>
              </div>

              <form onSubmit={handleSearch} className="min-w-0 lg:col-span-7">
                <label htmlFor="directory-search" className="label">
                  Search students
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      strokeWidth={1.75}
                      className="pointer-events-none absolute left-3.5 top-3 text-ink-muted"
                      aria-hidden="true"
                    />
                    <input
                      id="directory-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name, roll number, or skill"
                      className="input pl-10"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary shrink-0">
                    <span>Search</span>
                  </button>
                </div>
                <p className="hint">Leave the field empty to browse all students.</p>
              </form>
            </div>
          </div>
        </section>

        {/* ── EVENTS BAND ─────────────────────────────────────────────────── */}
        <section aria-labelledby="events-band-title" className="border-t border-brand-soft bg-brand-soft">
          <div className="mx-auto max-w-prose px-6 py-14 text-center sm:px-10 sm:py-16">
            <h2
              id="events-band-title"
              className="font-heading text-headline-lg-mobile font-extrabold tracking-tight text-ink sm:text-headline-lg"
            >
              Department events are open to everyone
            </h2>
            <p className="mt-3 text-body-md text-ink-secondary">
              Browse the schedule, eligibility, and venue details before you sign in. Registration
              opens to students only.
            </p>
            <Link to="/events" className="btn btn-primary mt-7 px-5 py-2.5">
              <Calendar size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Browse department events</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;

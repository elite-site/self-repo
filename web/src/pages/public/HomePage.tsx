import React, { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { StudentSession, PublicIntroVideo } from '../../types';
import { api, resolveMediaUrl } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { GuidelinesSection } from '../../components/GuidelinesSection';
import { PublicVideoShowcase } from '../../components/PublicVideoShowcase';
import { ArrowRight, Search, Users, Calendar, GraduationCap, CheckCircle2 } from 'lucide-react';

interface HomePageProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { hash } = useLocation();

  // The published introduction videos, owned here so the hero's featured clip and
  // the showcase below share one request rather than firing two.
  const [videos, setVideos] = useState<PublicIntroVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosFailed, setVideosFailed] = useState(false);

  // Real counts, fetched rather than typed in. The old hero advertised "400+
  // students" and "50+ skills" as fixed copy, which is both unverifiable and
  // wrong the moment the roster changes. A stat we cannot load is simply not
  // shown.
  const [videoTotal, setVideoTotal] = useState<number | null>(null);
  const [studentTotal, setStudentTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .getPublicVideos()
      .then((res) => {
        if (cancelled) return;
        setVideos(Array.isArray(res?.items) ? res.items : []);
        setVideoTotal(typeof res?.total === 'number' ? res.total : null);
      })
      .catch(() => {
        if (!cancelled) setVideosFailed(true);
      })
      .finally(() => {
        if (!cancelled) setVideosLoading(false);
      });

    api
      .getPublicStudents({ limit: 1 })
      .then((data) => {
        if (!cancelled && typeof data?.total === 'number') setStudentTotal(data.total);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // React Router does not scroll to a hash on its own, so the "Guidelines" link
  // in the header and footer would land on the top of this page instead.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [hash]);

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

  const featuredVideo = videos[0] ?? null;
  const stats = [
    studentTotal !== null ? { label: 'Verified profiles in the directory', value: studentTotal } : null,
    videoTotal !== null ? { label: 'Published introduction videos', value: videoTotal } : null,
  ].filter((stat): stat is { label: string; value: number } => stat !== null);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        {/* ── HERO: copy left, real featured content right ────────────────── */}
        <section className="border-b border-edge bg-surface">
          <div className="mx-auto grid max-w-canvas items-center gap-12 px-6 pb-16 pt-14 sm:px-10 sm:pb-20 sm:pt-20 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
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

            <div className="lg:col-span-6">
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

                {featuredVideo ? (
                  <div className="pt-4">
                    <video
                      src={resolveMediaUrl(featuredVideo.streamUrl)}
                      poster={featuredVideo.thumbnailUrl ? resolveMediaUrl(featuredVideo.thumbnailUrl) : undefined}
                      controls
                      preload="none"
                      playsInline
                      className="aspect-video w-full rounded-lg bg-surface-inverse object-contain"
                    >
                      Your browser does not support video playback.
                    </video>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-heading text-label-lg font-semibold text-ink">
                          {featuredVideo.name}
                        </p>
                        <p className="truncate text-label-md text-ink-muted">
                          Year {featuredVideo.year} · Section {featuredVideo.section}
                        </p>
                      </div>
                      <Link
                        to={featuredVideo.profileUrl}
                        className="shrink-0 text-label-lg font-semibold text-ink-brand hover:text-brand-hover"
                      >
                        View profile
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="pt-4 text-body-sm text-ink-secondary">
                    {videosLoading
                      ? 'Loading the latest student introduction…'
                      : 'A student introduction video appears here once faculty have approved it and the student has published it.'}
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
            <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
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

              <form onSubmit={handleSearch} className="lg:col-span-7">
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

        {/* ── SHOWCASE: reuses the request the hero already made ──────────── */}
        <div className="mx-auto max-w-canvas px-6 sm:px-10">
          <PublicVideoShowcase videos={videos} loading={videosLoading} failed={videosFailed} />
        </div>

        <GuidelinesSection />

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

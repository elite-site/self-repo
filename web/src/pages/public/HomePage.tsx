import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { StudentSession } from '../../types';
import { api, resolveMediaUrl } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { PublicVideoShowcase } from '../../components/PublicVideoShowcase';
import { GuidelinesSection } from '../../components/GuidelinesSection';
import { usePublicVideos } from '../../hooks/usePublicVideos';
import { ArrowRight, Search, Users, Calendar, Play } from 'lucide-react';

interface HomePageProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  /**
   * The hero features the first published video and the showcase below lists
   * them all, so the request is made once here and handed down as `preloaded`.
   */
  const { videos, loading: videosLoading, failed: videosFailed } = usePublicVideos();

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

  const featured = videos[0];

  return (
    <div className="min-h-[100dvh] bg-surface-canvas text-ink flex flex-col">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1">
        {/* ── HERO: split, copy left, real student content right ─────────── */}
        <section className="border-b border-edge bg-surface">
          <div className="max-w-canvas mx-auto px-6 sm:px-10 pt-16 pb-14 sm:pt-20 sm:pb-16">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-6 text-left">
                <h1 className="text-headline-xl font-extrabold text-ink font-heading tracking-tight leading-[1.05]">
                  Meet the department, one student at a time.
                </h1>
                <p className="mt-5 text-body-md text-ink-secondary leading-relaxed max-w-[52ch]">
                  Browse verified profiles, watch approved introduction videos, and register for
                  department events. Sign in to publish your own.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    onClick={handleSignIn}
                    className="btn btn-primary"
                  >
                    <span>Student Sign In</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <Link to="/students" className="btn btn-secondary">
                    <Users className="w-4 h-4" aria-hidden="true" />
                    <span>Browse directory</span>
                  </Link>
                </div>
                <p className="mt-3 text-label-sm text-ink-muted">
                  Sign in with your verified college Google account (@sasi.ac.in)
                </p>
              </div>

              {/* Real content, not a mockup: the first published intro video.
                  Falls back to two working links when nothing is published yet,
                  which is the normal state before the first approval. */}
              <div className="lg:col-span-6">
                {videosLoading ? (
                  <div
                    aria-hidden="true"
                    className="aspect-video w-full rounded-lg bg-surface-sunken border border-edge"
                  />
                ) : featured ? (
                  <figure className="space-y-3">
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-surface-inverse border border-edge">
                      <video
                        src={resolveMediaUrl(featured.streamUrl)}
                        poster={featured.thumbnailUrl ? resolveMediaUrl(featured.thumbnailUrl) : undefined}
                        controls
                        preload="none"
                        playsInline
                        className="w-full h-full object-contain"
                      >
                        Your browser does not support video playback.
                      </video>
                    </div>
                    <figcaption className="flex items-center justify-between gap-4 text-left">
                      <div className="min-w-0">
                        <div className="text-body-sm font-bold text-ink font-heading truncate">
                          {featured.name}
                        </div>
                        <div className="text-label-sm text-ink-muted truncate">
                          {featured.rollNo} · Year {featured.year} · Section {featured.section}
                        </div>
                      </div>
                      <Link
                        to={featured.profileUrl}
                        className="shrink-0 text-label-sm font-bold text-ink-brand hover:text-ink-brand whitespace-nowrap"
                      >
                        View profile
                      </Link>
                    </figcaption>
                  </figure>
                ) : videosFailed ? (
                  <div className="rounded-lg border border-edge bg-surface-sunken p-6 text-left">
                    <p className="text-body-sm font-bold text-ink font-heading">
                      Video showcase unavailable
                    </p>
                    <p className="mt-1.5 text-body-sm text-ink-secondary leading-relaxed">
                      Introduction videos could not be loaded right now. The directory below still
                      works.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-edge bg-surface-sunken p-6 text-left space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-body-sm font-bold text-ink font-heading">
                          No introduction videos published yet
                        </p>
                        <p className="mt-1 text-body-sm text-ink-secondary leading-relaxed">
                          A video appears here once a student publishes one and faculty approve it.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to="/students" className="btn btn-secondary px-4 py-2 text-label-sm">
                        Browse the directory
                      </Link>
                      <Link to="/events" className="btn btn-secondary px-4 py-2 text-label-sm">
                        See department events
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── SEARCH BAND: its own section, not a box inside the hero ─────── */}
        <section aria-labelledby="directory-search-title" className="border-b border-edge">
          <div className="max-w-canvas mx-auto px-6 sm:px-10 py-14 sm:py-16">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-5">
                <h2
                  id="directory-search-title"
                  className="text-headline-md font-extrabold text-ink font-heading tracking-tight"
                >
                  Search the student directory
                </h2>
                <p className="mt-3 text-body-sm text-ink-secondary leading-relaxed max-w-[48ch]">
                  Find students by name, roll number, or skill and open their verified profile,
                  portfolio, and resume.
                </p>
              </div>

              <form onSubmit={handleSearch} className="lg:col-span-7">
                <label htmlFor="directory-search" className="label">
                  Search students
                </label>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search
                      className="w-4 h-4 absolute left-3.5 top-3 text-ink-muted pointer-events-none"
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
                <p className="mt-2 hint">
                  Leave the field empty to browse all students.
                </p>
              </form>
            </div>
          </div>
        </section>

        {/* ── VIDEO SHOWCASE: receives the request result from the hero ───── */}
        {/* Plain div, not a section: the showcase renders its own labelled
            <section>, and nesting two would duplicate the heading id. */}
        <div className="border-b border-edge bg-surface">
          <div className="max-w-canvas mx-auto px-6 sm:px-10">
            <PublicVideoShowcase videos={videos} loading={videosLoading} failed={videosFailed} />
          </div>
        </div>

        {/* ── GUIDELINES: revived from dead code, restructured 2x2 + span ─── */}
        <GuidelinesSection />

        {/* ── EVENTS: a real band, not an orphan button ───────────────────── */}
        <section aria-labelledby="events-band-title" className="bg-brand-soft border-t border-brand-soft">
          <div className="max-w-prose mx-auto px-6 sm:px-10 py-14 sm:py-16 text-center">
            <h2
              id="events-band-title"
              className="text-headline-md font-extrabold text-ink font-heading tracking-tight"
            >
              Department events are open to everyone
            </h2>
            <p className="mt-3 text-body-sm text-ink-secondary leading-relaxed">
              Browse the schedule, eligibility, and venue details before you sign in. Registration
              opens to students only.
            </p>
            <Link to="/events" className="btn btn-primary mt-7">
              <Calendar className="w-4 h-4" aria-hidden="true" />
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

import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { StudentSession } from '../../types';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { GuidelinesSection } from '../../components/GuidelinesSection';
import { ArrowRight, Search, Users, Calendar, GraduationCap, Award, CheckCircle2 } from 'lucide-react';

interface HomePageProps {
  session: StudentSession | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
                  Browse verified profiles, explore student portfolios, and register for
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

              {/* Clean, high-design portal highlight card */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl border border-edge bg-surface p-6 sm:p-8 shadow-card space-y-6 text-left">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-4 border-b border-edge pb-5">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-brand-soft text-brand-soft-text flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-brand" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-body-md font-bold text-ink font-heading leading-tight">
                          Department Spotlight
                        </h2>
                        <p className="text-label-sm text-ink-muted">
                          Information Technology · SASI
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-semibold bg-status-bg-approved text-status-approved border border-status-bg-approved">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Verified Roster</span>
                    </span>
                  </div>

                  {/* Quick stats metrics grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-surface-sunken border border-edge text-left">
                      <div className="text-headline-sm font-extrabold text-ink font-heading">
                        400+
                      </div>
                      <div className="text-label-sm font-medium text-ink-muted mt-0.5">
                        Active Students
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-sunken border border-edge text-left">
                      <div className="text-headline-sm font-extrabold text-ink font-heading">
                        100%
                      </div>
                      <div className="text-label-sm font-medium text-ink-muted mt-0.5">
                        Verified Profiles
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-sunken border border-edge text-left">
                      <div className="text-headline-sm font-extrabold text-ink font-heading">
                        50+
                      </div>
                      <div className="text-label-sm font-medium text-ink-muted mt-0.5">
                        Tech Skills
                      </div>
                    </div>
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-sunken/60 border border-edge">
                      <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-4 h-4 text-brand" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-bold text-ink font-heading">
                          Peer & Faculty Directory
                        </p>
                        <p className="text-label-sm text-ink-secondary leading-snug mt-0.5">
                          Directly discover student credentials, verified skills, and academic achievements.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-sunken/60 border border-edge">
                      <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand-soft-text flex items-center justify-center shrink-0 mt-0.5">
                        <Award className="w-4 h-4 text-brand" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-bold text-ink font-heading">
                          Endorsed Portfolios & Resumes
                        </p>
                        <p className="text-label-sm text-ink-secondary leading-snug mt-0.5">
                          Faculty-moderated achievements, certificates, and student projects.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 flex flex-wrap gap-2.5">
                    <Link to="/students" className="btn btn-secondary px-4 py-2 text-label-sm">
                      Browse the directory
                    </Link>
                    <Link to="/events" className="btn btn-secondary px-4 py-2 text-label-sm">
                      See department events
                    </Link>
                  </div>
                </div>
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

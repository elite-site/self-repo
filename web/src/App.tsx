import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, BrowserRouter } from 'react-router-dom';
import { StudentSession } from './types';
import { api, setStudentToken } from './services/api';

import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PortalFeaturesSection } from './components/PortalFeaturesSection';
import { StudentShowcaseSection } from './components/StudentShowcaseSection';
import { EliteEventsSection } from './components/EliteEventsSection';
import { PortfolioArchitectureSection } from './components/PortfolioArchitectureSection';
import { IntroVideoFeatureSection } from './components/IntroVideoFeatureSection';
import { StudentLogin } from './components/StudentLogin';
import { AboutSidebar } from './components/AboutSidebar';
import { GuidelinesSection } from './components/GuidelinesSection';
import { Footer } from './components/Footer';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

import { StudentLayout } from './components/layout/StudentLayout';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { PortfolioPage } from './pages/PortfolioPage';
import { VideoPage } from './pages/VideoPage';
import { ResumePage } from './pages/ResumePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { RegistrationsPage } from './pages/RegistrationsPage';
import { TeamsPage } from './pages/TeamsPage';
import { VotingPage } from './pages/VotingPage';
import { NotificationsPage } from './pages/NotificationsPage';

import { StudentDirectoryPage } from './pages/public/StudentDirectoryPage';
import { PublicStudentProfilePage } from './pages/public/PublicStudentProfilePage';
import { PublicResumeViewerPage } from './pages/public/PublicResumeViewerPage';

const SESSION_KEY = 'ita_student_session';

function loadSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentSession;
    if (!parsed?.token || !parsed?.student) return null;
    return parsed;
  } catch {
    return null;
  }
}

const LandingPage = ({ session }: { session: StudentSession | null }) => {
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col justify-between">
      <Navbar session={session} onLogout={() => {}} onNavigate={() => {}} />
      <main id="main-content">
        {/* 1. HERO SECTION */}
        <HeroSection />

        {/* 2. CORE CAPABILITIES (6 Cards) */}
        <PortalFeaturesSection />

        {/* 3. STUDENT SHOWCASE (Real DB directory preview) */}
        <StudentShowcaseSection />

        {/* 4. ELITE EVENTS (Real DB events) */}
        <EliteEventsSection />

        {/* 5. PORTFOLIO ARCHITECTURE (Projects, Skills, Achievements, Certs, Resume) */}
        <PortfolioArchitectureSection />

        {/* 6. INTRO VIDEO FEATURE (60-90s authentic intro clip) */}
        <IntroVideoFeatureSection />

        {/* 7. STUDENT AUTHENTICATION / ACCESS SECTION */}
        <section id="login-section" className="py-16 sm:py-20 bg-neutral-50 border-t border-neutral-200/80 text-left">
          <div className="max-w-7xl mx-auto px-6 sm:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>INSTITUTIONAL ACCESS</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight leading-tight">
                  Single Sign-On for IT Students
                </h2>
                <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-normal">
                  Log in using your verified college Google email (@sasi.ac.in). Your account is pre-registered on the official department roster.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-700 pt-2 font-medium">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Update your verified student profile</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Curate projects, skills & certificates</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Register for department events & teams</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cast votes in ELITE elections</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <StudentLogin />
              </div>
            </div>
          </div>
        </section>

        {/* 8. ABOUT ELITE */}
        <section id="about" className="py-16 sm:py-20 bg-white border-t border-neutral-200/80">
          <div className="max-w-7xl mx-auto px-6 sm:px-10">
            <AboutSidebar />
          </div>
        </section>

        {/* 9. STANDARDS & GUIDELINES */}
        <GuidelinesSection />
      </main>

      {/* 10. FOOTER */}
      <Footer />
    </div>
  );
};

const AuthWrapper: React.FC = () => {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    if (oauthToken) {
      setStudentToken(oauthToken);
      api
        .getMe()
        .then((res) => {
          const sess: StudentSession = { token: oauthToken, student: res.student };
          setSession(sess);
          localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        })
        .catch(() => {
          localStorage.removeItem(SESSION_KEY);
          setStudentToken(null);
        })
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname);
          setAuthChecking(false);
          navigate('/dashboard', { replace: true });
        });
      return;
    }

    const stored = loadSession();
    if (stored) {
      setStudentToken(stored.token);
      api
        .getMe()
        .then((res) => {
          const updated: StudentSession = { token: stored.token, student: res.student };
          setSession(updated);
          localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        })
        .catch(() => {
          setSession(stored);
        });
    }
    setAuthChecking(false);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    setStudentToken(null);
    navigate('/', { replace: true });
  }, [navigate]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage session={session} />} />
      <Route path="/students" element={<StudentDirectoryPage session={session} onLogout={handleLogout} />} />
      <Route path="/students/:rollNo" element={<PublicStudentProfilePage session={session} onLogout={handleLogout} />} />
      <Route path="/students/:rollNo/resume" element={<PublicResumeViewerPage session={session} onLogout={handleLogout} />} />

      {/* Publicly accessible Events pages when unauthenticated */}
      {!session && (
        <>
          <Route
            path="/events"
            element={
              <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-between">
                <Navbar session={session} onLogout={handleLogout} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                  <EventsPage />
                </main>
                <Footer />
              </div>
            }
          />
          <Route
            path="/events/:id"
            element={
              <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-between">
                <Navbar session={session} onLogout={handleLogout} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                  <EventDetailPage />
                </main>
                <Footer />
              </div>
            }
          />
        </>
      )}

      {/* Protected Routes */}
      <Route
        element={
          session ? (
            <StudentLayout session={session} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/portfolio/*" element={<PortfolioPage />} />
        <Route path="/intro-video" element={<VideoPage />} />
        <Route path="/video" element={<Navigate to="/intro-video" replace />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/registrations" element={<RegistrationsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/voting" element={<VotingPage />} />
        <Route path="/voting/:campaignId" element={<VotingPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthWrapper />
    </BrowserRouter>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, BrowserRouter } from 'react-router-dom';
import { StudentSession } from './types';
import { api, setStudentToken } from './services/api';

import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { StudentLogin } from './components/StudentLogin';
import { AboutSidebar } from './components/AboutSidebar';
import { GuidelinesSection } from './components/GuidelinesSection';
import { Footer } from './components/Footer';

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
      <HeroSection />
      <main id="main-content" className="max-w-7xl mx-auto px-6 sm:px-10 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-elite-black font-display leading-[1.08] mt-3">
                  YOUR SPACE.<br /><span className="text-elite-red">YOUR VIDEO.</span>
                </h2>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <StudentLogin />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-10">
          <div className="lg:col-span-8">
            <AboutSidebar />
          </div>
        </div>
      </main>
      <GuidelinesSection />
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
      <Route path="/students" element={<StudentDirectoryPage />} />
      <Route path="/students/:rollNo" element={<PublicStudentProfilePage />} />
      <Route path="/students/:rollNo/resume" element={<PublicResumeViewerPage />} />

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
        <Route path="/video" element={<VideoPage />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/registrations" element={<RegistrationsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/voting" element={<VotingPage />} />
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

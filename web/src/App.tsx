import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, BrowserRouter } from 'react-router-dom';
import { StudentSession } from './types';
import { api, setStudentToken } from './services/api';

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

import { HomePage } from './pages/public/HomePage';
import { PublicStudentProfilePage } from './pages/public/PublicStudentProfilePage';
import { PublicResumeViewerPage } from './pages/public/PublicResumeViewerPage';
import { PublicThemeProvider, StudentThemeProvider } from './context/ThemeContext';

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
      {/* Public Pages: Strictly Home and Student Details (Isolated Public Theme) */}
      <Route
        path="/"
        element={
          <PublicThemeProvider>
            <HomePage session={session} onLogout={handleLogout} />
          </PublicThemeProvider>
        }
      />
      <Route
        path="/students/:rollNo"
        element={
          <PublicThemeProvider>
            <PublicStudentProfilePage session={session} onLogout={handleLogout} />
          </PublicThemeProvider>
        }
      />
      <Route
        path="/students/:rollNo/resume"
        element={
          <PublicThemeProvider>
            <PublicResumeViewerPage session={session} onLogout={handleLogout} />
          </PublicThemeProvider>
        }
      />
      <Route path="/students" element={<Navigate to="/" replace />} />

      {/* Protected Student Portal Routes: Isolated Student Theme */}
      <Route
        element={
          session ? (
            <StudentThemeProvider>
              <StudentLayout session={session} onLogout={handleLogout} />
            </StudentThemeProvider>
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
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

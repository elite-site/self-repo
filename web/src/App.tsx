import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, BrowserRouter } from 'react-router-dom';
import { StudentSession } from './types';
import { api } from './services/api';

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
import { AnnouncementDetailPage } from './pages/AnnouncementDetailPage';

import { HomePage } from './pages/public/HomePage';
import { PublicStudentProfilePage } from './pages/public/PublicStudentProfilePage';
import { PublicResumeViewerPage } from './pages/public/PublicResumeViewerPage';
import { PublicThemeProvider, StudentThemeProvider } from './context/ThemeContext';

const AuthWrapper: React.FC = () => {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    // Capture token from Google OAuth callback redirect if passed in URL
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('student_token', tokenFromUrl);
      searchParams.delete('token');
      const cleanSearch = searchParams.toString();
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    api
      .getMe()
      .then((res) => {
        if (cancelled) return;
        setSession({ student: res.student });
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('student_token');
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem('student_token');
    setSession(null);
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
      <Route path="/login" element={<Navigate to="/" replace />} />
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
        <Route path="/announcements/:id" element={<AnnouncementDetailPage />} />
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

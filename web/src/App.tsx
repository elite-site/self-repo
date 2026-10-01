import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, BrowserRouter } from 'react-router-dom';
import { StudentSession } from './types';
import { api } from './services/api';
import { PublicThemeProvider, StudentThemeProvider } from './context/ThemeContext';
import {
  TOKEN_STORAGE_KEY,
  captureTokenFromUrl,
  classifySessionFailure,
  hasStoredToken,
  planSessionBootstrap,
} from './utils/sessionBootstrap';

// Public Pages (isolated chunk for public visitors)
const HomePage = lazy(() => import('./pages/public/HomePage'));
const StudentDirectoryPage = lazy(() => import('./pages/public/StudentDirectoryPage'));
const PublicStudentProfilePage = lazy(() => import('./pages/public/PublicStudentProfilePage'));
const PublicResumeViewerPage = lazy(() => import('./pages/public/PublicResumeViewerPage'));
const PublicEventsPage = lazy(() => import('./pages/public/PublicEventsPage'));
const PublicEventDetailPage = lazy(() => import('./pages/public/PublicEventDetailPage'));

// Protected Student Portal Layout & Pages (isolated chunk for authenticated students)
const StudentLayout = lazy(() => import('./components/layout/StudentLayout'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const VideoPage = lazy(() => import('./pages/VideoPage'));
const ResumePage = lazy(() => import('./pages/ResumePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const RegistrationsPage = lazy(() => import('./pages/RegistrationsPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const VotingPage = lazy(() => import('./pages/VotingPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AnnouncementDetailPage = lazy(() => import('./pages/AnnouncementDetailPage'));
import { BrandedLoading } from './components/BrandedLoading';

const RouteLoadingFallback: React.FC = () => (
  <BrandedLoading message="Loading ELITE Portal" />
);

const AuthWrapper: React.FC = () => {
  const [session, setSession] = useState<StudentSession | null>(null);
  // With no token there is nothing to verify, so the app is ready immediately
  // and no request is made at all. Public pages used to wait on a round trip
  // whose only possible outcome was a 401.
  const [authChecking, setAuthChecking] = useState(hasStoredToken);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const navigate = useNavigate();

  // The header avatar is rendered from the session, not from the profile the
  // edit page fetches. Without this patch a freshly uploaded photo only appeared
  // on the edit page itself and the header kept showing the previous image until
  // the student logged out and back in.
  const handlePhotoChange = useCallback((photoUrl: string | null) => {
    setSession((prev) =>
      prev ? { ...prev, student: { ...prev.student, photoUrl: photoUrl ?? undefined } } : prev,
    );
  }, []);

  const verifySession = useCallback((onSettled: () => void) => {
    api
      .getMe()
      .then((res) => setSession({ student: res.student }))
      .catch((err) => {
        const failure = classifySessionFailure(err);
        if (failure.kind === 'unauthorized') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setSession(null);
        } else {
          // A server-side failure must not masquerade as a logout. The retry
          // screen is shown instead of silently dumping the student on sign-in.
          console.error('Could not verify student session:', err);
          setSessionError(failure.message);
        }
      })
      .finally(onSettled);
  }, []);

  const retrySessionCheck = useCallback(() => {
    setSessionError(null);
    setAuthChecking(true);
    verifySession(() => setAuthChecking(false));
  }, [verifySession]);

  useEffect(() => {
    let cancelled = false;

    // Capture token from Google OAuth callback redirect if passed in URL
    const { token: tokenFromUrl, cleanUrl } = captureTokenFromUrl(window.location.search);
    if (tokenFromUrl) {
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const plan = planSessionBootstrap({
      storedToken: hasStoredToken() ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
      urlToken: tokenFromUrl,
    });

    if (!plan.needsVerification) {
      // Nothing to verify, so nothing to wait for. This is the branch that lets
      // a signed-out visitor paint a public page without a network round trip.
      setSession(null);
      setAuthChecking(false);
      return () => {
        cancelled = true;
      };
    }

    // A token exists and has not been checked yet, so the protected subtree
    // waits. Note this also covers the OAuth callback path: the token just
    // arrived and still has to be verified, which is what turns the callback
    // into a real session.
    setAuthChecking(true);
    verifySession(() => {
      if (!cancelled) setAuthChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [verifySession]);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSession(null);
    navigate('/', { replace: true });
  }, [navigate]);

  // Only the protected subtree waits on the session check. Public routes render
  // as soon as their own code is loaded, so a visitor with no token paints
  // immediately instead of watching a full-screen loader until a 401 returns.
  // A server-side failure must not masquerade as a logout: offer a retry rather
  // than silently sending the student back to the sign-in page.
  const protectedShell = () => {
    if (authChecking) {
      return <BrandedLoading message="Verifying Student Session" />;
    }
    if (sessionError && !session) {
      return (
        <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-black text-ink mb-2">Unable to verify your session</h1>
            <p className="text-sm text-ink-secondary mb-6">{sessionError}</p>
            <button
              type="button"
              onClick={retrySessionCheck}
              className="px-5 py-2.5 rounded-xl bg-status-solid-rejected text-on-primary text-sm font-bold hover:bg-brand transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    if (!session) {
      return <Navigate to="/" replace />;
    }
    return (
      <StudentThemeProvider>
        <StudentLayout
          session={session}
          onLogout={handleLogout}
          onPhotoChange={handlePhotoChange}
        />
      </StudentThemeProvider>
    );
  };

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Pages: Strictly Home, Directory, and Student Details (Isolated Public Theme) */}
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
          path="/students"
          element={
            <PublicThemeProvider>
              <StudentDirectoryPage session={session} onLogout={handleLogout} />
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

        {/* Events are readable without a login: a visitor gets the read-only
            public page, a signed-in student gets the full registration flow
            inside the portal chrome. Both live on the same path so a public event
            link resolves for everyone. The one case that still waits is a stored
            token whose session has not been verified yet, so a signed-in student
            never sees the public version flash before being redirected. */}
        <Route
          element={
            authChecking && hasStoredToken() ? (
              <BrandedLoading message="Verifying Student Session" />
            ) : session ? (
              <StudentThemeProvider>
                <StudentLayout
                  session={session}
                  onLogout={handleLogout}
                  onPhotoChange={handlePhotoChange}
                />
              </StudentThemeProvider>
            ) : (
              <PublicThemeProvider>
                <Outlet />
              </PublicThemeProvider>
            )
          }
        >
          <Route
            path="/events"
            element={
              session ? (
                <EventsPage />
              ) : (
                <PublicEventsPage session={session} onLogout={handleLogout} />
              )
            }
          />
          <Route
            path="/events/:id"
            element={
              session ? (
                <EventDetailPage />
              ) : (
                <PublicEventDetailPage session={session} onLogout={handleLogout} />
              )
            }
          />
        </Route>

        {/* Protected Student Portal Routes: Isolated Student Theme */}
        <Route element={protectedShell()}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/portfolio/*" element={<PortfolioPage />} />
          <Route path="/intro-video" element={<VideoPage />} />
          <Route path="/video" element={<Navigate to="/intro-video" replace />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/voting" element={<VotingPage />} />
          <Route path="/voting/:campaignId" element={<VotingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/announcements/:id" element={<AnnouncementDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthWrapper />
    </BrowserRouter>
  );
};

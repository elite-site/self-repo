import React, { useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, BrowserRouter } from 'react-router-dom';
import { StudentSession } from './types';
import { PublicThemeProvider, StudentThemeProvider } from './context/ThemeContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { ToastProvider } from './components/Toast';
import { hasStoredToken } from './utils/sessionBootstrap';

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

const LoginRoute: React.FC<{
  session: StudentSession | null;
  authChecking: boolean;
  sessionError: string | null;
  onRetry: () => void;
}> = ({ session, authChecking, sessionError, onRetry }) => {
  if (authChecking) {
    return <BrandedLoading message="Signing in to Student Portal" />;
  }
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }
  if (sessionError) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-black text-ink mb-2">Unable to verify your session</h1>
          <p className="text-sm text-ink-secondary mb-6">{sessionError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-status-solid-rejected text-on-primary text-sm font-bold hover:bg-brand transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  return <Navigate to="/" replace />;
};

const AuthWrapper: React.FC = () => {
  const { session, authChecking, sessionError, retrySessionCheck, logout, setPhoto } = useSession();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

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
          onPhotoChange={setPhoto}
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
            authChecking && hasStoredToken() ? (
              <BrandedLoading message="Verifying Student Session" />
            ) : (
              <PublicThemeProvider>
                <HomePage session={session} onLogout={handleLogout} />
              </PublicThemeProvider>
            )
          }
        />
        <Route
          path="/login"
          element={
            <LoginRoute
              session={session}
              authChecking={authChecking}
              sessionError={sessionError}
              onRetry={retrySessionCheck}
            />
          }
        />
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
                  onPhotoChange={setPhoto}
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
      <ToastProvider>
        <SessionProvider>
          <AuthWrapper />
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

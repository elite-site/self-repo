import React, { useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, BrowserRouter } from 'react-router-dom';
import { PublicThemeProvider, StudentThemeProvider } from './context/ThemeContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { ToastProvider } from '@/shared/ui/Toast';
import { ConfirmProvider } from '@/shared/ui/ConfirmDialog';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { hasStoredToken } from '@/shared/utils/sessionBootstrap';

// Public Pages (isolated chunk for public visitors)
const HomePage = lazy(() => import('./pages/public/HomePage'));
const StudentDirectoryPage = lazy(() => import('@/features/directory/pages/StudentDirectoryPage'));
const PublicStudentProfilePage = lazy(() => import('@/features/public-profile/pages/PublicStudentProfilePage'));
const PublicResumeViewerPage = lazy(() => import('@/features/resume/pages/PublicResumeViewerPage'));
const PublicEventsPage = lazy(() => import('@/features/events/pages/PublicEventsPage'));
const PublicEventDetailPage = lazy(() => import('@/features/events/pages/PublicEventDetailPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const SettingsPage = lazy(() => import('@/features/profile/pages/SettingsPage'));

// Protected Student Portal Layout & Pages (isolated chunk for authenticated students)
const AppLayout = lazy(() => import('@/shared/layout/AppLayout'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const EditProfilePage = lazy(() => import('@/features/profile/pages/EditProfilePage'));
const PortfolioPage = lazy(() => import('@/features/portfolio/pages/PortfolioPage'));
const GithubPage = lazy(() => import('@/features/github/pages/GithubPage'));
const VideoPage = lazy(() => import('@/features/video/pages/VideoPage'));
const ResumePage = lazy(() => import('@/features/resume/pages/ResumePage'));
const EventsPage = lazy(() => import('@/features/events/pages/EventsPage'));
const EventDetailPage = lazy(() => import('@/features/events/pages/EventDetailPage'));
const RegistrationsPage = lazy(() => import('@/features/events/pages/RegistrationsPage'));
const ResourcesPage = lazy(() => import('@/features/resources/pages/ResourcesPage'));
const TeamsPage = lazy(() => import('@/features/teams/pages/TeamsPage'));
const VotingPage = lazy(() => import('@/features/voting/pages/VotingPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const AnnouncementDetailPage = lazy(() => import('@/features/notifications/pages/AnnouncementDetailPage'));

// LearningHub Pages (gated by FEATURE_LEARNINGHUB)
const LearningHomePage = lazy(() => import('@/features/learning/pages/LearningHomePage'));
const CoursesGridPage = lazy(() => import('@/features/learning/pages/CoursesGridPage'));
const CourseDetailPage = lazy(() => import('@/features/learning/pages/CourseDetailPage'));
const LessonPlayerPage = lazy(() => import('@/features/learning/pages/LessonPlayerPage'));
const MyLearningPage = lazy(() => import('@/features/learning/pages/MyLearningPage'));

const isLearningHubEnabled = import.meta.env.VITE_FEATURE_LEARNINGHUB !== 'false';

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[100dvh] bg-surface-canvas px-4 py-8 sm:px-6 sm:py-10">
    <div className="mx-auto w-full max-w-canvas">
      <SkeletonPage label="Loading ELITE Portal" />
    </div>
  </div>
);


const AuthWrapper: React.FC = () => {
  const { session, authChecking, sessionError, retrySessionCheck, logout, setPhoto } = useSession();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  const protectedShell = () => {
    if (authChecking) {
      return <RouteLoadingFallback />;
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
        <AppLayout session={session} onLogout={handleLogout} onPhotoChange={setPhoto} />
      </StudentThemeProvider>
    );
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Pages: Strictly Home, Directory, and Student Details (Isolated Public Theme) */}
        <Route
          path="/"
          element={
            authChecking && hasStoredToken() ? (
              <RouteLoadingFallback />
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
            authChecking && hasStoredToken() ? (
              <RouteLoadingFallback />
            ) : (
              <LoginPage
                session={session}
                authChecking={authChecking}
                sessionError={sessionError}
                onRetry={retrySessionCheck}
              />
            )
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

        <Route
          element={
            authChecking && hasStoredToken() ? (
              <RouteLoadingFallback />
            ) : session ? (
              <StudentThemeProvider>
                <AppLayout session={session} onLogout={handleLogout} onPhotoChange={setPhoto} />
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
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/portfolio/*" element={<PortfolioPage />} />
          <Route path="/github" element={<GithubPage />} />
          <Route path="/intro-video" element={<VideoPage />} />
          <Route path="/video" element={<Navigate to="/intro-video" replace />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/voting" element={<VotingPage />} />
          <Route path="/voting/:campaignId" element={<VotingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/announcements/:id" element={<AnnouncementDetailPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {isLearningHubEnabled && (
            <>
              <Route path="/learning" element={<LearningHomePage />} />
              <Route path="/learning/courses" element={<CoursesGridPage />} />
              <Route path="/learning/courses/:slugOrId" element={<CourseDetailPage />} />
              <Route path="/learning/lessons/:id" element={<LessonPlayerPage />} />
              <Route path="/learning/my-learning" element={<MyLearningPage />} />
            </>
          )}
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <SessionProvider>
              <AuthWrapper />
            </SessionProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

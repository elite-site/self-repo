import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Sidebar, AdminHeader, AdminTab } from '@/shared/layout';
import { BrandedLoading, ConfirmProvider, LoginPage } from '@/shared/ui';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { AdminUser } from '@/shared/types';
import { authApi } from '@/shared/api';
import { useTheme } from './context/ThemeContext';

// Lazy Loaded Pages
const DashboardPage = React.lazy(() => import('@/features/analytics').then((m) => ({ default: m.DashboardPage })));
const StudentsPage = React.lazy(() => import('@/features/students').then((m) => ({ default: m.StudentsPage })));
const ActivityLogPage = React.lazy(() => import('@/features/activity-log').then((m) => ({ default: m.ActivityLogPage })));
const ModerationPage = React.lazy(() => import('@/features/moderation').then((m) => ({ default: m.ModerationPage })));
const AdminEventsPage = React.lazy(() => import('@/features/events').then((m) => ({ default: m.AdminEventsPage })));
const EventRegistrationsPage = React.lazy(() => import('@/features/registrations').then((m) => ({ default: m.EventRegistrationsPage })));
const VotingManagementPage = React.lazy(() => import('@/features/events').then((m) => ({ default: m.VotingManagementPage })));
const VotingResultsPage = React.lazy(() => import('@/features/events').then((m) => ({ default: m.VotingResultsPage })));
const AnnouncementsPage = React.lazy(() => import('@/features/announcements').then((m) => ({ default: m.AnnouncementsPage })));
const EmailAutomationPage = React.lazy(() => import('@/features/email-automation').then((m) => ({ default: m.EmailAutomationPage })));
const EmailHistoryPage = React.lazy(() => import('@/features/email-automation').then((m) => ({ default: m.EmailHistoryPage })));
const AnalyticsPage = React.lazy(() => import('@/features/analytics').then((m) => ({ default: m.AnalyticsPage })));
const ExportsPage = React.lazy(() => import('@/features/registrations').then((m) => ({ default: m.ExportsPage })));
const StoragePage = React.lazy(() => import('@/features/storage').then((m) => ({ default: m.StoragePage })));
const RolesPermissionsPage = React.lazy(() => import('@/features/roles').then((m) => ({ default: m.RolesPermissionsPage })));
const AuditLogsPage = React.lazy(() => import('@/features/activity-log').then((m) => ({ default: m.AuditLogsPage })));
const SettingsPage = React.lazy(() => import('@/features/settings').then((m) => ({ default: m.SettingsPage })));
const AdminGithubPage = React.lazy(() => import('@/features/github').then((m) => ({ default: m.AdminGithubPage })));
const AdminCoursesPage = React.lazy(() => import('@/features/learning').then((m) => ({ default: m.AdminCoursesPage })));
const AdminCourseEditPage = React.lazy(() => import('@/features/learning').then((m) => ({ default: m.AdminCourseEditPage })));
const AdminCourseReportsPage = React.lazy(() => import('@/features/learning').then((m) => ({ default: m.AdminCourseReportsPage })));

const PageLoadingFallback: React.FC = () => (
  <BrandedLoading message="Loading Module" fullScreen={false} />
);

// ──────────────────────────────────────────────
// Layout components
// ──────────────────────────────────────────────

interface AuthContextValue {
  user: AdminUser | null;
  authChecking: boolean;
  authError: string | null;
  completeLogin: (user: AdminUser) => void;
  logout: () => Promise<void>;
  retryAuthCheck: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setAdminUser } = useTheme();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res.authenticated && res.user) {
        setUser(res.user);
        setAdminUser(res.user);
      } else {
        setUser(null);
        setAdminUser(null);
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status === 401 || status === 403) {
        setUser(null);
        setAdminUser(null);
      } else {
        console.error('Could not verify admin session:', err);
        setAuthError(
          status
            ? `Could not reach the server (HTTP ${status}). Please retry.`
            : 'Could not reach the server. Please check your connection and retry.',
        );
      }
    } finally {
      setAuthChecking(false);
    }
  }, [setAdminUser]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const retryAuthCheck = useCallback(async () => {
    setAuthError(null);
    setAuthChecking(true);
    await checkAuth();
  }, [checkAuth]);

  const completeLogin = (newUser: AdminUser) => {
    setAuthError(null);
    setUser(newUser);
    setAdminUser(newUser);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
      setAdminUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authChecking, authError, completeLogin, logout, retryAuthCheck }}>
      {children}
    </AuthContext.Provider>
  );
};

export const ProtectedLayout: React.FC = () => {
  const { user, authChecking, authError, completeLogin, logout, retryAuthCheck } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (authChecking) {
    return <BrandedLoading message="Verifying Organizer Session" />;
  }

  if (!user) {
    if (authError) {
      return (
        <div className="min-h-[100dvh] bg-surface-canvas flex items-center justify-center p-6">
          <div className="max-w-md text-center surface p-8">
            <h1 className="text-lg font-semibold text-ink mb-2">Unable to verify your session</h1>
            <p className="text-sm text-ink-muted mb-6">{authError}</p>
            <button
              type="button"
              onClick={retryAuthCheck}
              className="btn btn-primary cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return (
      <Suspense fallback={<BrandedLoading message="Loading Login" />}>
        <LoginPage onLoginSuccess={completeLogin} />
      </Suspense>
    );
  }

  const pathTabs: AdminTab[] = [
    'dashboard', 'submissions', 'students', 'github', 'activity', 'moderation',
    'learning',
    'events', 'event-registrations', 'voting', 'voting-results',
    'communications', 'email-automation', 'email-history', 'analytics',
    'exports', 'storage', 'roles', 'audit-logs', 'settings'
  ];

  const currentPath = location.pathname.replace('/admin', '') || '/dashboard';
  const currentTab = pathTabs.find(t => currentPath === `/${t}` || currentPath === `/${t}/` || currentPath.startsWith(`/${t}/`)) || 'dashboard';

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-row w-full overflow-hidden">
      {/* 1. LEFT VERTICAL SIDEBAR (DESKTOP) */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          activeTab={currentTab}
          onSelectTab={(tab) => navigate(`/admin/${tab}`)}
          onLogout={logout}
        />
      </div>

      {/* 2. MOBILE SIDEBAR OVERLAY */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-modal bg-scrim flex">
          <div className="w-64 bg-surface h-full shadow-drawer relative border-r border-edge animate-drawer-in">
            <Sidebar
              activeTab={currentTab}
              onSelectTab={(tab) => {
                navigate(`/admin/${tab}`);
                setMobileSidebarOpen(false);
              }}
              onLogout={logout}
            />
          </div>
          <div
            className="flex-1 h-full cursor-pointer"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* 3. RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto bg-surface-canvas">
        {/* TOP HEADER BAR */}
        <AdminHeader
          user={user}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onLogout={logout}
        />

        {/* MAIN WORKSPACE VIEW */}
        <main className="flex-1 p-5 sm:p-8 max-w-canvas w-full mx-auto">
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Router creation
const RootRouterError: React.FC = () => (
  <div className="min-h-screen bg-surface-canvas flex items-center justify-center p-6 text-center">
    <div className="surface p-8 rounded-xl max-w-md w-full border border-edge">
      <h2 className="text-lg font-semibold text-ink mb-2">Something went wrong</h2>
      <p className="text-sm text-ink-muted mb-4">We were unable to load this section of the portal.</p>
      <button
        type="button"
        onClick={() => window.location.assign('/admin/dashboard')}
        className="btn btn-primary cursor-pointer text-sm"
      >
        Return to Dashboard
      </button>
    </div>
  </div>
);

const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AuthProvider><ProtectedLayout /></AuthProvider>,
    errorElement: <RootRouterError />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'submissions', element: <Navigate to="/admin/moderation" replace /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'students/:studentId', element: <StudentsPage /> },
      { path: 'github', element: <AdminGithubPage /> },
      { path: 'activity', element: <ActivityLogPage /> },
      { path: 'moderation', element: <ModerationPage /> },
      { path: 'learning', element: <AdminCoursesPage /> },
      { path: 'learning/courses/:id', element: <AdminCourseEditPage /> },
      { path: 'learning/reports/:id', element: <AdminCourseReportsPage /> },
      { path: 'events', element: <AdminEventsPage /> },
      { path: 'event-registrations', element: <EventRegistrationsPage /> },
      { path: 'voting', element: <VotingManagementPage /> },
      { path: 'voting-results', element: <VotingResultsPage /> },
      { path: 'communications', element: <AnnouncementsPage /> },
      { path: 'email-automation', element: <EmailAutomationPage /> },
      { path: 'email-history', element: <EmailHistoryPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'exports', element: <ExportsPage /> },
      { path: 'storage', element: <StoragePage /> },
      { path: 'roles', element: <RolesPermissionsPage /> },
      { path: 'audit-logs', element: <AuditLogsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/admin/dashboard" replace /> },
    ],
  },
  {
    path: '/submissions',
    element: <Navigate to="/admin/moderation" replace />,
  },
  {
    path: '/moderation',
    element: <Navigate to="/admin/moderation" replace />,
  },
  {
    path: '/',
    element: <Navigate to="/admin" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/admin" replace />,
  },
]);

export const App: React.FC = () => {
  return (
    <ErrorBoundary
      fallbackTitle="Application Error"
      fallbackMessage="An unexpected error occurred in the admin portal shell."
    >
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </ErrorBoundary>
  );
};

export default App;

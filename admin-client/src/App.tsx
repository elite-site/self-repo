import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Sidebar, AdminTab, ACTIVE_EVENT_ID } from './components/Sidebar';
import { AdminHeader } from './components/AdminHeader';
import { StatsDashboard } from './components/StatsDashboard';
import { SubmissionsTable } from './components/SubmissionsTable';
import { StudentsTable } from './components/StudentsTable';
import { SubmissionDetailModal } from './components/SubmissionDetailModal';
import { ActivityLogView } from './components/ActivityLogView';
import { LoginPage } from './components/LoginPage';
import { AdminStats, AdminUser, Submission } from './types';
import { adminApi } from './services/api';
import { useTheme } from './context/ThemeContext';
import { BrandedLoading } from './components/BrandedLoading';

// Lazy Loaded Pages
const Moderation = React.lazy(() => import('./pages/Moderation').then((m) => ({ default: m.Moderation })));
const AdminEvents = React.lazy(() => import('./pages/AdminEvents').then((m) => ({ default: m.AdminEvents })));
const EventRegistrations = React.lazy(() => import('./pages/EventRegistrations').then((m) => ({ default: m.EventRegistrations })));
const VotingManagement = React.lazy(() => import('./pages/VotingManagement').then((m) => ({ default: m.VotingManagement })));
const VotingResults = React.lazy(() => import('./pages/VotingResults').then((m) => ({ default: m.VotingResults })));
const Communications = React.lazy(() => import('./pages/Communications').then((m) => ({ default: m.Communications })));
const EmailAutomation = React.lazy(() => import('./pages/EmailAutomation').then((m) => ({ default: m.EmailAutomation })));
const EmailHistory = React.lazy(() => import('./pages/EmailHistory').then((m) => ({ default: m.EmailHistory })));
const Analytics = React.lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Exports = React.lazy(() => import('./pages/Exports').then((m) => ({ default: m.Exports })));
const Storage = React.lazy(() => import('./pages/Storage').then((m) => ({ default: m.Storage })));
const RolesPermissions = React.lazy(() => import('./pages/RolesPermissions').then((m) => ({ default: m.RolesPermissions })));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs').then((m) => ({ default: m.AuditLogs })));
const Settings = React.lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const StudentDetail = React.lazy(() => import('./pages/StudentDetail').then((m) => ({ default: m.StudentDetail })));

const PageLoadingFallback: React.FC = () => (
  <BrandedLoading message="Loading Module" fullScreen={false} />
);

// ──────────────────────────────────────────────
// Route components
// ──────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await adminApi.getStats(ACTIVE_EVENT_ID);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadStats();
  }, [user, loadStats]);

  const navigate = useNavigate();

  return (
    <StatsDashboard
      stats={stats}
      loading={loading}
      onNavigateTab={(t) => navigate(`/admin/${t}`)}
    />
  );
};

const SubmissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await adminApi.getStats(ACTIVE_EVENT_ID);
      return data;
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  }, [user]);

  return (
    <>
      <SubmissionsTable
        activeEventId={ACTIVE_EVENT_ID}
        onSelectSubmission={setSelectedSubmission}
        onRefreshStats={loadStats}
      />
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onUpdated={(updated) => {
            setSelectedSubmission(updated);
            loadStats();
          }}
          onDeleted={() => {
            setSelectedSubmission(null);
            loadStats();
          }}
        />
      )}
    </>
  );
};

const StudentsPage: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (selectedStudentId) {
    return (
      <StudentDetail
        studentId={selectedStudentId}
        onBack={() => {
          setSelectedStudentId(null);
          navigate('/admin/students');
        }}
      />
    );
  }

  return (
    <StudentsTable
      activeEventId={ACTIVE_EVENT_ID}
      onSelectStudent={(id) => {
        setSelectedStudentId(id);
        navigate(`/admin/students/${id}`);
      }}
    />
  );
};

const ActivityPage: React.FC = () => (
  <ActivityLogView activeEventId={ACTIVE_EVENT_ID} />
);

// ──────────────────────────────────────────────
// Layout components
// ──────────────────────────────────────────────

interface AuthContextValue {
  user: AdminUser | null;
  authChecking: boolean;
  authError: string | null;
  /** Called by `LoginPage` once the POST has succeeded. It hands us the user
   *  rather than re-authenticating, so the form owns its own error copy. */
  completeLogin: (user: AdminUser) => void;
  logout: () => Promise<void>;
  retryAuthCheck: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setAdminUser } = useTheme();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await adminApi.getMe();
      if (res.authenticated && res.user) {
        setUser(res.user);
        setAdminUser(res.user);
      } else {
        setUser(null);
        setAdminUser(null);
      }
    } catch (err: any) {
      const status = err?.response?.status;
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

  const completeLogin = (user: AdminUser) => {
    setAuthError(null);
    setUser(user);
    setAdminUser(user);
  };

  const logout = async () => {
    try {
      await adminApi.logout();
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

const ProtectedLayout: React.FC = () => {
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
            <h1 className="text-lg font-black text-ink mb-2">Unable to verify your session</h1>
            <p className="text-sm text-ink-muted mb-6">{authError}</p>
            <button
              type="button"
              onClick={retryAuthCheck}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <LoginPage onLoginSuccess={completeLogin} />;
  }

  // Extract tab from path: /admin/dashboard -> dashboard, /admin -> dashboard
  const pathTabs: AdminTab[] = [
    'dashboard', 'submissions', 'students', 'activity', 'moderation',
    'events', 'event-registrations', 'voting', 'voting-results',
    'communications', 'email-automation', 'email-history', 'analytics',
    'exports', 'storage', 'roles', 'audit-logs', 'settings'
  ];

  const currentPath = location.pathname.replace('/admin', '') || '/dashboard';
  const currentTab = pathTabs.find(t => currentPath === `/${t}` || currentPath === `/${t}/`) || 'dashboard';

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
          <Suspense fallback={<PageLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Router creation
// ──────────────────────────────────────────────

const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AuthProvider><ProtectedLayout /></AuthProvider>,
    errorElement: <div className="p-8 text-center text-ink-muted">Something went wrong</div>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'submissions', element: <SubmissionsPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'students/:studentId', element: <StudentsPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'moderation', element: <Moderation /> },
      { path: 'events', element: <AdminEvents /> },
      { path: 'event-registrations', element: <EventRegistrations /> },
      { path: 'voting', element: <VotingManagement /> },
      { path: 'voting-results', element: <VotingResults /> },
      { path: 'communications', element: <Communications /> },
      { path: 'email-automation', element: <EmailAutomation /> },
      { path: 'email-history', element: <EmailHistory /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'exports', element: <Exports /> },
      { path: 'storage', element: <Storage /> },
      { path: 'roles', element: <RolesPermissions /> },
      { path: 'audit-logs', element: <AuditLogs /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/admin" replace />,
  },
], {
  basename: '/admin',
});

export const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

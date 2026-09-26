import React, { useState, useEffect, useCallback } from 'react';
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

// Pages
import { Moderation } from './pages/Moderation';
import { AdminEvents } from './pages/AdminEvents';
import { EventRegistrations } from './pages/EventRegistrations';
import { VotingManagement } from './pages/VotingManagement';
import { VotingResults } from './pages/VotingResults';
import { Communications } from './pages/Communications';
import { EmailAutomation } from './pages/EmailAutomation';
import { EmailHistory } from './pages/EmailHistory';
import { Analytics } from './pages/Analytics';
import { Exports } from './pages/Exports';
import { Storage } from './pages/Storage';
import { RolesPermissions } from './pages/RolesPermissions';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const { setAdminUser } = useTheme();
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Check auth on load
  useEffect(() => {
    async function checkAuth() {
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
        // Only an explicit auth rejection means "logged out". A 500 or a network
        // blip must not discard the admin session, otherwise a transient server
        // error logs the user out and dumps them back on the login page.
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
    }
    checkAuth();
  }, [setAdminUser]);

  const retryAuthCheck = useCallback(async () => {
    setAuthError(null);
    setAuthChecking(true);
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

  // Fetch stats when user logged in
  const loadStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const data = await adminApi.getStats(ACTIVE_EVENT_ID);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
      setUser(null);
      setAdminUser(null);
    } catch (err) {
      console.error('Logout failed', err);
      setUser(null);
      setAdminUser(null);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Verifying organizer session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // A server-side failure must not masquerade as a logout — offer a retry
    // rather than silently sending the organizer back to the login page.
    if (authError) {
      return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-black text-neutral-900 dark:text-white mb-2">
              Unable to verify your session
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">{authError}</p>
            <button
              type="button"
              onClick={retryAuthCheck}
              className="px-5 py-2.5 rounded-xl bg-elite-red text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <LoginPage
        onLoginSuccess={(u) => {
          setUser(u);
          setAdminUser(u);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-neutral-950 flex flex-row w-full overflow-hidden transition-colors">
      {/* 1. LEFT VERTICAL SIDEBAR (DESKTOP) */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'dashboard') loadStats();
          }}
          user={user}
          onLogout={handleLogout}
        />
      </div>

      {/* 2. MOBILE SIDEBAR OVERLAY */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex">
          <div className="w-64 bg-white dark:bg-neutral-900 h-full shadow-2xl relative">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setMobileSidebarOpen(false);
                if (tab === 'dashboard') loadStats();
              }}
              user={user}
              onLogout={handleLogout}
            />
          </div>
          <div
            className="flex-1 h-full cursor-pointer"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* 3. RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#f8fafc] dark:bg-neutral-950 transition-colors">
        {/* TOP HEADER BAR */}
        <AdminHeader
          user={user}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onLogout={handleLogout}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />

        {/* MAIN WORKSPACE VIEW */}
        <main className="flex-1 p-5 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <StatsDashboard
              stats={stats}
              loading={statsLoading}
              onNavigateTab={(t) => setActiveTab(t)}
            />
          )}

          {activeTab === 'submissions' && (
            <SubmissionsTable
              activeEventId={ACTIVE_EVENT_ID}
              onSelectSubmission={(sub) => setSelectedSubmission(sub)}
              onRefreshStats={() => loadStats()}
            />
          )}

          {activeTab === 'students' && (
            <StudentsTable
              activeEventId={ACTIVE_EVENT_ID}
              onSelectSubmission={(sub) => setSelectedSubmission(sub)}
            />
          )}

          {activeTab === 'moderation' && <Moderation />}
          {activeTab === 'events' && <AdminEvents />}
          {activeTab === 'event-registrations' && <EventRegistrations />}
          {activeTab === 'voting' && <VotingManagement />}
          {activeTab === 'voting-results' && <VotingResults />}
          {activeTab === 'communications' && <Communications />}
          {activeTab === 'email-automation' && <EmailAutomation />}
          {activeTab === 'email-history' && <EmailHistory />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'exports' && <Exports />}
          {activeTab === 'storage' && <Storage />}
          {activeTab === 'roles' && <RolesPermissions />}
          {activeTab === 'audit-logs' && <AuditLogs />}
          {activeTab === 'activity' && <ActivityLogView activeEventId={ACTIVE_EVENT_ID} />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* 4. TRUE TOP-LAYER MODAL */}
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
    </div>
  );
};
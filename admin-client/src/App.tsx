import React, { useState, useEffect } from 'react';
import { Sidebar, AdminTab, ACTIVE_EVENT_ID } from './components/Sidebar';
import { AdminHeader } from './components/AdminHeader';
import { StatsDashboard } from './components/StatsDashboard';
import { EventHomeView } from './components/EventHomeView';
import { SubmissionsTable } from './components/SubmissionsTable';
import { SubmissionDetailModal } from './components/SubmissionDetailModal';
import { ActivityLogView } from './components/ActivityLogView';
import { LoginPage } from './components/LoginPage';
import { AdminStats, AdminUser, Submission } from './types';
import { adminApi } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
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
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

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
    } catch (err) {
      console.error('Logout failed', err);
      setUser(null);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500 font-medium">Verifying organizer session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
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

          {activeTab === 'event-home' && (
            <EventHomeView
              stats={stats}
            />
          )}

          {(activeTab === 'submissions') && (
            <SubmissionsTable
              activeEventId={ACTIVE_EVENT_ID}
              onSelectSubmission={(sub) => setSelectedSubmission(sub)}
              onRefreshStats={() => loadStats()}
            />
          )}

          {activeTab === 'activity' && <ActivityLogView activeEventId={ACTIVE_EVENT_ID} />}
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
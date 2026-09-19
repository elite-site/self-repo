import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { StudentLogin } from './components/StudentLogin';
import { StudentDashboard } from './components/StudentDashboard';
import { AboutSidebar } from './components/AboutSidebar';
import { GuidelinesSection } from './components/GuidelinesSection';
import { Footer } from './components/Footer';
import { StudentSession } from './types';
import { api, setStudentToken } from './services/api';

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

export const App: React.FC = () => {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setStudentToken(stored.token);
      // Refresh the profile (re-fetches admin review status), keep stored as fallback.
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
  }, []);

  const handleLogin = useCallback((next: StudentSession) => {
    setSession(next);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }, []);

  const handleLogout = useCallback(() => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    setStudentToken(null);
  }, []);

  const handleNavigate = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between">
      <div>
        <Navbar session={session} onLogout={handleLogout} onNavigate={handleNavigate} />

        {session ? (
          <>
            <main id="main-content" className="max-w-7xl mx-auto px-6 sm:px-10 py-8 sm:py-10">
              <StudentDashboard initialStudent={session.student} onLogout={handleLogout} />
            </main>
            <GuidelinesSection />
          </>
        ) : (
          <>
            <HeroSection />
            <main id="main-content" className="max-w-7xl mx-auto px-6 sm:px-10 py-6 sm:py-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7">
                  <p className="text-sm text-neutral-600 text-left mb-6 max-w-xl leading-relaxed">
                    Sign in with the roll number printed on your ID card. You can then upload
                    your introduction video, preview it, resubmit if you'd like, and see your
                    coordinators' response once it's been reviewed.
                  </p>
                </div>
                <div className="lg:col-span-5">
                  <StudentLogin onLogin={handleLogin} />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-10">
                <div className="lg:col-span-8">
                  <AboutSidebar />
                </div>
              </div>
            </main>
            <GuidelinesSection />
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};
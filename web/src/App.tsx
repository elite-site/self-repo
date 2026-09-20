import React, { useState, useEffect, useCallback } from 'react';
import { KeyRound, UploadCloud, MessageSquare } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col justify-between">
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                <div className="lg:col-span-7">
                  <div className="space-y-6 text-left">
                    <div>
                      <div className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-widest text-elite-red uppercase">
                        <span>Sign in to your portal</span>
                        <span className="w-6 h-[2px] bg-elite-red inline-block" />
                      </div>
                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-elite-black font-display leading-[1.08] mt-3">
                        YOUR SPACE.
                        <br />
                        <span className="text-elite-red">YOUR VIDEO.</span>
                      </h2>
                      <p className="text-sm sm:text-base text-elite-darkgray max-w-lg leading-relaxed font-normal mt-4">
                        Sign in with the roll number printed on your ID card. You can then
                        upload your introduction video, preview it, resubmit if you'd like,
                        and read your coordinators' response once it has been reviewed.
                      </p>
                    </div>

                    <div className="divide-y divide-neutral-100 border-y border-neutral-100">
                      <div className="flex items-center gap-3.5 py-3.5">
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-elite-red flex items-center justify-center shrink-0">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-elite-black uppercase tracking-wide">Sign in</div>
                          <div className="text-[11px] text-neutral-500">Use your roll number — no printed password needed.</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5 py-3.5">
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-elite-red flex items-center justify-center shrink-0">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-elite-black uppercase tracking-wide">Upload your video</div>
                          <div className="text-[11px] text-neutral-500">Preview it before sending, and resubmit any time.</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5 py-3.5">
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-elite-red flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-elite-black uppercase tracking-wide">Get your response</div>
                          <div className="text-[11px] text-neutral-500">Coordinators' feedback appears right in your portal.</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, FileText, Mail, Menu, X, LogOut, ChevronDown, ArrowRight, LayoutDashboard } from 'lucide-react';
import { StudentSession } from '../types';

interface NavbarProps {
  session?: StudentSession | null;
  onLogout?: () => void;
  onNavigate?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ session, onLogout, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/#' + sectionId);
      return;
    }
    if (onNavigate) {
      onNavigate(sectionId);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = session
    ? session.student.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('')
    : '';

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    if (onLogout) onLogout();
  };

  return (
    <nav className="w-full bg-[#0B192C] border-b border-neutral-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between h-16 sm:h-18">
        {/* LEFT: BRANDING & LOGOS */}
        <Link to="/" className="flex items-center gap-3 sm:gap-4 group">
          <div className="h-10 flex items-center gap-2">
            <img
              src="/elite-logo.png"
              alt="ELITE"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <img
              src="/sasi-logo.png"
              alt="SASI"
              className="h-8 w-auto object-contain hidden sm:block opacity-90"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="border-l border-neutral-700 pl-3 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-[#DC2626]">ELITE</span>
              <span className="text-base font-bold tracking-tight text-white">STUDENT PORTAL</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-medium tracking-wide hidden sm:block">
              Dept of Information Technology · SASI
            </div>
          </div>
        </Link>

        {/* CENTER: DESKTOP PUBLIC NAVIGATION */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 text-neutral-300 text-xs font-bold uppercase tracking-wider">
          <Link
            to="/"
            className={`flex items-center gap-1.5 hover:text-white transition-colors py-1 ${
              location.pathname === '/' ? 'text-white border-b-2 border-[#DC2626]' : ''
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          <Link
            to="/students"
            className={`flex items-center gap-1.5 hover:text-white transition-colors py-1 ${
              location.pathname.startsWith('/students') ? 'text-white border-b-2 border-[#DC2626]' : ''
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Students</span>
          </Link>

          <Link
            to="/events"
            className={`flex items-center gap-1.5 hover:text-white transition-colors py-1 ${
              location.pathname.startsWith('/events') ? 'text-white border-b-2 border-[#DC2626]' : ''
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Events</span>
          </Link>

          <button
            onClick={() => handleNavClick('about')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1"
          >
            <span>About</span>
          </button>

          <button
            onClick={() => handleNavClick('guidelines')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Guidelines</span>
          </button>

          <button
            onClick={() => handleNavClick('contact')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Contact</span>
          </button>
        </div>

        {/* RIGHT: AUTH CTA / PROFILE CHIP */}
        <div className="hidden md:flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-sm"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="relative" ref={chipRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer border border-neutral-700"
                >
                  <span className="w-7 h-7 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-xs font-extrabold">
                    {initials}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 mr-1" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-neutral-200 py-2 z-50 text-left">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <div className="text-xs font-bold text-[#0B192C] truncate">{session.student.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{session.student.rollNo}</div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 text-left cursor-pointer border-t border-neutral-100 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                const el = document.getElementById('login-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/#login-section');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="flex md:hidden items-center gap-2 text-white">
          {session && (
            <Link
              to="/dashboard"
              className="px-2.5 py-1 rounded-lg bg-[#DC2626] text-white text-xs font-bold"
            >
              Dashboard
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B192C] border-t border-neutral-800 px-6 py-4 space-y-3 text-white text-xs font-bold uppercase tracking-wider text-left shadow-2xl">
          {session && (
            <div className="flex items-center gap-3 py-2 border-b border-neutral-800 pb-3">
              <span className="w-8 h-8 rounded-full bg-[#DC2626] text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-white">{session.student.name}</div>
                <div className="text-neutral-400 font-mono normal-case text-[10px]">{session.student.rollNo}</div>
              </div>
            </div>
          )}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 py-2 text-neutral-300 hover:text-white"
          >
            <Home className="w-4 h-4 text-[#DC2626]" />
            <span>Home</span>
          </Link>
          <Link
            to="/students"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 py-2 text-neutral-300 hover:text-white"
          >
            <Users className="w-4 h-4 text-[#DC2626]" />
            <span>Students Directory</span>
          </Link>
          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 py-2 text-neutral-300 hover:text-white"
          >
            <Calendar className="w-4 h-4 text-[#DC2626]" />
            <span>Events</span>
          </Link>
          <button
            onClick={() => handleNavClick('about')}
            className="w-full flex items-center gap-3 py-2 text-left text-neutral-300 hover:text-white cursor-pointer"
          >
            <span>About</span>
          </button>
          <button
            onClick={() => handleNavClick('guidelines')}
            className="w-full flex items-center gap-3 py-2 text-left text-neutral-300 hover:text-white cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#DC2626]" />
            <span>Guidelines</span>
          </button>
          <button
            onClick={() => handleNavClick('contact')}
            className="w-full flex items-center gap-3 py-2 text-left text-neutral-300 hover:text-white cursor-pointer"
          >
            <Mail className="w-4 h-4 text-[#DC2626]" />
            <span>Contact</span>
          </button>
          {session ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 py-2 text-left text-red-400 hover:text-red-300 cursor-pointer border-t border-neutral-800 pt-3"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleNavClick('login-section');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#DC2626] text-white font-bold"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
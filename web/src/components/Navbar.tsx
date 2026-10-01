import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChevronDown, ArrowRight, LayoutDashboard, User, Users } from 'lucide-react';
import { StudentSession } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ session, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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

  const handleSignIn = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  return (
    <nav className="w-full bg-surface/95 backdrop-blur-md border-b border-edge sticky top-0 z-sticky shadow-card">
      <div className="max-w-canvas mx-auto px-4 sm:px-8 flex items-center justify-between h-16 sm:h-18">
        {/* LEFT: BRANDING & LOGOS */}
        <Link to="/" className="flex items-center gap-3 sm:gap-4 group">
          <div className="h-10 flex items-center gap-2">
            <picture className="flex items-center">
              <source srcSet="/elite-logo.webp" type="image/webp" />
              <img
                src="/elite-logo.png"
                alt="ELITE"
                width="36"
                height="36"
                decoding="async"
                className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </picture>
            <picture className="hidden sm:flex items-center">
              <source srcSet="/sasi-logo.webp" type="image/webp" />
              <img
                src="/sasi-logo.png"
                alt="SASI"
                width="180"
                height="32"
                decoding="async"
                className="h-8 w-auto object-contain opacity-90"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </picture>
          </div>
          <div className="border-l border-edge pl-3 text-left">
            <div className="flex items-center gap-1.5 font-heading">
              <span className="text-base font-extrabold tracking-tight text-brand">ELITE</span>
              <span className="text-base font-bold tracking-tight text-ink">STUDENT PORTAL</span>
            </div>
            <div className="text-[10px] text-ink-muted font-medium tracking-wide hidden sm:block">
              Dept of Information Technology · SASI
            </div>
          </div>
        </Link>

        {/* CENTER / DESKTOP NAV LINKS */}
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-ink-secondary">
          <Link
            to="/students"
            className={`transition-colors hover:text-brand flex items-center gap-1.5 ${
              location.pathname.startsWith('/students') ? 'text-brand font-bold' : ''
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Directory</span>
          </Link>
        </div>

        {/* RIGHT: AUTH CTA / PROFILE CHIP */}
        <div className="hidden md:flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="btn btn-primary text-xs gap-2"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="relative" ref={chipRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full bg-surface-sunken hover:bg-surface-sunken/80 text-ink transition-colors cursor-pointer border border-edge"
                  aria-label="Profile menu"
                >
                  <span className="w-7 h-7 rounded-full bg-brand-soft text-brand-soft-text border border-brand-soft flex items-center justify-center text-xs font-extrabold font-heading">
                    {initials}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-muted mr-1" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-surface rounded-lg shadow-modal border border-edge py-2 z-50 text-left animate-scale-in">
                    <div className="px-4 py-2 border-b border-edge">
                      <div className="text-xs font-bold text-ink font-heading truncate">{session.student.name}</div>
                      <div className="text-[10px] text-ink-muted">{session.student.rollNo}</div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-surface-sunken hover:text-brand"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-status-rejected hover:bg-status-bg-rejected text-left cursor-pointer border-t border-edge mt-1"
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
              onClick={handleSignIn}
              className="btn btn-primary text-xs"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="flex md:hidden items-center gap-2">
          {session && (
            <Link
              to="/dashboard"
              className="btn btn-primary px-2.5 py-1 text-xs"
            >
              Dashboard
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-ink-secondary hover:text-ink hover:bg-surface-sunken rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-t border-edge px-6 py-4 space-y-3 text-xs font-semibold text-left shadow-drawer animate-slide-in-up">
          {session && (
            <div className="flex items-center gap-3 py-2 border-b border-edge pb-3">
              <span className="w-8 h-8 rounded-full bg-brand-soft text-brand-soft-text border border-brand-soft flex items-center justify-center text-xs font-extrabold font-heading shrink-0">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-ink font-bold font-heading">{session.student.name}</div>
                <div className="text-ink-muted normal-case text-[10px]">{session.student.rollNo}</div>
              </div>
            </div>
          )}

          <Link
            to="/students"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 py-2 text-ink-secondary hover:text-brand min-h-[44px]"
          >
            <Users className="w-4 h-4 text-brand" />
            <span>Student Directory</span>
          </Link>

          {session ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 py-2 text-ink-secondary hover:text-brand min-h-[44px]"
              >
                <LayoutDashboard className="w-4 h-4 text-brand" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 py-2 text-ink-secondary hover:text-brand min-h-[44px]"
              >
                <User className="w-4 h-4 text-brand" />
                <span>My Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-2 text-left text-status-rejected hover:text-status-rejected cursor-pointer border-t border-edge pt-3 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignIn();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg btn btn-primary min-h-[44px]"
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

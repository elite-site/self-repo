import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChevronDown, ArrowRight, LayoutDashboard, User, Users } from 'lucide-react';
import { StudentSession } from '../types';
import { api } from '../services/api';

interface NavbarProps {
  session?: StudentSession | null;
  onLogout?: () => void;
  onNavigate?: (sectionId: string) => void;
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
    <nav className="w-full bg-white/95 backdrop-blur-md border-b border-[#E4E7F2] sticky top-0 z-40 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between h-16 sm:h-18">
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
          <div className="border-l border-[#E4E7F2] pl-3 text-left">
            <div className="flex items-center gap-1.5 font-heading">
              <span className="text-base font-extrabold tracking-tight text-[#E11D48]">ELITE</span>
              <span className="text-base font-bold tracking-tight text-[#0F172A]">STUDENT PORTAL</span>
            </div>
            <div className="text-[10px] text-[#94A3B8] font-medium tracking-wide hidden sm:block">
              Dept of Information Technology · SASI
            </div>
          </div>
        </Link>

        {/* CENTER / DESKTOP NAV LINKS */}
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#475569]">
          <Link
            to="/students"
            className={`transition-colors hover:text-[#4F46E5] flex items-center gap-1.5 ${
              location.pathname.startsWith('/students') ? 'text-[#4F46E5] font-bold' : ''
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-opacity shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="relative" ref={chipRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full bg-[#F7F8FC] hover:bg-[#EEF2FF] text-[#0F172A] transition-colors cursor-pointer border border-[#E4E7F2]"
                >
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF] flex items-center justify-center text-xs font-extrabold font-heading">
                    {initials}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] mr-1" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#E4E7F2] py-2 z-50 text-left">
                    <div className="px-4 py-2 border-b border-[#E4E7F2]">
                      <div className="text-xs font-bold text-[#0F172A] font-heading truncate">{session.student.name}</div>
                      <div className="text-[10px] text-[#94A3B8]">{session.student.rollNo}</div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-xs font-medium text-[#475569] hover:bg-[#F7F8FC] hover:text-[#4F46E5]"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#E11D48] hover:bg-rose-50 text-left cursor-pointer border-t border-[#E4E7F2] mt-1"
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-opacity shadow-xs cursor-pointer"
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
              className="px-2.5 py-1 rounded-lg bg-[#4F46E5] text-white text-xs font-bold"
            >
              Dashboard
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-[#F7F8FC] rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#E4E7F2] px-6 py-4 space-y-3 text-xs font-semibold text-left shadow-xl">
          {session && (
            <div className="flex items-center gap-3 py-2 border-b border-[#E4E7F2] pb-3">
              <span className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF] flex items-center justify-center text-xs font-extrabold font-heading shrink-0">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[#0F172A] font-bold font-heading">{session.student.name}</div>
                <div className="text-[#94A3B8] normal-case text-[10px]">{session.student.rollNo}</div>
              </div>
            </div>
          )}

          <Link
            to="/students"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 py-2 text-[#475569] hover:text-[#4F46E5]"
          >
            <Users className="w-4 h-4 text-[#4F46E5]" />
            <span>Student Directory</span>
          </Link>

          {session ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 py-2 text-[#475569] hover:text-[#4F46E5]"
              >
                <LayoutDashboard className="w-4 h-4 text-[#4F46E5]" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 py-2 text-[#475569] hover:text-[#4F46E5]"
              >
                <User className="w-4 h-4 text-[#4F46E5]" />
                <span>My Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-2 text-left text-[#E11D48] hover:text-[#BE123C] cursor-pointer border-t border-[#E4E7F2] pt-3"
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#4F46E5] text-white font-bold cursor-pointer"
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
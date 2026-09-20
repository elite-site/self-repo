import React, { useState, useRef, useEffect } from 'react';
import { Home, Users, FileText, Mail, Menu, X, LogOut, UserRound, ChevronDown } from 'lucide-react';
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

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(id);
    } else {
      const element = document.getElementById(id);
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
    <nav className="w-full bg-elite-red sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-stretch justify-between">
        {/* LEFT: WHITE BRAND CARD */}
        <div className="bg-white px-5 sm:px-7 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 rounded-br-2xl shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-elite-red rounded-xl flex items-center justify-center font-bold shrink-0">
            <UserRound className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="leading-tight text-left">
            <div className="text-sm sm:text-base font-extrabold tracking-tight font-display">
              <span className="text-elite-red">IT-Associations </span>
              <span className="text-elite-black">SELF-INTRODUCTION</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-elite-muted uppercase tracking-wider">
              Department of Information Technology
            </div>
          </div>
        </div>

        {/* RIGHT: DESKTOP NAVIGATION LINKS + PROFILE CHIP */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 px-6 lg:px-8 text-white text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => handleNavClick('hero')}
            className="flex items-center gap-2 hover:text-red-200 transition-colors cursor-pointer py-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>HOME</span>
          </button>

          <button
            onClick={() => handleNavClick('about')}
            className="flex items-center gap-2 hover:text-red-200 transition-colors cursor-pointer py-1"
          >
            <Users className="w-3.5 h-3.5" />
            <span>ABOUT</span>
          </button>

          <button
            onClick={() => handleNavClick('guidelines')}
            className="flex items-center gap-2 hover:text-red-200 transition-colors cursor-pointer py-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>GUIDELINES</span>
          </button>

          <button
            onClick={() => handleNavClick('contact')}
            className="flex items-center gap-2 hover:text-red-200 transition-colors cursor-pointer py-1"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>CONTACT</span>
          </button>

          {/* PROFILE CHIP (corner) */}
          {session && (
            <div className="relative" ref={chipRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                onKeyDown={(e) => { if (e.key === 'Escape') setProfileOpen(false); }}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white hover:bg-red-50 border border-white/60 transition-colors cursor-pointer"
              >
                <span className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center text-xs font-extrabold font-display shrink-0">
                  {initials}
                </span>
                <span className="max-w-[90px] truncate text-elite-red">{session.student.name.split(' ')[0]}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-elite-red transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 space-y-3 z-50 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-elite-red text-white flex items-center justify-center font-extrabold font-display shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-elite-black font-display truncate">
                        {session.student.name}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {session.student.rollNo}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {session.student.branch}-{session.student.section} • Year {session.student.year}
                  </div>
                  <div className="pt-2 border-t border-neutral-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-elite-red text-xs font-bold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="flex md:hidden items-center px-4 text-white relative">
          {session ? (
            <div className="relative mr-2" ref={chipRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                onKeyDown={(e) => { if (e.key === 'Escape') setProfileOpen(false); }}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="w-9 h-9 rounded-full bg-white text-elite-red flex items-center justify-center text-xs font-extrabold font-display cursor-pointer"
              >
                {initials}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 space-y-3 z-50 text-left">
                  <div className="text-sm font-extrabold text-elite-black font-display truncate">
                    {session.student.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {session.student.rollNo} • {session.student.branch}-{session.student.section}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-elite-red text-xs font-bold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:bg-elite-darkred rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-elite-darkred border-t border-red-800 px-6 py-4 space-y-3 text-white text-xs font-bold uppercase tracking-wider text-left">
          {session && (
            <div className="flex items-center gap-3 py-2 border-b border-red-800/60 pb-3">
              <span className="w-8 h-8 rounded-full bg-white text-elite-red flex items-center justify-center text-xs font-extrabold font-display shrink-0">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="truncate">{session.student.name}</div>
                <div className="text-red-200 font-mono normal-case text-[10px]">{session.student.rollNo}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => handleNavClick('hero')}
            className="w-full flex items-center gap-3 py-2 text-left hover:text-red-200 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>HOME</span>
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="w-full flex items-center gap-3 py-2 text-left hover:text-red-200 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>ABOUT</span>
          </button>
          <button
            onClick={() => handleNavClick('guidelines')}
            className="w-full flex items-center gap-3 py-2 text-left hover:text-red-200 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>GUIDELINES</span>
          </button>
          <button
            onClick={() => handleNavClick('contact')}
            className="w-full flex items-center gap-3 py-2 text-left hover:text-red-200 cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>CONTACT</span>
          </button>
          {session && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 py-2 text-left text-red-200 hover:text-white cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>LOGOUT</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
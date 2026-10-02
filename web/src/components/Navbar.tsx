import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChevronDown, ArrowRight, LayoutDashboard, Search } from 'lucide-react';
import { StudentSession } from '../types';
import { api, resolveMediaUrl } from '../services/api';
import { getPhotoStyle } from '../utils/photoStyle';
import { prefetchRoute } from '../utils/prefetch';

interface NavbarProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

/**
 * The public header. Three links, one search entry point and one sign-in
 * action — the old bar carried a second brand block (the SASI logo repeated
 * the institution name next to "ELITE STUDENT PORTAL") and a single nav item,
 * so the two thirds of it that mattered were pushed to the edges.
 */
export const Navbar: React.FC<NavbarProps> = ({ session, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navLinks = [
    { label: 'Students', to: '/students' },
    { label: 'Events', to: '/events' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigating with the drawer open left it hanging over the new page, and the
  // page behind it kept scrolling under the visitor's finger.
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

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
    <header className="sticky top-0 z-sticky w-full border-b border-edge bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-canvas items-center gap-3 px-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="ELITE home">
          <picture className="flex items-center">
            <source srcSet="/elite-logo.webp" type="image/webp" />
            <img
              src="/elite-logo.png"
              alt=""
              width="32"
              height="32"
              decoding="async"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </picture>
          <span className="font-heading text-label-lg font-extrabold tracking-tight text-brand">
            ELITE
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Public sections">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onMouseEnter={() => prefetchRoute(link.to)}
              aria-current={isActive(link.to) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-label-lg transition-colors duration-fast ${
                isActive(link.to)
                  ? 'bg-surface-sunken font-semibold text-ink'
                  : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/students"
            onMouseEnter={() => prefetchRoute('/students')}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-fast hover:bg-surface-sunken hover:text-ink"
            aria-label="Search students"
          >
            <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          </Link>

          {session ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/dashboard" onMouseEnter={() => prefetchRoute('/dashboard')} className="btn btn-primary">
                <LayoutDashboard size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>Dashboard</span>
              </Link>

              <div className="relative" ref={chipRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-edge p-1 transition-colors duration-fast hover:bg-surface-sunken"
                  aria-label="Your account"
                  aria-expanded={profileOpen}
                >
                  {session.student.photoUrl ? (
                    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-edge bg-surface">
                      <img
                        src={resolveMediaUrl(session.student.photoUrl)}
                        alt=""
                        style={getPhotoStyle(session.student)}
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft font-heading text-label-md font-bold text-brand-soft-text">
                      {initials}
                    </span>
                  )}
                  <ChevronDown size={14} strokeWidth={2} className="mr-1 text-ink-muted" aria-hidden="true" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-edge bg-surface py-1.5 shadow-modal animate-scale-in">
                    <div className="border-b border-edge px-4 py-2">
                      <p className="truncate font-heading text-label-lg font-semibold text-ink">
                        {session.student.name}
                      </p>
                      <p className="text-label-md text-ink-muted">{session.student.rollNo}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-label-lg text-ink-secondary hover:bg-surface-sunken hover:text-ink"
                    >
                      Go to dashboard
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-label-lg text-ink-secondary hover:bg-surface-sunken hover:text-ink"
                    >
                      My profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full cursor-pointer items-center gap-2 border-t border-edge px-4 py-2 text-label-lg font-semibold text-status-rejected hover:bg-status-bg-rejected"
                    >
                      <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="btn btn-primary hidden md:inline-flex"
            >
              <span>Student Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-ink-secondary transition-colors duration-fast hover:bg-surface-sunken hover:text-ink md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="space-y-1 border-t border-edge bg-surface px-4 py-4 md:hidden">
          {session && (
            <div className="mb-3 flex items-center gap-3 border-b border-edge pb-3">
              {session.student.photoUrl ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge bg-surface">
                  <img
                    src={resolveMediaUrl(session.student.photoUrl)}
                    alt=""
                    style={getPhotoStyle(session.student)}
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-heading text-label-md font-bold text-brand-soft-text">
                  {initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-heading text-label-lg font-semibold text-ink">
                  {session.student.name}
                </p>
                <p className="text-label-md text-ink-muted">{session.student.rollNo}</p>
              </div>
            </div>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-label-lg text-ink-secondary hover:bg-surface-sunken hover:text-ink"
            >
              {link.label}
            </Link>
          ))}

          {session ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-label-lg text-ink-secondary hover:bg-surface-sunken hover:text-ink"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-label-lg font-semibold text-status-rejected"
              >
                <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignIn();
              }}
              className="btn btn-primary mt-2 w-full"
            >
              <span>Student Sign In</span>
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;

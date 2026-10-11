import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer, Share2, FileText, Menu, X } from 'lucide-react';

export interface NavLinkItem {
  id: string;
  label: string;
}

export const NAV_LINKS: NavLinkItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'contact', label: 'Contact' },
];

interface PublicProfileNavbarProps {
  name: string;
  initials: string;
  activeSection: string;
  hasResume: boolean;
  resumeDownloadHref: string | null;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onShare: () => void;
}

export const PublicProfileNavbar: React.FC<PublicProfileNavbarProps> = ({
  name,
  initials,
  activeSection,
  hasResume,
  resumeDownloadHref,
  mobileMenuOpen,
  setMobileMenuOpen,
  onShare,
}) => {
  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#070B16]/80 border-b border-slate-800/80 print:hidden">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Directory Link + Personal Logo Mark */}
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="group inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-2 px-2.5 rounded-lg hover:bg-slate-800/60"
            title="Return to Student Directory"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Directory</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <a href="#home" className="flex items-center gap-2.5 min-h-[44px]">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-rose-500 to-pink-500 font-heading text-xs font-black text-white shadow-sm">
              {initials}
            </span>
            <span className="font-heading text-sm font-bold text-white tracking-tight hidden md:inline">
              {name}
            </span>
          </a>
        </div>

        {/* Center: Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1 rounded-full border border-slate-800/80 bg-slate-900/60 p-1 backdrop-blur-md">
          {NAV_LINKS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[44px] items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-800/80 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Save PDF / Print"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Save PDF</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            className="inline-flex min-h-[44px] items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg border border-slate-800/80 bg-slate-900/60 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Share portfolio"
          >
            <Share2 size={15} />
            <span className="hidden sm:inline">Share</span>
          </button>

          {hasResume && resumeDownloadHref && (
            <a
              href={resumeDownloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:from-rose-600 hover:to-pink-600 transition-all"
            >
              <FileText size={14} />
              <span>Resume</span>
            </a>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div id="mobile-nav-menu" className="lg:hidden border-b border-slate-800 bg-[#070B16]/95 backdrop-blur-xl px-4 py-4 space-y-1">
          {NAV_LINKS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setMobileMenuOpen(false)}
              className={`min-h-[44px] flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeSection === item.id
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </a>
          ))}
          {hasResume && resumeDownloadHref && (
            <div className="pt-2 border-t border-slate-800/80">
              <a
                href={resumeDownloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-xs font-semibold text-white"
              >
                <FileText size={15} />
                <span>Download Resume PDF</span>
              </a>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

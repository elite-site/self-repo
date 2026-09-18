import React, { useState } from 'react';
import { Home, Users, FileText, Mail, Menu, X, UserRound } from 'lucide-react';

interface NavbarProps {
  onNavigate?: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <span className="text-elite-red">ELITE </span>
              <span className="text-elite-black">SELF-INTRO CLUB</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-elite-muted uppercase tracking-wider">
              DEPT. OF INFORMATION TECHNOLOGY (IT)
            </div>
          </div>
        </div>

        {/* RIGHT: DESKTOP NAVIGATION LINKS */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 px-6 lg:px-8 text-white text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => handleNavClick('hero')}
            className="flex items-center gap-2 hover:text-red-200 transition-colors cursor-pointer py-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>HOME</span>
          </button>

          <button
            onClick={() => handleNavClick('about-club')}
            className="flex items-center gap-2 hover:text-red-200 transition-colors cursor-pointer py-1"
          >
            <Users className="w-3.5 h-3.5" />
            <span>ABOUT SELF-INTRO</span>
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
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="flex md:hidden items-center px-4 text-white">
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
          <button
            onClick={() => handleNavClick('hero')}
            className="w-full flex items-center gap-3 py-2 text-left hover:text-red-200 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>HOME</span>
          </button>
          <button
            onClick={() => handleNavClick('about-club')}
            className="w-full flex items-center gap-3 py-2 text-left hover:text-red-200 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>ABOUT SELF-INTRO</span>
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
        </div>
      )}
    </nav>
  );
};

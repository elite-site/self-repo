import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Globe, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer id="contact" className="bg-[#0B192C] text-white pt-14 pb-8 px-6 sm:px-10 border-t border-slate-800 text-left">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
        {/* BRAND COLUMN */}
        <div className="md:col-span-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 flex items-center gap-2">
              <img
                src="/elite-logo.png"
                alt="ELITE"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <img
                src="/sasi-logo.png"
                alt="SASI"
                className="h-7 w-auto object-contain opacity-90"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="border-l border-slate-700 pl-3">
              <div className="text-base font-extrabold font-display tracking-tight text-white flex items-center gap-1.5">
                <span className="text-elite-red font-black">ELITE</span>
                <span>STUDENT PORTAL</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Department of Information Technology · SASI
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 max-w-md leading-relaxed font-normal">
            The official digital platform for IT students at SASI Institute of Technology & Engineering — uniting verified profiles, engineering portfolios, achievements, event registrations, and department voting.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Institutional Portal</span>
          </div>
        </div>

        {/* QUICK NAVIGATION */}
        <div className="md:col-span-3 space-y-3 text-xs text-slate-300">
          <div className="font-extrabold uppercase tracking-wider text-white font-display">Navigation</div>
          <ul className="space-y-2 font-medium">
            <li>
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            <li>
              <Link to="/students" className="hover:text-white transition-colors">Student Directory</Link>
            </li>
            <li>
              <button onClick={() => scrollTo('events-section')} className="hover:text-white transition-colors cursor-pointer text-left">
                Department Events
              </button>
            </li>
            <li>
              <button onClick={() => scrollTo('about')} className="hover:text-white transition-colors cursor-pointer text-left">
                About ELITE
              </button>
            </li>
            <li>
              <button onClick={() => scrollTo('guidelines')} className="hover:text-white transition-colors cursor-pointer text-left">
                Portal Guidelines
              </button>
            </li>
          </ul>
        </div>

        {/* LOCATION & CONTACT */}
        <div className="md:col-span-3 space-y-3 text-xs text-slate-300">
          <div className="font-extrabold uppercase tracking-wider text-white font-display">Campus Location & Contact</div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-elite-red shrink-0 mt-0.5" />
              <span>SASI Institute of Technology & Engineering, Tadepalligudem, Andhra Pradesh</span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-elite-red shrink-0" />
              <span>elite.it@sasi.ac.in</span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <Globe className="w-4 h-4 text-elite-red shrink-0" />
              <span>sasi.ac.in</span>
            </div>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 font-mono">
        <div>© 2026 ELITE Student Portal — Department of Information Technology</div>
        <div>SASI Institute of Technology & Engineering</div>
      </div>
    </footer>
  );
};

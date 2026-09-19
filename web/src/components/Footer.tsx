import React from 'react';
import { UserRound, MapPin, Mail, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="contact" className="bg-elite-black text-white pt-12 pb-8 px-6 sm:px-10 mt-16 text-left border-t border-neutral-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-neutral-800">
        {/* BRAND COLUMN */}
        <div className="md:col-span-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-elite-red text-white flex items-center justify-center font-bold">
              <UserRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold font-display tracking-tight text-white">
                IT-Associations SELF INTRODUCTION
              </div>
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Department of Information Technology
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            The self-introduction initiative of the Department of Information Technology
            — encouraging clear, natural communication. No scripts. No rehearsed lines. Just you.
          </p>
        </div>

        {/* LOCATION & CONTACT */}
        <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-neutral-300">
          <div className="space-y-2">
            <div className="font-extrabold uppercase tracking-wider text-white font-display">Campus Location</div>
            <div className="flex items-start gap-2 text-neutral-400">
              <MapPin className="w-4 h-4 text-elite-red shrink-0 mt-0.5" />
              <span>SASI Institute of Technology & Engineering, Tadepalligudem, AP</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-extrabold uppercase tracking-wider text-white font-display">Contact & Support</div>
            <div className="flex items-center gap-2 text-neutral-400">
              <Mail className="w-4 h-4 text-elite-red shrink-0" />
              <span>itassociations@sasi.ac.in</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <Globe className="w-4 h-4 text-elite-red shrink-0" />
              <span>sasi.ac.in</span>
            </div>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 gap-2 font-mono">
        <div>© 2026 IT-Associations Self Introduction — Department of Information Technology</div>
        <div>Engineered for SASI Institute of Technology & Engineering</div>
      </div>
    </footer>
  );
};

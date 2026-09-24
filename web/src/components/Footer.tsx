import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B192C] text-white py-10 px-6 sm:px-10 border-t border-slate-800 text-center">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-base font-black tracking-tight text-[#DC2626]">ELITE</span>
          <span className="text-base font-bold tracking-tight text-white">STUDENT PORTAL</span>
        </div>
        <p className="text-xs text-slate-400">
          Department of Information Technology · SASI Institute of Technology & Engineering (Autonomous)
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Official Institutional Portal</span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono pt-2">
          © {new Date().getFullYear()} SASI IT. Authorized student and institutional access only.
        </p>
      </div>
    </footer>
  );
};

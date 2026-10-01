import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-inverse text-ink-inverse py-10 px-6 sm:px-10 border-t border-edge-inverse text-center">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-base font-black tracking-tight text-brand">ELITE</span>
          <span className="text-base font-bold tracking-tight text-ink-inverse">STUDENT PORTAL</span>
        </div>
        <p className="text-xs text-ink-muted">
          Department of Information Technology · SASI Institute of Technology & Engineering (Autonomous)
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-sunken border border-border text-ink-secondary text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-status-approved" />
          <span>Official Institutional Portal</span>
        </div>
        <p className="text-[11px] text-ink-muted font-mono pt-2">
          © {new Date().getFullYear()} SASI IT. Authorized student and institutional access only.
        </p>
      </div>
    </footer>
  );
};

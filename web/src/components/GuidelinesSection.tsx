import React from 'react';
import { ShieldCheck, Video, FileCheck, CheckCircle2 } from 'lucide-react';

export const GuidelinesSection: React.FC = () => {
  return (
    <section id="guidelines" aria-labelledby="guidelines-title" className="py-16 sm:py-20 bg-white border-t border-neutral-200/80 text-left">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>STANDARDS & POLICIES</span>
          </div>
          <h2 id="guidelines-title" className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight">
            Portal Guidelines & Student Standards
          </h2>
          <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
            Key policies governing verified student profiles, portfolio reviews, video introductions, and department activities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-elite-black">
              <ShieldCheck className="w-4 h-4 text-elite-red" />
              <span>Profile Authenticity</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              All profile information, project repositories, and technical skills must represent your genuine work and official college enrollment.
            </p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-elite-black">
              <Video className="w-4 h-4 text-elite-red" />
              <span>Intro Video Standards</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Introduction clips should run 60–90 seconds in MP4/WEBM format (max 25MB). Speak naturally with clear audio and good lighting.
            </p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-elite-black">
              <FileCheck className="w-4 h-4 text-elite-red" />
              <span>Verification Audit</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Achievements, certificates, and resumes undergo review by department coordinators before public directory endorsement.
            </p>
          </div>

          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Code of Conduct</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Respectful collaboration in event teams, fair voting conduct, and adherence to SASI IT institutional ethics are required at all times.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

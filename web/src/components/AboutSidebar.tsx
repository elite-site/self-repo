import React from 'react';
import { ShieldCheck, Award, Users, CheckCircle2 } from 'lucide-react';

export const AboutSidebar: React.FC = () => {
  return (
    <aside id="about" className="space-y-6 text-left">
      {/* CARD 1: ABOUT ELITE STUDENT PORTAL */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-elite-black font-display tracking-tight">
              About ELITE Student Portal
            </h3>
            <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">
              Department of Information Technology · SASI
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          ELITE is the student association of the Department of Information
          Technology at SASI Institute of Technology & Engineering. The portal serves as a unified digital platform where students document their technical growth, showcase projects, and engage in co-curricular events.
        </p>

        <div className="space-y-2.5 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-elite-black">
            <CheckCircle2 className="w-4 h-4 text-elite-red shrink-0" />
            <span>Verified Academic & Department Roster Identity</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-elite-black">
            <Award className="w-4 h-4 text-elite-red shrink-0" />
            <span>Faculty-Endorsed Achievements & Projects</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-elite-black">
            <Users className="w-4 h-4 text-elite-red shrink-0" />
            <span>Collaborative Event Teams & Democratic Voting</span>
          </div>
        </div>
      </div>

      {/* CARD 2: PORTAL PILLARS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg border border-slate-800">
        <h3 className="text-base font-extrabold font-display tracking-tight text-white uppercase border-b border-slate-800 pb-3">
          Department Digital Platform
        </h3>
        <ul className="space-y-3 text-xs text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Centralized profile for campus placements & reviews</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Direct verification of certificates, projects, and resumes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Real-time notifications for ELITE hackathons & competitions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Transparent student leadership elections & feedback</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};
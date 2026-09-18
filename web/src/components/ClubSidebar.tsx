import React from 'react';
import { Award, UserRound, Sparkles, Sun } from 'lucide-react';

export const ClubSidebar: React.FC = () => {
  return (
    <aside id="about-club" className="space-y-6 text-left">
      {/* CARD 1: ABOUT ELITE SELF INTRODUCTION */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
            <UserRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-elite-black font-display tracking-tight">
              About ELITE Self Introduction
            </h3>
            <p className="text-[11px] text-neutral-500 font-semibold uppercase">
              Dept. of IT
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          ELITE Self Introduction Club is the official communication & presence building wing of the Information Technology Department. We organize mock interview rounds, personal branding sessions, and represent SASI at state & inter-college events.
        </p>

        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-elite-black">
            <Sparkles className="w-4 h-4 text-elite-red" />
            <span>Confident Personal Introductions</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-elite-black">
            <Award className="w-4 h-4 text-elite-red" />
            <span>Inter-College Fest Showcases</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-elite-black">
            <Sun className="w-4 h-4 text-elite-red" />
            <span>Mock Interviews & Stage Presence</span>
          </div>
        </div>
      </div>

      {/* CARD 2: WHAT WE LOOK FOR */}
      <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg border border-neutral-800">
        <h3 className="text-base font-extrabold font-display tracking-tight text-white uppercase border-b border-neutral-800 pb-3">
          What We Look For
        </h3>
        <ul className="space-y-3 text-xs text-neutral-300">
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Clarity of Speech & Communication</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Confidence During Self Introduction</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Enthusiasm & Positive Presence</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Willingness to Engage in Campus Activities</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};

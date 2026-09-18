import React from 'react';
import { UserRound, Sparkles, Users, Award } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section id="hero" className="max-w-7xl mx-auto px-6 sm:px-10 pt-10 sm:pt-14 pb-8 sm:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* LEFT COLUMN: HEADLINE & HIGHLIGHTS */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-widest text-elite-red uppercase">
            <span>SELF-INTRODUCTION AUDITIONS 2026</span>
            <span className="w-6 h-[2px] bg-elite-red inline-block" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-elite-black font-display leading-[1.08]">
            INTRODUCE.<br />
            <span className="text-elite-red">CONNECT.</span><br />
            BE <span className="text-elite-red">ELITE.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-elite-darkgray max-w-lg leading-relaxed font-normal">
            Tell us who you are. Join <strong className="text-elite-red font-semibold">ELITE Self Introduction Club</strong>. Submit your introduction video and let the panel meet the real you.
          </p>

          {/* 4 HORIZONTAL HIGHLIGHTS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <UserRound className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                Your Story
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Record 1 intro video
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                Confidence
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Showcase personality, passion & clarity
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                First Impressions
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Introduce your background & ambitions
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                Be ELITE
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Represent SASI IT at inter-college fests
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SELF-INTRODUCTION CARD */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="w-full max-w-sm sm:max-w-md mx-auto bg-gradient-to-br from-neutral-900 to-black text-white p-8 rounded-3xl shadow-2xl space-y-6 text-left border border-neutral-800">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-elite-red/20 text-red-400 border border-red-500/30 text-xs font-bold font-mono tracking-wider">
              <span>ELITE INTRO ENSEMBLE</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
              First Impressions Matter. Make Yours Count.
            </h3>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              From confident openings to memorable closings, ELITE Self Introduction helps you master communication, presence, and personal branding on campus.
            </p>

            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>AUDITIONS 2026</span>
              <span className="text-white font-bold">DEPT. OF IT</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

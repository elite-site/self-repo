import React from 'react';
import { UserRound, Sparkles, Users, Fingerprint } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section id="hero" aria-labelledby="hero-title" className="max-w-7xl mx-auto px-6 sm:px-10 pt-10 sm:pt-14 pb-8 sm:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* LEFT COLUMN: HEADLINE & HIGHLIGHTS */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Eyebrow */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-widest text-elite-red uppercase">
              <span>IT-ASSOCIATIONS • SELF-INTRODUCTION 2026</span>
              <span className="w-6 h-[2px] bg-elite-red inline-block" />
            </div>
            <div className="mt-1.5 text-[10px] sm:text-[11px] font-semibold text-elite-muted uppercase tracking-wider">
              Department of Information Technology
            </div>
          </div>

          {/* Main Headline */}
          <h1 id="hero-title" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-elite-black font-display leading-[1.08]">
            INTRODUCE YOURSELF.<br />
            <span className="text-elite-red">AS YOURSELF.</span>
          </h1>

          {/* Pillars */}
          <div className="text-xs font-mono font-bold tracking-[0.18em] text-elite-red uppercase">
            IDENTITY · PERSONALITY · CONFIDENCE · AUTHENTICITY
          </div>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-elite-darkgray max-w-lg leading-relaxed font-normal">
            Record a short video introduction and tell us who you are — your name,
            your interests, the personality behind it. There is no fixed script.
            Just you, speaking naturally.
          </p>

          {/* Approach */}
          <div className="border-l-2 border-elite-red pl-3 text-[11px] sm:text-xs text-elite-muted leading-relaxed">
            Do not use a rehearsed or AI-generated introduction. Talk the way you
            normally do — normal pauses, genuine reactions, and all.
          </div>

          {/* 4 HORIZONTAL HIGHLIGHTS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <UserRound className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                Who You Are
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Introduce yourself, simply
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                Your Voice
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Speak in your own words
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                Your Personality
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Let it come through naturally
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-red-50 text-elite-red flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-elite-black uppercase tracking-tight">
                Your Identity
              </div>
              <div className="text-[11px] text-neutral-500 leading-snug">
                Be yourself, on camera
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SELF-INTRODUCTION CARD */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="w-full max-w-sm sm:max-w-md mx-auto bg-gradient-to-br from-neutral-900 to-black text-white p-8 rounded-3xl shadow-2xl space-y-6 text-left border border-neutral-800">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-elite-red/20 text-red-400 border border-red-500/30 text-xs font-bold font-mono tracking-wider">
              <span>IT-ASSOCIATIONS • SELF INTRODUCTION</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display leading-[1.15]">
              A Personal Self-Introduction.
              <br />
              Not a Performance.
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              A short video from the Department of Information Technology. Introduce
              yourself, share what matters to you, and let who you are come through.
            </p>

            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>2026 EDITION</span>
              <span className="text-white font-bold">DEPT. OF IT</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
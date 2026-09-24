import React from 'react';
import { Video, Clock, Mic, Sparkles, ArrowRight } from 'lucide-react';

export const IntroVideoFeatureSection: React.FC = () => {
  const scrollToLogin = () => {
    const el = document.getElementById('login-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="intro-video" aria-labelledby="intro-video-title" className="py-16 sm:py-20 bg-white border-t border-neutral-200/80 text-left">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Context & Overview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
                <Video className="w-3.5 h-3.5" />
                <span>PORTAL CAPABILITY</span>
              </div>
              <h2 id="intro-video-title" className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight leading-tight">
                INTRODUCTION VIDEO
              </h2>
              <p className="text-base sm:text-lg text-elite-black font-semibold">
                A brief 60–90 second self-introduction video to accompany your student profile and portfolio.
              </p>
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Let who you are complement what you build. A short, natural video provides recruiters, faculty, and fellow students a glimpse into your personality, communication style, and engineering enthusiasm.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-elite-black">
                  <Clock className="w-4 h-4 text-elite-red" />
                  <span>60–90 Seconds</span>
                </div>
                <p className="text-xs text-neutral-500 leading-snug">
                  Concise, focused, and respectful of viewer time.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-elite-black">
                  <Mic className="w-4 h-4 text-elite-red" />
                  <span>Your Voice</span>
                </div>
                <p className="text-xs text-neutral-500 leading-snug">
                  Authentic communication without memorized scripts.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-elite-black">
                  <Sparkles className="w-4 h-4 text-elite-red" />
                  <span>Profile Sync</span>
                </div>
                <p className="text-xs text-neutral-500 leading-snug">
                  Directly linked to your verified student portal profile.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={scrollToLogin}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-elite-red hover:bg-[#B5121B] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <span>Student Sign In to Upload Video</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Visual Video Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 text-white space-y-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-elite-red" />
                  <span>VIDEO COMPONENT</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  PORTAL FEATURE
                </span>
              </div>

              {/* Video Player Placeholder Graphic */}
              <div className="aspect-video w-full rounded-2xl bg-slate-800 border border-slate-700/60 flex flex-col items-center justify-center p-6 text-center space-y-3 relative group">
                <div className="w-14 h-14 rounded-full bg-elite-red/20 border border-elite-red/40 text-elite-red flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Video className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200">
                    Self-Introduction Clip (60–90s)
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    MP4 / MOV / WEBM · Max 25MB
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                One introduction video per student. Replace or review anytime from your authenticated dashboard.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, ShieldCheck, Code, Calendar, Award, UserCheck, Sparkles } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const scrollToLogin = () => {
    const el = document.getElementById('login-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" aria-labelledby="hero-title" className="max-w-7xl mx-auto px-6 sm:px-10 pt-10 sm:pt-14 pb-12 sm:pb-16 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* LEFT COLUMN: PRODUCT HEADLINE & ACTIONS */}
        <div className="lg:col-span-7 space-y-6">
          {/* Eyebrow */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/60 text-xs font-bold font-mono tracking-widest text-elite-red uppercase">
              <span className="w-2 h-2 rounded-full bg-elite-red animate-pulse" />
              <span>ELITE · STUDENT PORTAL</span>
            </div>
            <div className="mt-2 text-xs sm:text-sm font-semibold text-elite-muted tracking-wide">
              Department of Information Technology · SASI
            </div>
          </div>

          {/* Main Headline */}
          <h1 id="hero-title" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-elite-black font-display leading-[1.08]">
            YOUR PROFILE.<br />
            YOUR WORK.<br />
            <span className="text-elite-red">YOUR JOURNEY.</span>
          </h1>

          {/* Secondary Headline / Highlighted Line */}
          <div className="text-base sm:text-lg font-bold text-elite-black font-display border-l-3 border-elite-red pl-3 leading-snug">
            One place to showcase what you build, achieve, and participate in.
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-neutral-600 max-w-xl leading-relaxed font-normal">
            Create your verified IT student profile, showcase projects and achievements, manage your resume, participate in ELITE events, and take part in department activities.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={scrollToLogin}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-elite-red hover:bg-[#B5121B] text-white font-bold text-sm tracking-wide shadow-md shadow-red-900/10 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              to="/students"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-bold text-sm tracking-wide shadow-sm hover:border-neutral-400 transition-all"
            >
              <Users className="w-4 h-4 text-elite-red" />
              <span>Explore Students</span>
            </Link>
          </div>

          {/* Mini Trust Metrics / Badges */}
          <div className="pt-4 border-t border-neutral-200/80 flex flex-wrap items-center gap-6 text-xs text-neutral-500 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Department Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-elite-red" />
              <span>Project & Skill Showcase</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Institutional Records</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PORTAL SHOWCASE CARD */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="w-full max-w-md bg-gradient-to-br from-[#0B192C] via-[#0F1E36] to-[#08101E] text-white p-7 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-left border border-slate-700/60 relative overflow-hidden">
            {/* Subtle glow accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[11px] font-bold font-mono tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-elite-red" />
                <span>ELITE STUDENT PORTAL</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                VERIFIED ID
              </span>
            </div>

            {/* Profile Shell Mockup */}
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-elite-red to-rose-500 text-white flex items-center justify-center font-bold text-base shadow-inner">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>STUDENT PROFILE</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    DEPT. OF INFORMATION TECHNOLOGY
                  </div>
                </div>
              </div>

              {/* Functional Pills */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-xl flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-semibold text-slate-200">PORTFOLIO</span>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-xl flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-200">EVENTS</span>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-xl flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-slate-200">ACHIEVEMENTS</span>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-semibold text-slate-200">RESUME</span>
                </div>
              </div>

              {/* Card Footer Status */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Active Academic Roster
                </span>
                <span className="font-mono text-slate-500">SASI · IT</span>
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>SASI IT-ASSOCIATION</span>
              <span className="text-white font-bold tracking-wider">OFFICIAL SYSTEM</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
import React from 'react';
import { UserCheck, Briefcase, Award, Calendar, FileText, Vote } from 'lucide-react';

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: 'PROFILE',
    description: 'Build your verified student profile.',
    icon: <UserCheck className="w-5 h-5 text-elite-red" />,
    tag: 'Identity'
  },
  {
    title: 'PORTFOLIO',
    description: 'Showcase projects, skills, and work.',
    icon: <Briefcase className="w-5 h-5 text-elite-red" />,
    tag: 'Work'
  },
  {
    title: 'ACHIEVEMENTS',
    description: 'Highlight verified achievements and certificates.',
    icon: <Award className="w-5 h-5 text-elite-red" />,
    tag: 'Recognition'
  },
  {
    title: 'EVENTS',
    description: 'Discover and register for ELITE events.',
    icon: <Calendar className="w-5 h-5 text-elite-red" />,
    tag: 'Participation'
  },
  {
    title: 'RESUME',
    description: 'Maintain your latest professional resume.',
    icon: <FileText className="w-5 h-5 text-elite-red" />,
    tag: 'Career'
  },
  {
    title: 'VOTING',
    description: 'Participate in eligible department voting.',
    icon: <Vote className="w-5 h-5 text-elite-red" />,
    tag: 'Governance'
  }
];

export const PortalFeaturesSection: React.FC = () => {
  return (
    <section id="features" aria-labelledby="features-title" className="py-14 sm:py-18 bg-white border-y border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 text-left">
        {/* Section Header */}
        <div className="max-w-2xl space-y-2 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            <span>CORE CAPABILITIES</span>
            <span className="w-6 h-[2px] bg-elite-red inline-block" />
          </div>
          <h2 id="features-title" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-elite-black font-display tracking-tight">
            Engineered for IT Students
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            The ELITE Student Portal brings together verified credentials, technical work, and department participation in one centralized ecosystem.
          </p>
        </div>

        {/* 6 Capabilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="group p-6 sm:p-7 rounded-2xl bg-neutral-50 hover:bg-white border border-neutral-200/80 hover:border-neutral-300 hover:shadow-lg transition-all duration-200 text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-red-50 group-hover:bg-red-100/70 border border-red-100 flex items-center justify-center transition-colors">
                  {feat.icon}
                </div>
                <span className="text-[10px] font-mono uppercase font-semibold text-neutral-500 bg-neutral-200/60 px-2.5 py-0.5 rounded-full">
                  {feat.tag}
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-elite-black font-display tracking-tight group-hover:text-elite-red transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

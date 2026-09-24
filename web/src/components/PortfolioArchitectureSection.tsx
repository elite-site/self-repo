import React from 'react';
import { Code, Cpu, Trophy, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface ConceptItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  uiIllustration: React.ReactNode;
}

const PORTFOLIO_CONCEPTS: ConceptItem[] = [
  {
    title: 'Projects',
    subtitle: 'Showcase web applications, systems, and open-source contributions with repository links, live demos, and architectural overviews.',
    icon: <Code className="w-5 h-5 text-elite-red" />,
    uiIllustration: (
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 space-y-2 text-[11px] font-mono">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="font-semibold text-neutral-700">Project Record</span>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active Demo</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-[10px]">Stack Tags</span>
          <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-[10px]">GitHub Link</span>
          <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-[10px]">Media Preview</span>
        </div>
      </div>
    )
  },
  {
    title: 'Skills',
    subtitle: 'Curate competencies spanning algorithms, systems programming, web frameworks, databases, and emerging technologies.',
    icon: <Cpu className="w-5 h-5 text-elite-red" />,
    uiIllustration: (
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 space-y-2 text-[11px] font-mono">
        <div className="flex justify-between items-center text-neutral-400">
          <span className="font-semibold text-neutral-700">Verified Competencies</span>
          <span className="text-[10px] text-neutral-500">Categorized</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <span className="bg-neutral-100 text-neutral-700 px-2 py-1 rounded text-center">Core Engineering</span>
          <span className="bg-neutral-100 text-neutral-700 px-2 py-1 rounded text-center">Frameworks</span>
        </div>
      </div>
    )
  },
  {
    title: 'Achievements',
    subtitle: 'Document hackathon wins, research papers, coding accolades, and awards with official department endorsement.',
    icon: <Trophy className="w-5 h-5 text-elite-red" />,
    uiIllustration: (
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 space-y-2 text-[11px] font-mono">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-neutral-700">Department Endorsement</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </span>
        </div>
        <div className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
          Competition · Year · Institutional Category
        </div>
      </div>
    )
  },
  {
    title: 'Certificates',
    subtitle: 'Upload and verify accredited industry certifications, online specializations, and professional courses.',
    icon: <ShieldCheck className="w-5 h-5 text-elite-red" />,
    uiIllustration: (
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 space-y-2 text-[11px] font-mono">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="font-semibold text-neutral-700">Credential Audit</span>
          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Approved</span>
        </div>
        <div className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
          Issuing Organization & Verification ID
        </div>
      </div>
    )
  },
  {
    title: 'Resume',
    subtitle: 'Maintain your latest single-page professional resume in PDF format for faculty, peers, and placement opportunities.',
    icon: <FileText className="w-5 h-5 text-elite-red" />,
    uiIllustration: (
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 space-y-2 text-[11px] font-mono">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="font-semibold text-neutral-700">Resume File</span>
          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded">PDF Format</span>
        </div>
        <div className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
          Direct Embedded Viewer & Public Link
        </div>
      </div>
    )
  }
];

export const PortfolioArchitectureSection: React.FC = () => {
  return (
    <section id="portfolio-architecture" aria-labelledby="portfolio-title" className="py-16 sm:py-20 bg-neutral-50 border-t border-neutral-200/80 text-left">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Section Header */}
        <div className="max-w-2xl space-y-2 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            <span>PORTFOLIO ARCHITECTURE</span>
            <span className="w-6 h-[2px] bg-elite-red inline-block" />
          </div>
          <h2 id="portfolio-title" className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight">
            BUILD YOUR PORTFOLIO
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Construct a comprehensive record of your technical competence, project work, and academic milestones using structured components.
          </p>
        </div>

        {/* 5 Concepts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {PORTFOLIO_CONCEPTS.map((concept) => (
            <div
              key={concept.title}
              className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5 hover:border-neutral-300 hover:shadow-md transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {concept.icon}
                  </div>
                  <h3 className="text-lg font-bold text-elite-black font-display tracking-tight group-hover:text-elite-red transition-colors">
                    {concept.title}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                  {concept.subtitle}
                </p>
              </div>

              {/* Wireframe UI Illustration */}
              <div className="pt-2">
                {concept.uiIllustration}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { ShieldCheck, Video, FileCheck, CheckCircle2 } from 'lucide-react';

const STANDARDS = [
  {
    icon: ShieldCheck,
    title: 'Profile authenticity',
    body: 'Profile information, project repositories, and listed skills must reflect your own work and your official college enrolment.',
  },
  {
    icon: Video,
    title: 'Introduction video standards',
    body: 'Clips should run 60-90 seconds in MP4 or WEBM format, up to 25 MB. Speak naturally with clear audio and even lighting.',
  },
  {
    icon: FileCheck,
    title: 'Verification review',
    body: 'Achievements, certificates, and resumes are reviewed by department coordinators before a profile is endorsed in the public directory.',
  },
];

/**
 * Public-facing statement of what the department expects from a profile.
 * Rendered on the landing page so a first-time visitor learns the rules before
 * signing in, not after uploading something that gets rejected.
 */
export const GuidelinesSection: React.FC = () => {
  return (
    <section id="guidelines" aria-labelledby="guidelines-title" className="border-t border-edge">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-14 sm:py-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-accent">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Standards and policies</span>
          </div>
          <h2
            id="guidelines-title"
            className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink font-heading tracking-tight"
          >
            What a published profile has to meet
          </h2>
          <p className="mt-3 text-sm text-ink-secondary leading-relaxed">
            Three checks run before anything appears in the public directory.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {STANDARDS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="elite-card p-5">
              <Icon className="w-5 h-5 text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-bold text-ink font-heading">{title}</h3>
              <p className="mt-2 text-sm text-ink-secondary leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg bg-brand-soft border border-brand-soft p-5 sm:p-6 sm:flex sm:items-start sm:gap-4">
          <CheckCircle2 className="w-5 h-5 text-brand shrink-0" aria-hidden="true" />
          <div className="mt-2 sm:mt-0">
            <h3 className="text-sm font-bold text-ink font-heading">Code of conduct</h3>
            <p className="mt-1.5 text-sm text-ink-secondary leading-relaxed max-w-[70ch]">
              Event teams collaborate in good faith, voting stays fair, and department ethics apply
              to everything published under your name. Conduct that breaches these rules removes a
              profile from the directory.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

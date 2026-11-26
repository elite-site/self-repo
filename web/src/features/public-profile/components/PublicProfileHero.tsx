import React from 'react';
import { Mail, FileText, Github, Linkedin, Globe } from 'lucide-react';
import { LeetCodeIcon, CodeChefIcon, HackerRankIcon, CodeforcesIcon } from '@/shared/ui/PlatformIcons';
import { safeUrl } from '@/shared/utils/safeUrl';
import { resolveMediaUrl } from '@/shared/api';
import { getPhotoStyle } from '@/shared/utils/photoStyle';
import { PublicStudent, PublicProfileFields } from '../types';

interface PublicProfileHeroProps {
  student: PublicStudent;
  firstName: string;
  restOfName: string;
  name: string;
  initials: string;
  bio: string;
  profile: PublicProfileFields;
  hasResume: boolean;
  resumeDownloadHref: string | null;
  photo: string | null | undefined;
  imageError: boolean;
  setImageError: (err: boolean) => void;
  department: string;
}

function taglineOf(bio: string): string {
  const firstLine = bio.split('\n')[0] ?? '';
  const sentence = firstLine.match(/^.*?[.!?](\s|$)/)?.[0]?.trim();
  const candidate = sentence || firstLine.trim();
  return candidate.length > 180 ? `${candidate.slice(0, 177).trimEnd()}…` : candidate;
}

export const PublicProfileHero: React.FC<PublicProfileHeroProps> = ({
  student,
  firstName,
  restOfName,
  name,
  initials,
  bio,
  profile,
  hasResume,
  resumeDownloadHref,
  photo,
  imageError,
  setImageError,
  department,
}) => {
  return (
    <section id="home" className="scroll-mt-24 pt-6 sm:pt-12 lg:pt-14 print:pt-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Content */}
        <div className="lg:col-span-5 text-center lg:text-left order-2 lg:order-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-edge/30 bg-surface-inset/10 px-3 py-1 text-xs font-medium text-ink-brand">
            <span>Hello, I'm 👋</span>
          </span>

          <h1 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-tight">
            {firstName}{' '}
            <span className="text-ink-brand">
              {restOfName}
            </span>
          </h1>

          <p className="mt-2 text-base sm:text-lg font-medium text-ink-muted">
            {department} Student
          </p>

          {bio ? (
            <p className="mt-3 text-sm sm:text-base text-ink-secondary leading-relaxed max-w-prose mx-auto lg:mx-0">
              {taglineOf(bio)}
            </p>
          ) : null}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <a
              href="#contact"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs sm:text-sm font-semibold text-ink shadow-md  hover:bg-brand-hover transition-all duration-200"
            >
              <Mail size={15} />
              <span>Contact Me</span>
            </a>

            {hasResume && resumeDownloadHref && (
              <a
                href={resumeDownloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-edge-strong bg-surface-raised/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-ink hover:bg-surface-raised hover:text-ink transition-colors"
              >
                <FileText size={15} />
                <span>Download Resume</span>
              </a>
            )}
          </div>

          {/* Social Links Row */}
          <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            {safeUrl(profile.githubUrl) && (
              <a
                href={safeUrl(profile.githubUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink transition-colors"
                title="GitHub"
              >
                <Github size={16} />
              </a>
            )}
            {safeUrl(profile.linkedinUrl) && (
              <a
                href={safeUrl(profile.linkedinUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink transition-colors"
                title="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            )}
            {safeUrl(profile.leetcodeUrl) && (
              <a
                href={safeUrl(profile.leetcodeUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink-muted transition-colors"
                title="LeetCode"
              >
                <LeetCodeIcon className="size-4 text-ink-muted" />
              </a>
            )}
            {safeUrl(profile.codechefUrl) && (
              <a
                href={safeUrl(profile.codechefUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink-muted transition-colors"
                title="CodeChef"
              >
                <CodeChefIcon className="size-4 text-ink-muted" />
              </a>
            )}
            {safeUrl(profile.hackerrankUrl) && (
              <a
                href={safeUrl(profile.hackerrankUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink-muted transition-colors"
                title="HackerRank"
              >
                <HackerRankIcon className="size-4 text-ink-muted" />
              </a>
            )}
            {safeUrl(profile.codeforcesUrl) && (
              <a
                href={safeUrl(profile.codeforcesUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink-muted transition-colors"
                title="Codeforces"
              >
                <CodeforcesIcon className="size-4 text-ink-muted" />
              </a>
            )}
            {safeUrl(profile.portfolioUrl) && (
              <a
                href={safeUrl(profile.portfolioUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink transition-colors"
                title="Personal Website"
              >
                <Globe size={16} />
              </a>
            )}
            {student.email && safeUrl(`mailto:${student.email}`) && (
              <a
                href={safeUrl(`mailto:${student.email}`)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-edge bg-surface/80 text-ink-secondary hover:border-edge-strong hover:text-ink transition-colors"
                title="Email"
              >
                <Mail size={16} />
              </a>
            )}
          </div>
        </div>

        {/* Center Profile Image */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="relative p-1.5 rounded-full bg-brand shadow-xl ">
            <div className="relative size-36 sm:size-44 lg:size-48 rounded-full overflow-hidden bg-surface-canvas border-4 border-surface-canvas">
              {photo && !imageError ? (
                <img
                  src={resolveMediaUrl(photo)}
                  alt={`${name}'s profile photo`}
                  style={getPhotoStyle(profile)}
                  onError={() => setImageError(true)}
                  className="size-full object-cover"
                />
              ) : (
                <div className="size-full flex items-center justify-center bg-surface text-ink-muted font-heading text-3xl font-bold">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-edge/30 bg-surface-inset/10 px-3 py-1 text-xs font-semibold text-ink-muted backdrop-blur-sm">
            <span className="size-2 rounded-full bg-surface-inset animate-pulse" />
            <span>{student.status === 'GRADUATED' ? 'Alumni' : 'Active Student'}</span>
          </div>
        </div>

        {/* Right Information Card */}
        <div className="lg:col-span-3 order-3">
          <div className="rounded-2xl border border-edge/80 bg-surface/60 p-5 backdrop-blur-md shadow-lg space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-edge/80">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Student Profile</span>
              <span className="font-mono text-xs font-semibold text-ink-muted">{student.rollNo}</span>
            </div>

            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Academic Year</span>
              <p className="text-sm font-bold text-ink mt-0.5">Year {student.year || 1} (Section {student.section || 'A'})</p>
            </div>

            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Department</span>
              <p className="text-sm font-bold text-ink mt-0.5">{department}</p>
            </div>

            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Institution</span>
              <p className="text-xs font-medium text-ink-secondary mt-0.5 leading-snug">SASI Institute of Technology & Engineering</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

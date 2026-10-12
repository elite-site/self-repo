import React from 'react';
import { Github, Linkedin, Globe, RefreshCw, ExternalLink, ArrowLeft } from 'lucide-react';
import { LeetCodeIcon, CodeChefIcon, HackerRankIcon, CodeforcesIcon } from '@/shared/ui/PlatformIcons';

interface StudentDetailHeaderProps {
  student: any;
  onBack?: () => void;
  onRefresh: () => void;
}

export const StudentDetailHeader: React.FC<StudentDetailHeaderProps> = ({
  student,
  onBack,
  onRefresh,
}) => {
  const profile = student.profile || {};
  const skillsList = profile.skills || [];

  return (
    <>
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-surface hover:bg-surface-sunken text-ink-secondary text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Roster</span>
            </button>
          )}
          <span className="text-xs text-ink-muted">/</span>
          <span className="text-xs font-mono font-bold text-ink-brand uppercase">{student.rollNo}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-surface hover:bg-surface-sunken text-ink-secondary text-xs font-semibold cursor-pointer"
            title="Refresh student data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href={`/students/${student.rollNo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brand text-on-primary text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <span>Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-surface border border-edge rounded-lg p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg bg-status-bg-rejected text-ink-brand flex items-center justify-center text-2xl font-semibold border border-edge overflow-hidden shadow-xs shrink-0">
              <span>{student.name?.charAt(0) || 'S'}</span>
              {profile.photoUrl && (
                <img
                  src={profile.photoUrl}
                  alt={student.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-semibold text-ink font-display">
                  {student.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-sunken text-ink-secondary">
                  {student.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs font-mono text-ink-muted mt-1">
                Roll No: <span className="font-bold text-ink">{student.rollNo}</span> • Year{' '}
                {student.year} Section {student.section} • {student.branch || 'IT'}
              </p>
              {student.email && (
                <p className="text-xs text-ink-muted mt-0.5">{student.email}</p>
              )}
            </div>
          </div>

          {/* Social / Portfolio Links */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Linkedin className="w-3.5 h-3.5 text-status-approved" /> LinkedIn
              </a>
            )}
            {profile.leetcodeUrl && (
              <a
                href={profile.leetcodeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-warning"
              >
                <LeetCodeIcon className="w-3.5 h-3.5" /> LeetCode
              </a>
            )}
            {profile.codechefUrl && (
              <a
                href={profile.codechefUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <CodeChefIcon className="w-3.5 h-3.5" /> CodeChef
              </a>
            )}
            {profile.hackerrankUrl && (
              <a
                href={profile.hackerrankUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <HackerRankIcon className="w-3.5 h-3.5 text-status-approved" /> HackerRank
              </a>
            )}
            {profile.codeforcesUrl && (
              <a
                href={profile.codeforcesUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <CodeforcesIcon className="w-3.5 h-3.5 text-brand" /> Codeforces
              </a>
            )}
            {profile.portfolioUrl && (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-edge hover:bg-surface-sunken text-xs font-semibold text-ink-secondary"
              >
                <Globe className="w-3.5 h-3.5 text-status-approved" /> Website
              </a>
            )}
          </div>
        </div>

        {/* Bio & Skills */}
        {(profile.biography || skillsList.length > 0) && (
          <div className="mt-5 pt-5 border-t border-edge grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold text-ink-muted mb-1">Biography</h4>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {profile.biography || 'No biography written yet.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink-muted mb-1.5">
                Skills ({skillsList.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((s: any) => (
                  <span
                    key={s.id || s.skill?.id}
                    className="px-2 py-0.5 rounded-md text-xs font-bold bg-surface-sunken text-ink-secondary"
                  >
                    {s.skill?.name || s.name}
                  </span>
                ))}
                {skillsList.length === 0 && (
                  <span className="text-xs text-ink-muted italic">No skills added</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

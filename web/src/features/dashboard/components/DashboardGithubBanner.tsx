import React from 'react';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';

interface DashboardGithubBannerProps {
  onSnooze: () => void;
}

export const DashboardGithubBanner: React.FC<DashboardGithubBannerProps> = ({ onSnooze }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-brand-soft p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink shadow-sm">
          <Github size={20} />
        </span>
        <div className="space-y-0.5">
          <p className="font-heading text-label-md font-bold text-ink">
            Build your portfolio with GitHub
          </p>
          <p className="text-body-sm text-ink-secondary">
            Connect your GitHub to showcase your repositories and skills automatically on your portfolio.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={onSnooze}
          className="btn btn-ghost px-3 py-1.5 text-xs text-ink-secondary hover:text-ink min-h-[38px]"
        >
          Remind me later
        </button>
        <Link
          to="/github"
          className="btn btn-primary px-4 py-1.5 text-xs font-bold min-h-[38px] inline-flex items-center gap-1.5"
        >
          <Github size={14} />
          <span>Connect GitHub</span>
        </Link>
      </div>
    </div>
  );
};

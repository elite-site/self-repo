import React from 'react';
import { Github, Code2, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface GithubNotConnectedProps {
  connecting: boolean;
  onConnect: () => void;
}

export const GithubNotConnected: React.FC<GithubNotConnectedProps> = ({ connecting, onConnect }) => {
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-10 border border-edge bg-surface shadow-card">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft border border-brand/20 text-brand-soft-text text-label-sm font-bold">
            <Github size={16} />
            <span>GitHub Portfolio Sync</span>
          </div>

          <h1 className="font-heading text-headline-xl text-ink leading-tight">
            Connect your GitHub to showcase your work automatically
          </h1>

          <p className="text-body-md text-ink-secondary leading-relaxed">
            Connect your personal GitHub account to automatically import public repositories, showcase your top
            5 projects, and compute verified skill badges for your portfolio.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="btn btn-primary min-h-[48px] px-6 text-label-md font-bold inline-flex items-center gap-2.5"
            >
              <Github size={18} />
              <span>{connecting ? 'Redirecting to GitHub…' : 'Connect GitHub'}</span>
              {!connecting && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface p-5 space-y-2.5 rounded-xl border border-edge">
          <div className="size-10 rounded-lg bg-brand-soft flex items-center justify-center text-brand-soft-text">
            <Code2 size={20} />
          </div>
          <h2 className="font-heading text-label-lg font-bold text-ink">Automated Portfolio</h2>
          <p className="text-body-sm text-ink-secondary">
            No manual copying of repository links, descriptions, or stars. Your projects stay fresh with live stats.
          </p>
        </div>

        <div className="surface p-5 space-y-2.5 rounded-xl border border-edge">
          <div className="size-10 rounded-lg bg-status-bg-approved flex items-center justify-center text-status-approved">
            <Sparkles size={20} />
          </div>
          <h2 className="font-heading text-label-lg font-bold text-ink">Computed Skills</h2>
          <p className="text-body-sm text-ink-secondary">
            Skills and languages are verified directly against your commit history and package dependencies.
          </p>
        </div>

        <div className="surface p-5 space-y-2.5 rounded-xl border border-edge">
          <div className="size-10 rounded-lg bg-surface-sunken flex items-center justify-center text-ink-muted">
            <ShieldCheck size={20} />
          </div>
          <h2 className="font-heading text-label-lg font-bold text-ink">Secure & Privacy-First</h2>
          <p className="text-body-sm text-ink-secondary">
            We only read public identity and repository metadata. We never request access to private repos or source code.
          </p>
        </div>
      </div>
    </div>
  );
};

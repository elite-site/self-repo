import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useSpotlight } from '@/hooks/useSpotlight';

import type { QuickActionItem } from './DashboardQuickActions';

const ACTION_EMOJIS: Record<string, string> = {
  'Upload video': '🎬',
  'Add project': '🚀',
  'Browse events': '🗓️',
  'View team': '👥',
  'Edit profile': '✏️',
  Resume: '📄',
};

const QuickActionCard: React.FC<{ action: QuickActionItem }> = ({ action }) => {
  const { spotlightProps } = useSpotlight<HTMLAnchorElement>();
  const emoji = ACTION_EMOJIS[action.label] || '';
  const isPrimary = action.label === 'Upload video';

  return (
    <Link
      to={action.to}
      {...spotlightProps}
      className={cn(
        'glow-btn glow-card quick-action-card group relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-[16px] border border-white/10 bg-[#0a0a10] min-h-[88px] sm:min-h-[96px] transition-all duration-200',
        isPrimary && 'glow-breathing border-purple-500/30'
      )}
    >
      <div className="relative mb-1.5 sm:mb-2">
        <span className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25 group-hover:text-purple-300 transition-colors">
          <action.icon className="action-icon size-4 sm:size-5 transition-transform" strokeWidth={2} aria-hidden="true" />
        </span>
        {emoji && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 text-xs select-none"
            role="img"
          >
            {emoji}
          </span>
        )}
      </div>

      <span className="block font-heading text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors">
        {action.label}
      </span>
      {action.hint && (
        <span className="mt-0.5 hidden sm:block truncate max-w-full text-[11px] text-white/40">
          {action.hint}
        </span>
      )}
    </Link>
  );
};

export interface QuickActionsProps {
  actions: QuickActionItem[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <section aria-labelledby="quick-actions-heading" className="w-full">
      <h2 id="quick-actions-heading" className="sr-only">
        Quick actions
      </h2>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {actions.map((action) => (
          <QuickActionCard key={action.to + action.label} action={action} />
        ))}
      </div>
    </section>
  );
};

export default QuickActions;

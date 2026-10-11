import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

export interface QuickActionItem {
  label: string;
  hint: string;
  to: string;
  icon: LucideIcon;
}

interface DashboardQuickActionsProps {
  actions: QuickActionItem[];
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({ actions }) => {
  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="sr-only">
        Quick actions
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {actions.map((action) => (
          <Link
            key={action.to + action.label}
            to={action.to}
            className="flex flex-col items-center text-center gap-1.5 sm:gap-2 rounded-xl border border-edge bg-surface p-2.5 sm:p-4 transition-all duration-fast hover:-translate-y-1 hover:border-brand hover:shadow-md"
          >
            <span className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-text">
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-label-xs sm:text-label-md font-bold leading-tight text-ink">
                {action.label}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

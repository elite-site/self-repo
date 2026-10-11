import React from 'react';

export interface AutomationKpiCardsProps {
  total: number;
  activeCount: number;
  templatesCount: number;
}

export const AutomationKpiCards: React.FC<AutomationKpiCardsProps> = ({
  total,
  activeCount,
  templatesCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">Total Workflows</span>
        <div className="text-2xl font-semibold text-ink">{total}</div>
      </div>
      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">Active Pipelines</span>
        <div className="text-2xl font-semibold text-status-approved">{activeCount} Active</div>
      </div>
      <div className="p-4 bg-surface border border-edge rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-ink-muted block mb-1">Prepared Email Templates</span>
        <div className="text-2xl font-semibold text-ink">{templatesCount} Templates</div>
      </div>
    </div>
  );
};

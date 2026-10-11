import React from 'react';
import { Mail, Clock, Users, Play, Pause, Send } from 'lucide-react';
import { EmailAutomationItem } from '../types';

interface AutomationCardProps {
  automation: EmailAutomationItem;
  isToggling: boolean;
  isRunning: boolean;
  onToggle: (id: string) => void;
  onRunNow: (id: string, name: string) => void;
}

export const AutomationCard: React.FC<AutomationCardProps> = ({
  automation: auto,
  isToggling,
  isRunning,
  onToggle,
  onRunNow,
}) => {
  const isActive = auto.status === 'ACTIVE';

  return (
    <div className="bg-surface border border-edge rounded-xl p-5 shadow-sm hover:border-edge-strong transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isActive
                ? 'bg-status-bg-approved text-status-approved border border-edge'
                : 'bg-surface-sunken text-ink-muted border border-edge'
            }`}
          >
            {auto.status}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-status-bg-approved text-status-approved border border-edge">
            Trigger: {auto.trigger}
          </span>
          {auto.targetAll && (
            <span className="text-xs text-ink-muted flex items-center gap-1">
              <Users className="w-3 h-3" /> All Students
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-ink leading-snug">
          {auto.name}
        </h3>
        {auto.description && (
          <p className="text-xs text-ink-secondary mt-1">
            {auto.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-ink-muted" />
            Template: <strong className="text-ink-secondary">{auto.template?.name || 'Default'}</strong>
          </span>
          <span className="text-ink-muted">•</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-ink-muted" />
            Last run: {auto.lastRunAt ? new Date(auto.lastRunAt).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-edge shrink-0">
        <button
          onClick={() => onToggle(auto.id)}
          disabled={isToggling}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
            isActive
              ? 'text-status-pending bg-status-bg-pending border-edge hover:bg-status-bg-pending'
              : 'text-status-approved bg-status-bg-approved border-edge hover:bg-status-bg-approved'
          }`}
        >
          {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isActive ? 'Pause' : 'Activate'}
        </button>

        <button
          onClick={() => onRunNow(auto.id, auto.name)}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-ink bg-surface-sunken border border-edge rounded-lg hover:bg-surface-inset transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Dispatching...' : 'Run Now'}
        </button>
      </div>
    </div>
  );
};

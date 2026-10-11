import React from 'react';
import { CheckCircle } from 'lucide-react';
import { EventStatus } from '../types';

export const EventStatusBadge: React.FC<{ status: EventStatus | string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: 'Draft', cls: 'badge badge-draft' },
    OPEN: { label: 'Open', cls: 'badge badge-approved' },
    CLOSED: { label: 'Closed', cls: 'badge badge-draft' },
    ARCHIVED: { label: 'Archived', cls: 'badge badge-draft' },
  };
  const s = map[status] ?? { label: status, cls: 'badge badge-draft' };
  return <span className={s.cls}>{s.label}</span>;
};

export const VotingStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string; icon: React.FC<{ className?: string }> }> = {
    DRAFT: {
      label: 'Draft',
      cls: 'bg-surface-canvas text-ink-secondary border-edge',
      icon: () => <span className="w-2 h-2 rounded-full bg-surface-inset inline-block mr-1" />,
    },
    ACTIVE: {
      label: 'Active',
      cls: 'bg-status-bg-approved text-status-approved border-edge',
      icon: () => <span className="w-2 h-2 rounded-full bg-status-approved inline-block mr-1" />,
    },
    CLOSED: {
      label: 'Closed',
      cls: 'bg-status-bg-pending text-status-pending border-edge',
      icon: () => <span className="w-2 h-2 rounded-full bg-surface-sunken inline-block mr-1" />,
    },
    FINALIZED: {
      label: 'Finalized',
      cls: 'bg-status-bg-approved text-status-approved border-edge',
      icon: () => <CheckCircle className="w-3 h-3 mr-1" />,
    },
  };
  const s = map[status] ?? map.DRAFT;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      <Icon className="w-2 h-2" />
      {s.label}
    </span>
  );
};

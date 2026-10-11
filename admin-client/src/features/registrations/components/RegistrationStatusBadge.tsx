import React from 'react';
import { CheckCircle2, Clock, UserCheck, X, XCircle, Sparkles } from 'lucide-react';
import { RegistrationStatus, TeamStatus } from '../types';

export const RegistrationStatusBadge: React.FC<{ status: RegistrationStatus }> = ({ status }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-approved text-status-approved border border-edge">
          <CheckCircle2 className="w-3 h-3 text-status-approved" /> Confirmed
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-pending text-status-pending border border-edge">
          <Clock className="w-3 h-3 text-status-pending" /> Pending Review
        </span>
      );
    case 'WAITLISTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-approved text-status-approved border border-edge">
          <UserCheck className="w-3 h-3 text-status-approved" /> Waitlisted
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-sunken text-ink-secondary border border-edge">
          <X className="w-3 h-3 text-ink-muted" /> Cancelled
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-rejected text-status-rejected border border-edge">
          <XCircle className="w-3 h-3 text-status-rejected" /> Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-surface-sunken text-ink-secondary">
          {status}
        </span>
      );
  }
};

export const TeamStatusBadge: React.FC<{ status: TeamStatus }> = ({ status }) => {
  switch (status) {
    case 'COMPLETE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-approved text-status-approved border border-edge">
          <CheckCircle2 className="w-3 h-3" /> Complete
        </span>
      );
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-approved text-status-approved border border-edge">
          <Sparkles className="w-3 h-3" /> Active
        </span>
      );
    case 'FORMING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-pending text-status-pending border border-edge">
          <Clock className="w-3 h-3" /> Forming
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-bg-rejected text-status-rejected border border-edge">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
  }
};

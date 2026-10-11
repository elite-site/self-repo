import React from 'react';
import { Layers, CheckCircle2, Clock, UserCheck, X, Users } from 'lucide-react';
import { RegistrationStats } from '../types';

export const RegistrationStatsCards: React.FC<{ stats: RegistrationStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="bg-surface p-4 rounded-xl border border-edge">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted">Total</span>
          <Layers className="w-4 h-4 text-status-approved" />
        </div>
        <div className="text-2xl font-semibold text-ink mt-2">
          {stats.total}
        </div>
        <div className="text-xs text-ink-muted mt-0.5">All applications</div>
      </div>

      <div className="bg-surface p-4 rounded-xl border border-edge">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted">Confirmed</span>
          <CheckCircle2 className="w-4 h-4 text-status-approved" />
        </div>
        <div className="text-2xl font-semibold text-status-approved mt-2">
          {stats.confirmed}
        </div>
        <div className="text-xs text-status-approved/80 font-medium mt-0.5">Approved & active</div>
      </div>

      <div className="bg-surface p-4 rounded-xl border border-edge">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted">Pending</span>
          <Clock className="w-4 h-4 text-status-pending" />
        </div>
        <div className="text-2xl font-semibold text-status-pending mt-2">
          {stats.pending}
        </div>
        <div className="text-xs text-status-pending/80 font-medium mt-0.5">Requires review</div>
      </div>

      <div className="bg-surface p-4 rounded-xl border border-edge">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted">Waitlist</span>
          <UserCheck className="w-4 h-4 text-status-approved" />
        </div>
        <div className="text-2xl font-semibold text-status-approved mt-2">
          {stats.waitlisted}
        </div>
        <div className="text-xs text-status-approved/80 font-medium mt-0.5">Backup roster</div>
      </div>

      <div className="bg-surface p-4 rounded-xl border border-edge">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted">Cancelled</span>
          <X className="w-4 h-4 text-ink-muted" />
        </div>
        <div className="text-2xl font-semibold text-ink-secondary mt-2">
          {stats.cancelled + stats.rejected}
        </div>
        <div className="text-xs text-ink-muted mt-0.5">Withdrawn/rejected</div>
      </div>

      <div className="bg-surface p-4 rounded-xl border border-edge">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted">Teams</span>
          <Users className="w-4 h-4 text-status-review" />
        </div>
        <div className="text-2xl font-semibold text-status-review mt-2">
          {stats.totalTeams ?? 0}
        </div>
        <div className="text-xs text-status-review/80 font-medium mt-0.5">
          {stats.completedTeams ?? 0} completed
        </div>
      </div>
    </div>
  );
};

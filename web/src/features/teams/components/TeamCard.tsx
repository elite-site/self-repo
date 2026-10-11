import React from 'react';
import { UserPlus, Trash2, Loader2 } from 'lucide-react';
import { Team } from '../types';

interface TeamCardProps {
  team: Team;
  removing: boolean;
  onInvite: (teamId: string) => void;
  onRemove: (team: Team) => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team: t, removing, onInvite, onRemove }) => {
  return (
    <div
      className="surface overflow-hidden hover:border-brand-hover hover:shadow-card-hover transition-colors flex flex-col justify-between"
      role="listitem"
    >
      <div className="p-5 border-b border-edge flex items-center justify-between gap-2 bg-surface-sunken">
        <div>
          <h3 className="font-bold text-body-sm text-ink font-heading">{t.name}</h3>
          <p className="text-label-sm text-ink-secondary">{t.event?.name || 'Independent Team'}</p>
        </div>
        {t.isLeader && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onInvite(t.id)}
              className="p-1.5 rounded-lg border border-edge bg-surface text-ink-secondary hover:text-ink-brand hover:bg-brand-soft transition-colors cursor-pointer"
              aria-label={`Invite member to ${t.name}`}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onRemove(t)}
              disabled={removing}
              className="p-1.5 rounded-lg border border-edge bg-surface text-ink-muted hover:text-status-rejected hover:bg-status-bg-rejected transition-colors cursor-pointer disabled:opacity-50"
              aria-label={`Remove team ${t.name}`}
            >
              {removing ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-2">
        <h4 className="text-label-xs font-bold text-ink-muted uppercase tracking-wider">
          Members ({t.members?.length || 1})
        </h4>
        <ul className="space-y-2">
          {t.members && t.members.length > 0 ? (
            t.members.map((m: any, i: number) => {
              const name = m.student?.name || m.name || (typeof m === 'string' ? m : 'Member');
              const roll = m.student?.rollNo || '';
              return (
                <li key={i} className="flex items-center justify-between text-body-sm text-ink-secondary">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand text-ink-inverse flex items-center justify-center text-label-xs font-bold font-heading">
                      {name.charAt(0)}
                    </div>
                    <span className="font-semibold text-ink">{name}</span>
                  </div>
                  {roll && <span className="text-label-xs text-ink-muted">{roll}</span>}
                </li>
              );
            })
          ) : (
            <li className="text-body-sm text-ink-muted italic">No members yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

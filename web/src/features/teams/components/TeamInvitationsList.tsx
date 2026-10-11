import React from 'react';
import { Mail, Check, X } from 'lucide-react';
import { TeamInvitation } from '../types';

interface TeamInvitationsListProps {
  invitations: TeamInvitation[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export const TeamInvitationsList: React.FC<TeamInvitationsListProps> = ({
  invitations,
  onAccept,
  onDecline,
}) => {
  if (invitations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-status-review" aria-hidden="true" />
        <h2 className="text-body-md font-bold text-ink font-heading">
          Pending team invitations ({invitations.length})
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="surface border border-status-review/20 rounded-lg shadow-card flex flex-col justify-between space-y-4"
          >
            <div>
              <span className="badge badge-review">Invitation</span>
              <h3 className="font-bold text-body-sm text-ink font-heading mt-2">
                {inv.team?.name || 'Hackathon Squad'}
              </h3>
              <p className="text-body-sm text-ink-secondary mt-0.5">
                {inv.event?.name ? `For ${inv.event.name}` : 'General Project Team'}
              </p>
            </div>
            <div className="flex gap-2 pt-2 border-t border-edge">
              <button
                onClick={() => onAccept(inv.id)}
                className="btn btn-primary flex-1 flex justify-center items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Accept
              </button>
              <button
                onClick={() => onDecline(inv.id)}
                className="btn btn-ghost flex-1 flex justify-center items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" /> Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

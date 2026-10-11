import React from 'react';
import { Vote, BarChart3, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { VotingCampaign } from '../types';
import { VotingStatusBadge } from './EventStatusBadge';

export interface VotingCampaignCardProps {
  campaign: VotingCampaign;
  activating: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

export const VotingCampaignCard: React.FC<VotingCampaignCardProps> = ({
  campaign: c,
  activating,
  onActivate,
  onClose,
}) => {
  return (
    <div className="bg-surface rounded-lg border border-edge p-5 flex items-center gap-6 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-sm font-semibold text-ink truncate">{c.title}</h3>
          <VotingStatusBadge status={c.status} />
        </div>
        <p className="text-xs text-ink-muted mb-2">
          Event: {c.eventId === 'self-introduction-2026' || c.eventTitle === 'Self Introduction' ? 'No event' : c.eventTitle || 'No event'}
        </p>
        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1"><Vote className="w-3.5 h-3.5" /> {c.totalVotes} votes</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {c.candidateCount} candidates</span>
          {c.votingStart && <span>Opens: {new Date(c.votingStart).toLocaleString()}</span>}
          {c.votingEnd && <span>Closes: {new Date(c.votingEnd).toLocaleString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {c.status === 'DRAFT' && (
          <button
            onClick={() => onActivate(c.id)}
            disabled={activating === c.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-status-solid-approved text-on-primary rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            {activating === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Activate
          </button>
        )}
        {c.status === 'ACTIVE' && (
          <button
            onClick={() => onClose(c.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-status-solid-pending text-on-primary rounded-lg text-xs font-bold hover:bg-status-solid-pending cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" /> Close
          </button>
        )}
      </div>
    </div>
  );
};

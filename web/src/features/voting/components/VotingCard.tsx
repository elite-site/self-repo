import React from 'react';
import { Clock } from 'lucide-react';
import { VotingCampaign } from '../types';

interface VotingCardProps {
  campaign: VotingCampaign;
  onOpenVote: (campaign: VotingCampaign) => void;
}

export const VotingCard: React.FC<VotingCardProps> = ({ campaign: c, onOpenVote }) => {
  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : 'To be announced');

  return (
    <div
      className="surface overflow-hidden hover:border-brand-hover hover:shadow-card-hover transition-colors flex flex-col justify-between text-left"
      role="listitem"
    >
      <div className="p-6 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-body-md font-bold text-ink font-heading">{c.title}</h3>
          <span className="badge badge-pending flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Active
          </span>
        </div>
        <p className="text-body-sm text-ink-secondary leading-relaxed">{c.description}</p>
        <div className="text-label-sm text-ink-muted font-medium">
          {c.candidates?.length || 0} Candidates running for election
        </div>
      </div>

      <div className="surface-sunken px-6 py-4 border-t border-edge flex items-center justify-between">
        <span className="text-body-sm text-ink-secondary font-medium">
          Ends {formatDate(c.endDate)}
        </span>
        <button
          onClick={() => onOpenVote(c)}
          className="btn btn-primary"
          aria-label={`View candidates and vote in ${c.title}`}
        >
          View Candidates & Vote
        </button>
      </div>
    </div>
  );
};

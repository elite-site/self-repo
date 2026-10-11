import React from 'react';
import { Vote, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useVotingManagement } from '../hooks/useVotingManagement';
import { VotingCampaignWizardModal } from '../components/VotingCampaignWizardModal';
import { VotingCampaignCard } from '../components/VotingCampaignCard';

export const VotingManagementPage: React.FC = () => {
  const {
    campaigns,
    loading,
    error,
    showCreate,
    setShowCreate,
    activating,
    fetchCampaigns,
    handleActivate,
    handleClose,
  } = useVotingManagement();

  return (
    <div className="space-y-6">
      {showCreate && (
        <VotingCampaignWizardModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchCampaigns}
        />
      )}
      <div className="flex items-center justify-between pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <Vote className="w-6 h-6 text-status-rejected" />
          <div>
            <h1 className="text-xl font-semibold text-ink">Voting Management</h1>
            <p className="text-xs text-ink-muted">Create and manage voting campaigns</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold hover:bg-brand cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-surface rounded-lg border border-edge">
          <Loader2 className="w-7 h-7 animate-spin text-status-rejected" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 justify-center h-48 bg-surface rounded-lg border border-edge">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-surface rounded-lg border border-edge gap-3">
          <Vote className="w-10 h-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink-muted">No campaigns yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((c) => (
            <VotingCampaignCard
              key={c.id}
              campaign={c}
              activating={activating}
              onActivate={handleActivate}
              onClose={handleClose}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VotingManagementPage;

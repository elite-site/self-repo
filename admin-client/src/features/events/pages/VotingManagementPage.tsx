import React from 'react';
import { Vote, Plus, Loader2, AlertCircle, ShieldCheck, CheckCircle } from 'lucide-react';
import { useVotingManagement } from '../hooks/useVotingManagement';
import { VotingCampaignWizardModal } from '../components/VotingCampaignWizardModal';
import { VotingCampaignCard } from '../components/VotingCampaignCard';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryGrid';

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

  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const closedCount = campaigns.filter((c) => c.status === 'CLOSED').length;
  const totalVotes = campaigns.reduce((sum, c) => sum + (c.totalVotes ?? 0), 0);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {showCreate && (
        <VotingCampaignWizardModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchCampaigns}
        />
      )}

      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <Vote size={13} className="shrink-0" />
                <span>Student Democracy & Elections</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
                Voting Management
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                Configure student elections, student council voting ballots, and live turnout metrics.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary text-xs sm:text-sm min-h-[40px] px-4 inline-flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Active Polls</span>
              <span className="text-2xl font-bold text-status-approved tabular-nums">{activeCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Finalized / Closed</span>
              <span className="text-2xl font-bold text-ink tabular-nums">{closedCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover col-span-2 sm:col-span-1">
              <span className="text-xs text-ink-muted block font-medium">Total Ballots Cast</span>
              <span className="text-2xl font-bold text-brand tabular-nums">{totalVotes}</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <ShieldCheck size={13} />
                  Election Integrity
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  Tamper-proof
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Democratic Ballots Control</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Single-vote cryptographic tokens ensure one verified ballot per student roll number with anonymous tallying.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Turnout Ratio</span>
                  <span className="font-bold text-ink text-sm">Active</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Audit Mode</span>
                  <span className="font-bold text-status-approved text-sm">Immutable</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <CheckCircle size={14} className="text-brand shrink-0" />
              <span>Full audit trail recorded</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. CAMPAIGNS GRID */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-surface rounded-xl border border-edge">
          <Loader2 className="w-7 h-7 animate-spin text-brand" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 justify-center h-48 bg-surface rounded-xl border border-edge p-6 text-center">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-surface rounded-xl border border-edge gap-3 p-6 text-center">
          <Vote className="w-10 h-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink-muted">No campaigns yet</p>
        </div>
      ) : (
        <MasonryGrid cols={2}>
          {campaigns.map((c) => (
            <MasonryItem key={c.id}>
              <div className="card-hover">
                <VotingCampaignCard
                  campaign={c}
                  activating={activating}
                  onActivate={() => handleActivate(c.id)}
                  onClose={() => handleClose(c.id)}
                />
              </div>
            </MasonryItem>
          ))}
        </MasonryGrid>
      )}
    </div>
  );
};

export default VotingManagementPage;

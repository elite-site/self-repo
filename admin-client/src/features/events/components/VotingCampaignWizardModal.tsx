import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { eventsApi } from '../api';

const campaignSteps = ['Name & Event', 'Voting Period', 'Eligibility', 'Candidates', 'Rules', 'Review'];

export interface VotingCampaignWizardModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const VotingCampaignWizardModal: React.FC<VotingCampaignWizardModalProps> = ({
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    votingStart: '',
    votingEnd: '',
    votesPerPerson: 1,
    anonymous: false,
  });

  const update = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await eventsApi.createVotingCampaign(form);
      onCreated();
      onClose();
    } catch (err) {
      // Non-fatal: the wizard stays open so the operator can correct and retry.
      console.warn('Could not create voting campaign:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-scrim flex items-center justify-center p-4">
      <div className="bg-surface text-ink rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-edge">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 className="text-base font-semibold text-ink">Create Voting Campaign</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Progress */}
        <div className="flex px-5 pt-4 gap-1 overflow-x-auto">
          {campaignSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < step
                    ? 'bg-status-solid-approved text-on-primary'
                    : i === step
                    ? 'bg-status-solid-rejected text-on-primary'
                    : 'bg-surface-inset text-ink-muted'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-semibold ${i === step ? 'text-ink' : 'text-ink-muted'}`}>{s}</span>
              {i < campaignSteps.length - 1 && <div className="w-3 h-px bg-surface-inset" />}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 0 && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-ink-secondary">Title *</span>
                <input
                  value={form.title}
                  onChange={e => update('title', e.target.value)}
                  className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 bg-surface text-ink focus:outline-none focus:border-status-rejected"
                  placeholder="e.g. Best Project Award 2026"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-secondary">Description</span>
                <textarea
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  rows={3}
                  className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 bg-surface text-ink focus:outline-none focus:border-status-rejected resize-none"
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-ink-secondary">Voting Opens</span>
                <input
                  type="datetime-local"
                  value={form.votingStart}
                  onChange={e => update('votingStart', e.target.value)}
                  className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 bg-surface text-ink focus:outline-none focus:border-status-rejected"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-secondary">Voting Closes</span>
                <input
                  type="datetime-local"
                  value={form.votingEnd}
                  onChange={e => update('votingEnd', e.target.value)}
                  className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 bg-surface text-ink focus:outline-none focus:border-status-rejected"
                />
              </label>
            </>
          )}
          {step === 2 && (
            <div className="text-sm text-ink-muted py-4">
              Eligibility rules (year, section, event registration) would be configured here.
            </div>
          )}
          {step === 3 && (
            <div className="text-sm text-ink-muted py-4">
              Candidate selector. Pick from registered students with approved profiles.
            </div>
          )}
          {step === 4 && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-ink-secondary">Votes Per Person</span>
                <input
                  type="number"
                  min={1}
                  value={form.votesPerPerson}
                  onChange={e => update('votesPerPerson', +e.target.value)}
                  className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 bg-surface text-ink focus:outline-none focus:border-status-rejected"
                />
              </label>
              <label className="flex items-center gap-3 mt-2">
                <input
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={e => update('anonymous', e.target.checked)}
                  className="w-4 h-4 accent-status-rejected"
                />
                <span className="text-sm text-ink font-semibold">Anonymous voting (voters not disclosed)</span>
              </label>
            </>
          )}
          {step === 5 && (
            <div className="bg-surface-canvas rounded-xl p-4 space-y-2 text-sm">
              <div><span className="font-bold">Title:</span> {form.title || 'Not set'}</div>
              <div><span className="font-bold">Voting Period:</span> {form.votingStart || 'Not set'} → {form.votingEnd || 'Not set'}</div>
              <div><span className="font-bold">Votes per person:</span> {form.votesPerPerson}</div>
              <div><span className="font-bold">Anonymous:</span> {form.anonymous ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
        <div className="flex justify-between p-5 border-t border-edge">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="text-xs font-bold text-ink-muted disabled:opacity-30 cursor-pointer"
          >
            ← Back
          </button>
          {step < campaignSteps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 bg-surface-inverse text-ink-inverse rounded-lg text-xs font-bold cursor-pointer"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={submitting || !form.title}
              className="px-5 py-2 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

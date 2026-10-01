import React, { useState, useEffect } from 'react';
import { Vote, Plus, CheckCircle, XCircle, BarChart3, Loader2, AlertCircle, X } from 'lucide-react';
import { adminApi } from '../services/api';

interface Campaign {
  id: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'FINALIZED';
  votingStart: string;
  votingEnd: string;
  totalVotes: number;
  candidateCount: number;
  eventTitle?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; icon: React.FC<{ className?: string }> }> = {
    DRAFT: { label: 'Draft', cls: 'bg-surface-canvas text-ink-secondary border-edge', icon: () => <span className="w-2 h-2 rounded-full bg-surface-inset inline-block mr-1" /> },
    ACTIVE: { label: 'Active', cls: 'bg-status-bg-approved text-status-approved border-edge', icon: () => <span className="w-2 h-2 rounded-full bg-status-approved inline-block mr-1 animate-pulse" /> },
    CLOSED: { label: 'Closed', cls: 'bg-status-bg-pending text-status-pending border-edge', icon: () => <span className="w-2 h-2 rounded-full bg-surface-sunken inline-block mr-1" /> },
    FINALIZED: { label: 'Finalized', cls: 'bg-status-bg-approved text-status-approved border-edge', icon: () => <CheckCircle className="w-3 h-3 mr-1" /> },
  };
  const s = map[status] ?? map.DRAFT;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      <Icon className="w-2 h-2" />{s.label}
    </span>
  );
};

const campaignSteps = ['Name & Event', 'Voting Period', 'Eligibility', 'Candidates', 'Rules', 'Review'];

const CreateCampaignWizard: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', votingStart: '', votingEnd: '', votesPerPerson: 1, anonymous: false });
  const update = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setSubmitting(true);
    try { await adminApi.createVotingCampaign?.(form); onCreated(); onClose(); }
    catch { /* noop */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-on-primary/40 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 className="text-base font-extrabold text-ink">Create Voting Campaign</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {/* Progress */}
        <div className="flex px-5 pt-4 gap-1 overflow-x-auto">
          {campaignSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < step ? 'bg-status-solid-approved text-on-primary' : i === step ? 'bg-status-solid-rejected text-on-primary' : 'bg-surface-inset text-ink-muted'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-semibold ${i === step ? 'text-ink' : 'text-ink-muted'}`}>{s}</span>
              {i < campaignSteps.length - 1 && <div className="w-3 h-px bg-surface-inset" />}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 0 && (
            <>
              <label className="block"><span className="text-xs font-bold text-ink-secondary uppercase">Title *</span>
                <input value={form.title} onChange={e => update('title', e.target.value)} className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected" placeholder="e.g. Best Project Award 2026" />
              </label>
              <label className="block"><span className="text-xs font-bold text-ink-secondary uppercase">Description</span>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected resize-none" />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label className="block"><span className="text-xs font-bold text-ink-secondary uppercase">Voting Opens</span>
                <input type="datetime-local" value={form.votingStart} onChange={e => update('votingStart', e.target.value)} className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected" />
              </label>
              <label className="block"><span className="text-xs font-bold text-ink-secondary uppercase">Voting Closes</span>
                <input type="datetime-local" value={form.votingEnd} onChange={e => update('votingEnd', e.target.value)} className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected" />
              </label>
            </>
          )}
          {step === 2 && <div className="text-sm text-ink-muted py-4">Eligibility rules (year, section, event registration) would be configured here.</div>}
          {step === 3 && <div className="text-sm text-ink-muted py-4">Candidate selector. Pick from registered students with approved profiles.</div>}
          {step === 4 && (
            <>
              <label className="block"><span className="text-xs font-bold text-ink-secondary uppercase">Votes Per Person</span>
                <input type="number" min={1} value={form.votesPerPerson} onChange={e => update('votesPerPerson', +e.target.value)} className="mt-1 w-full text-sm border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected" />
              </label>
              <label className="flex items-center gap-3 mt-2">
                <input type="checkbox" checked={form.anonymous} onChange={e => update('anonymous', e.target.checked)} className="w-4 h-4 accent-status-rejected" />
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
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-xs font-bold text-ink-muted disabled:opacity-30 cursor-pointer">← Back</button>
          {step < campaignSteps.length - 1
            ? <button onClick={() => setStep(step + 1)} className="px-5 py-2 bg-surface-inverse text-ink-inverse rounded-lg text-xs font-bold cursor-pointer">Next →</button>
            : <button onClick={handleCreate} disabled={submitting || !form.title} className="px-5 py-2 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Campaign
              </button>}
        </div>
      </div>
    </div>
  );
};

export const VotingManagement: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.getVotingCampaigns?.() ?? { campaigns: [] };
      setCampaigns(res.campaigns ?? []);
    } catch { setError('Failed to load campaigns.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleActivate = async (id: string) => {
    if (!confirm('Activate this voting campaign? Students will be able to vote immediately.')) return;
    setActivating(id);
    try { await adminApi.activateVotingCampaign?.(id); fetchCampaigns(); }
    catch { /* noop */ }
    finally { setActivating(null); }
  };

  const handleClose = async (id: string) => {
    if (!confirm('Close this campaign? No more votes will be accepted.')) return;
    try { await adminApi.closeVotingCampaign?.(id); fetchCampaigns(); }
    catch { /* noop */ }
  };

  return (
    <div className="space-y-6">
      {showCreate && <CreateCampaignWizard onClose={() => setShowCreate(false)} onCreated={fetchCampaigns} />}
      <div className="flex items-center justify-between pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <Vote className="w-6 h-6 text-status-rejected" />
          <div>
            <h1 className="text-xl font-extrabold text-ink">Voting Management</h1>
            <p className="text-xs text-ink-muted">Create and manage voting campaigns</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold hover:bg-brand cursor-pointer">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-surface rounded-2xl border border-edge">
          <Loader2 className="w-7 h-7 animate-spin text-status-rejected" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 justify-center h-48 bg-surface rounded-2xl border border-edge">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-surface rounded-2xl border border-edge gap-3">
          <Vote className="w-10 h-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink-muted">No campaigns yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-surface rounded-2xl border border-edge p-5 flex items-center gap-6 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-sm font-extrabold text-ink truncate">{c.title}</h3>
                  <StatusBadge status={c.status} />
                </div>
                {c.eventTitle && <p className="text-xs text-ink-muted mb-2">Event: {c.eventTitle}</p>}
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                  <span className="flex items-center gap-1"><Vote className="w-3.5 h-3.5" /> {c.totalVotes} votes</span>
                  <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {c.candidateCount} candidates</span>
                  {c.votingStart && <span>Opens: {new Date(c.votingStart).toLocaleString()}</span>}
                  {c.votingEnd && <span>Closes: {new Date(c.votingEnd).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.status === 'DRAFT' && (
                  <button onClick={() => handleActivate(c.id)} disabled={activating === c.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-status-solid-approved text-on-primary rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50">
                    {activating === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Activate
                  </button>
                )}
                {c.status === 'ACTIVE' && (
                  <button onClick={() => handleClose(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-status-solid-pending text-on-primary rounded-lg text-xs font-bold hover:bg-status-solid-pending cursor-pointer">
                    <XCircle className="w-3.5 h-3.5" /> Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

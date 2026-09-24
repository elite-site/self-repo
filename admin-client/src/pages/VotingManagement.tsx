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
    DRAFT: { label: 'Draft', cls: 'bg-slate-50 text-slate-600 border-slate-200', icon: () => <span className="w-2 h-2 rounded-full bg-slate-400 inline-block mr-1" /> },
    ACTIVE: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: () => <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1 animate-pulse" /> },
    CLOSED: { label: 'Closed', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: () => <span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" /> },
    FINALIZED: { label: 'Finalized', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: () => <CheckCircle className="w-3 h-3 mr-1" /> },
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <h2 className="text-base font-extrabold text-[#0B192C]">Create Voting Campaign</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-[#0B192C] cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {/* Progress */}
        <div className="flex px-5 pt-4 gap-1 overflow-x-auto">
          {campaignSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-[#DC2626] text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-semibold ${i === step ? 'text-[#0B192C]' : 'text-neutral-400'}`}>{s}</span>
              {i < campaignSteps.length - 1 && <div className="w-3 h-px bg-neutral-200" />}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 0 && (
            <>
              <label className="block"><span className="text-xs font-bold text-neutral-700 uppercase">Title *</span>
                <input value={form.title} onChange={e => update('title', e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" placeholder="e.g. Best Project Award 2026" />
              </label>
              <label className="block"><span className="text-xs font-bold text-neutral-700 uppercase">Description</span>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626] resize-none" />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label className="block"><span className="text-xs font-bold text-neutral-700 uppercase">Voting Opens</span>
                <input type="datetime-local" value={form.votingStart} onChange={e => update('votingStart', e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
              </label>
              <label className="block"><span className="text-xs font-bold text-neutral-700 uppercase">Voting Closes</span>
                <input type="datetime-local" value={form.votingEnd} onChange={e => update('votingEnd', e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
              </label>
            </>
          )}
          {step === 2 && <div className="text-sm text-neutral-500 py-4">Eligibility rules (year, section, event registration) would be configured here.</div>}
          {step === 3 && <div className="text-sm text-neutral-500 py-4">Candidate selector — pick from registered students with approved profiles.</div>}
          {step === 4 && (
            <>
              <label className="block"><span className="text-xs font-bold text-neutral-700 uppercase">Votes Per Person</span>
                <input type="number" min={1} value={form.votesPerPerson} onChange={e => update('votesPerPerson', +e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
              </label>
              <label className="flex items-center gap-3 mt-2">
                <input type="checkbox" checked={form.anonymous} onChange={e => update('anonymous', e.target.checked)} className="w-4 h-4 accent-[#DC2626]" />
                <span className="text-sm text-[#0B192C] font-semibold">Anonymous voting (voters not disclosed)</span>
              </label>
            </>
          )}
          {step === 5 && (
            <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-2 text-sm">
              <div><span className="font-bold">Title:</span> {form.title || '—'}</div>
              <div><span className="font-bold">Voting Period:</span> {form.votingStart || '—'} → {form.votingEnd || '—'}</div>
              <div><span className="font-bold">Votes per person:</span> {form.votesPerPerson}</div>
              <div><span className="font-bold">Anonymous:</span> {form.anonymous ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
        <div className="flex justify-between p-5 border-t border-[#E2E8F0]">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-xs font-bold text-neutral-500 disabled:opacity-30 cursor-pointer">← Back</button>
          {step < campaignSteps.length - 1
            ? <button onClick={() => setStep(step + 1)} className="px-5 py-2 bg-[#0B192C] text-white rounded-lg text-xs font-bold cursor-pointer">Next →</button>
            : <button onClick={handleCreate} disabled={submitting || !form.title} className="px-5 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer">
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Vote className="w-6 h-6 text-[#DC2626]" />
          <div>
            <h1 className="text-xl font-extrabold text-[#0B192C]">Voting Management</h1>
            <p className="text-xs text-neutral-500">Create and manage voting campaigns</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-[#E2E8F0]">
          <Loader2 className="w-7 h-7 animate-spin text-[#DC2626]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 justify-center h-48 bg-white rounded-2xl border border-red-100">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-[#E2E8F0] gap-3">
          <Vote className="w-10 h-10 text-neutral-200" />
          <p className="text-sm font-semibold text-neutral-500">No campaigns yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-sm font-extrabold text-[#0B192C] truncate">{c.title}</h3>
                  <StatusBadge status={c.status} />
                </div>
                {c.eventTitle && <p className="text-xs text-neutral-400 mb-2">Event: {c.eventTitle}</p>}
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><Vote className="w-3.5 h-3.5" /> {c.totalVotes} votes</span>
                  <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {c.candidateCount} candidates</span>
                  {c.votingStart && <span>Opens: {new Date(c.votingStart).toLocaleString()}</span>}
                  {c.votingEnd && <span>Closes: {new Date(c.votingEnd).toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.status === 'DRAFT' && (
                  <button onClick={() => handleActivate(c.id)} disabled={activating === c.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-50">
                    {activating === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Activate
                  </button>
                )}
                {c.status === 'ACTIVE' && (
                  <button onClick={() => handleClose(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 cursor-pointer">
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

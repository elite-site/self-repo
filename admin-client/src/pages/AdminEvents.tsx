import React, { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, Pencil, Copy, Archive, Eye, Users,
  AlertCircle, Loader2, CheckCircle, X
} from 'lucide-react';
import { adminApi } from '../services/api';

interface EventItem {
  id: string;
  title: string;
  type: string;
  status: string;
  registrationStart: string;
  registrationEnd: string;
  eventDate: string;
  registrationCount: number;
  eligibility?: string;
  description?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    PUBLISHED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    OPEN: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    CLOSED: 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    ARCHIVED: 'bg-neutral-50 dark:bg-neutral-900/50 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
};

const steps = ['Basics', 'Dates', 'Eligibility', 'Form', 'Teams', 'Notifications', 'Review'];

const CreateEventWizard: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', type: 'HACKATHON',
    registrationStart: '', registrationEnd: '', eventDate: '',
    eligibilityYears: [] as string[], minCompletion: 0,
    teamEnabled: false, teamMin: 1, teamMax: 4,
    notifyOnOpen: true, notifyReminder: true,
  });

  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await adminApi.createEvent?.(form);
      onCreated();
      onClose();
    } catch {
      // handle
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <h2 className="text-base font-extrabold text-[#0B192C]">Create Event</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-[#0B192C] cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 pt-4 gap-1 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-[#DC2626] text-white' : 'bg-neutral-200 text-neutral-500'
              }`}>
                {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold ${i === step ? 'text-[#0B192C]' : 'text-neutral-400'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-4 h-px ${i < step ? 'bg-emerald-300' : 'bg-neutral-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 0 && (
            <>
              <label className="block">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Title *</span>
                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Event title" className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Description</span>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626] resize-none" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Event Type</span>
                <select value={form.type} onChange={e => update('type', e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]">
                  {['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'].map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
            </>
          )}
          {step === 1 && (
            <>
              {(['registrationStart', 'registrationEnd', 'eventDate'] as const).map((field) => (
                <label key={field} className="block">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <input type="datetime-local" value={form[field]} onChange={e => update(field, e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
                </label>
              ))}
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Eligible Years</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['1', '2', '3', '4'].map(y => (
                    <button key={y} onClick={() => update('eligibilityYears', form.eligibilityYears.includes(y) ? form.eligibilityYears.filter(e => e !== y) : [...form.eligibilityYears, y])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${form.eligibilityYears.includes(y) ? 'bg-[#DC2626] text-white border-[#DC2626]' : 'border-[#E2E8F0] text-neutral-500'}`}>
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Min Profile Completion %</span>
                <input type="number" min={0} max={100} value={form.minCompletion} onChange={e => update('minCompletion', +e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
              </label>
            </>
          )}
          {step === 3 && (
            <div className="text-center py-8 text-neutral-400">
              <p className="text-sm">Registration form builder (drag-and-drop fields) would appear here in full implementation.</p>
            </div>
          )}
          {step === 4 && (
            <>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.teamEnabled} onChange={e => update('teamEnabled', e.target.checked)} className="w-4 h-4 rounded accent-[#DC2626]" />
                <span className="text-sm font-semibold text-[#0B192C]">Enable Team Registration</span>
              </label>
              {form.teamEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-700">Min Members</span>
                    <input type="number" min={1} value={form.teamMin} onChange={e => update('teamMin', +e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-700">Max Members</span>
                    <input type="number" min={1} value={form.teamMax} onChange={e => update('teamMax', +e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
                  </label>
                </div>
              )}
            </>
          )}
          {step === 5 && (
            <>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.notifyOnOpen} onChange={e => update('notifyOnOpen', e.target.checked)} className="w-4 h-4 rounded accent-[#DC2626]" />
                <span className="text-sm font-semibold text-[#0B192C]">Notify students when registration opens</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.notifyReminder} onChange={e => update('notifyReminder', e.target.checked)} className="w-4 h-4 rounded accent-[#DC2626]" />
                <span className="text-sm font-semibold text-[#0B192C]">Send reminder before deadline</span>
              </label>
            </>
          )}
          {step === 6 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#0B192C]">Review</h3>
              <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-2 text-sm">
                <div><span className="font-semibold">Title:</span> {form.title || '—'}</div>
                <div><span className="font-semibold">Type:</span> {form.type}</div>
                <div><span className="font-semibold">Event Date:</span> {form.eventDate || '—'}</div>
                <div><span className="font-semibold">Registration:</span> {form.registrationStart || '—'} → {form.registrationEnd || '—'}</div>
                <div><span className="font-semibold">Teams:</span> {form.teamEnabled ? `Yes (${form.teamMin}–${form.teamMax})` : 'No'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[#E2E8F0]">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-4 py-2 text-xs font-bold text-neutral-500 hover:text-[#0B192C] disabled:opacity-30 cursor-pointer">
            ← Back
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="px-5 py-2 bg-[#0B192C] text-white rounded-lg text-xs font-bold hover:bg-[#0B192C]/90 cursor-pointer">
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !form.title} className="px-5 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Publish Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getEvents();
      const mapped: EventItem[] = (res.events || []).map((e: any) => ({
        id: e.id,
        title: e.name || e.title || 'Untitled Event',
        type: e.type || 'GENERAL',
        status: e.status || 'OPEN',
        registrationStart: e.createdAt,
        registrationEnd: e.createdAt,
        eventDate: e.createdAt,
        registrationCount: e.registrationCount || 0,
      }));
      setEvents(mapped);
    } catch {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  return (
    <div className="space-y-6">
      {showCreate && <CreateEventWizard onClose={() => setShowCreate(false)} onCreated={fetchEvents} />}

      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-[#DC2626]" />
          <div>
            <h1 className="text-xl font-extrabold text-[#0B192C] dark:text-white">Events</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage all department events</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer">
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800">
          <Loader2 className="w-7 h-7 animate-spin text-[#DC2626]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-neutral-900 rounded-2xl border border-red-200 dark:border-red-900/50 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
          <button onClick={fetchEvents} className="text-xs text-[#DC2626] font-semibold hover:underline cursor-pointer">Retry</button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 gap-3">
          <CalendarDays className="w-10 h-10 text-neutral-200 dark:text-neutral-700" />
          <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">No events yet</p>
          <button onClick={() => setShowCreate(true)} className="text-xs text-[#DC2626] font-semibold hover:underline cursor-pointer">Create your first event</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-[#E2E8F0] dark:border-neutral-800 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-neutral-800/80 border-b border-[#E2E8F0] dark:border-neutral-700">
              <tr>
                {['Event', 'Type', 'Event Date', 'Registration', 'Registrations', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-neutral-800">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-[#F8FAFC] dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#0B192C] dark:text-white">{ev.title}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{ev.type}</td>
                  <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">{ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                    {ev.registrationStart ? new Date(ev.registrationStart).toLocaleDateString() : '—'} →{' '}
                    {ev.registrationEnd ? new Date(ev.registrationEnd).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                      {ev.registrationCount}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button title="Edit" className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"><Pencil className="w-3.5 h-3.5 text-neutral-400" /></button>
                      <button title="Duplicate" className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"><Copy className="w-3.5 h-3.5 text-neutral-400" /></button>
                      <button title="View" className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"><Eye className="w-3.5 h-3.5 text-neutral-400" /></button>
                      <button title="Archive" className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"><Archive className="w-3.5 h-3.5 text-neutral-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

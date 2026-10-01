import React, { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, Pencil, Copy, Archive, Eye, Users,
  AlertCircle, Loader2, CheckCircle, X, ChevronLeft, ChevronRight
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
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: 'Draft', cls: 'badge badge-draft' },
    PUBLISHED: { label: 'Published', cls: 'badge badge-approved' },
    OPEN: { label: 'Open', cls: 'badge badge-approved' },
    CLOSED: { label: 'Closed', cls: 'badge badge-draft' },
    ARCHIVED: { label: 'Archived', cls: 'badge badge-draft' },
  };
  const s = map[status] ?? { label: status, cls: 'badge badge-draft' };
  return <span className={s.cls}>{s.label}</span>;
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
    <div className="fixed inset-0 z-modal bg-on-primary/40 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div className="surface w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-modal animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 id="wizard-title" className="text-headline-sm font-extrabold text-ink">Create Event</h2>
          <button onClick={onClose} className="btn btn-ghost p-2" aria-label="Close wizard">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 pt-4 gap-1 overflow-x-auto border-b border-edge bg-surface-sunken" role="navigation" aria-label="Wizard steps">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-label-sm font-bold ${
                i < step ? 'bg-status-approved text-on-primary' : i === step ? 'bg-brand text-on-primary' : 'bg-surface-sunken text-ink-muted border border-edge'
              }`}>
                {i < step ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
              </div>
              <span className={`text-label-sm font-semibold ${i === step ? 'text-ink' : 'text-ink-muted'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-4 h-px ${i < step ? 'bg-status-approved' : 'border-edge'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 0 && (
            <>
              <label htmlFor="event-title" className="block">
                <span className="label">Title *</span>
                <input id="event-title" value={form.title} onChange={e => update('title', e.target.value)} placeholder="Event title" className="input" aria-required="true" />
              </label>
              <label htmlFor="event-description" className="block">
                <span className="label">Description</span>
                <textarea id="event-description" value={form.description} onChange={e => update('description', e.target.value)} rows={4} className="textarea resize-none" />
              </label>
              <label htmlFor="event-type" className="block">
                <span className="label">Event Type</span>
                <select id="event-type" value={form.type} onChange={e => update('type', e.target.value)} className="select">
                  {['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'].map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
            </>
          )}
          {step === 1 && (
            <>
              {(['registrationStart', 'registrationEnd', 'eventDate'] as const).map((field) => (
                <label key={field} htmlFor={field} className="block">
                  <span className="label">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <input type="datetime-local" id={field} value={form[field]} onChange={e => update(field, e.target.value)} className="input" />
                </label>
              ))}
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <span className="label">Eligible Years</span>
                <div className="flex gap-2 mt-2 flex-wrap" role="group" aria-label="Eligible years">
                  {['1', '2', '3', '4'].map(y => (
                    <button key={y} onClick={() => update('eligibilityYears', form.eligibilityYears.includes(y) ? form.eligibilityYears.filter(e => e !== y) : [...form.eligibilityYears, y])}
                      className={`btn ${form.eligibilityYears.includes(y) ? 'btn-primary' : 'btn-secondary'} text-label-sm`}
                      aria-pressed={form.eligibilityYears.includes(y)}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>
              <label htmlFor="min-completion" className="block">
                <span className="label">Min Profile Completion %</span>
                <input type="number" id="min-completion" min={0} max={100} value={form.minCompletion} onChange={e => update('minCompletion', +e.target.value)} className="input" />
              </label>
            </>
          )}
          {step === 3 && (
            <div className="text-center py-8 text-ink-muted surface-sunken rounded-lg">
              <p className="text-body-sm">Registration form builder (drag-and-drop fields) would appear here in full implementation.</p>
            </div>
          )}
          {step === 4 && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.teamEnabled} onChange={e => update('teamEnabled', e.target.checked)} className="w-4 h-4 rounded border-edge text-brand focus:ring-brand" />
                <span className="text-body-md font-semibold text-ink">Enable Team Registration</span>
              </label>
              {form.teamEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <label htmlFor="team-min" className="block">
                    <span className="label">Min Members</span>
                    <input type="number" id="team-min" min={1} value={form.teamMin} onChange={e => update('teamMin', +e.target.value)} className="input" />
                  </label>
                  <label htmlFor="team-max" className="block">
                    <span className="label">Max Members</span>
                    <input type="number" id="team-max" min={1} value={form.teamMax} onChange={e => update('teamMax', +e.target.value)} className="input" />
                  </label>
                </div>
              )}
            </>
          )}
          {step === 5 && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.notifyOnOpen} onChange={e => update('notifyOnOpen', e.target.checked)} className="w-4 h-4 rounded border-edge text-brand focus:ring-brand" />
                <span className="text-body-md font-semibold text-ink">Notify students when registration opens</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.notifyReminder} onChange={e => update('notifyReminder', e.target.checked)} className="w-4 h-4 rounded border-edge text-brand focus:ring-brand" />
                <span className="text-body-md font-semibold text-ink">Send reminder before deadline</span>
              </label>
            </>
          )}
          {step === 6 && (
            <div className="space-y-3">
              <h3 className="text-label-md font-bold text-ink">Review</h3>
              <div className="surface-sunken rounded-lg p-4 space-y-2 text-body-sm">
                <div><span className="font-semibold text-ink-secondary">Title:</span> <span className="text-ink ml-2">{form.title || 'To be announced'}</span></div>
                <div><span className="font-semibold text-ink-secondary">Type:</span> <span className="text-ink ml-2">{form.type}</span></div>
                <div><span className="font-semibold text-ink-secondary">Event Date:</span> <span className="text-ink ml-2">{form.eventDate || 'To be announced'}</span></div>
                <div><span className="font-semibold text-ink-secondary">Registration:</span> <span className="text-ink ml-2">{form.registrationStart || 'To be announced'} → {form.registrationEnd || 'To be announced'}</span></div>
                <div><span className="font-semibold text-ink-secondary">Teams:</span> <span className="text-ink ml-2">{form.teamEnabled ? `Yes (${form.teamMin}–${form.teamMax})` : 'No'}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-edge bg-surface-sunken">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn btn-ghost text-label-sm" aria-label="Previous step" aria-disabled={step === 0}>
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="btn btn-secondary text-label-sm">
              Next <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !form.title} className="btn btn-primary text-label-sm" aria-busy={submitting}>
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
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
    <div className="space-y-6 page-enter">
      {showCreate && <CreateEventWizard onClose={() => setShowCreate(false)} onCreated={fetchEvents} />}

      <div className="flex items-center justify-between pb-2 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
            <CalendarDays className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-headline-md font-extrabold text-ink">Events</h1>
            <p className="text-body-sm text-ink-muted">Manage all department events</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" aria-hidden="true" /> Create Event
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 surface-sunken">
          <Loader2 className="w-7 h-7 animate-spin text-brand" aria-hidden="true" />
          <span className="sr-only">Loading events</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 surface-sunken gap-3 text-center" role="alert">
          <AlertCircle className="w-8 h-8 text-status-rejected" aria-hidden="true" />
          <p className="text-body-sm text-ink-muted">{error}</p>
          <button onClick={fetchEvents} className="text-body-sm font-semibold text-brand hover:underline cursor-pointer">Retry</button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 surface-sunken gap-3 text-center">
          <CalendarDays className="w-10 h-10 text-ink-muted" aria-hidden="true" />
          <p className="text-body-md font-semibold text-ink-secondary">No events yet</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-ghost text-body-sm">Create your first event</button>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="grid">
              <thead className="bg-surface-inset border-b border-edge">
                <tr>
                  {['Event', 'Type', 'Event Date', 'Registration', 'Registrations', 'Status', 'Actions'].map(h => (
                    <th key={h} scope="col" className="text-left px-4 py-3 text-label-sm font-bold text-ink-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink">{ev.title}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-muted">{ev.type}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-secondary">{ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : 'To be announced'}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-secondary">
                      {ev.registrationStart ? new Date(ev.registrationStart).toLocaleDateString() : 'To be announced'} →{' '}
                      {ev.registrationEnd ? new Date(ev.registrationEnd).toLocaleDateString() : 'To be announced'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-label-sm font-semibold text-ink-secondary">
                        <Users className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                        {ev.registrationCount}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" role="group" aria-label="Event actions">
                        <button title="Edit" className="btn btn-ghost p-2" aria-label="Edit event"><Pencil className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <button title="Duplicate" className="btn btn-ghost p-2" aria-label="Duplicate event"><Copy className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <button title="View" className="btn btn-ghost p-2" aria-label="View event"><Eye className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <button title="Archive" className="btn btn-ghost p-2" aria-label="Archive event"><Archive className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

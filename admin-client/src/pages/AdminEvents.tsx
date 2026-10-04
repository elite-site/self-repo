import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Plus, Users,
  AlertCircle, Loader2, CheckCircle, X, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { adminApi } from '../services/api';
import { EventItem, EventPayload } from '../types';
import { formatDate, formatRegistrationRange } from '../utils/formatDate';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: 'Draft', cls: 'badge badge-draft' },
    OPEN: { label: 'Open', cls: 'badge badge-approved' },
    CLOSED: { label: 'Closed', cls: 'badge badge-draft' },
    ARCHIVED: { label: 'Archived', cls: 'badge badge-draft' },
  };
  const s = map[status] ?? { label: status, cls: 'badge badge-draft' };
  return <span className={s.cls}>{s.label}</span>;
};

const steps = ['Basics', 'Dates', 'Eligibility', 'Form', 'Teams', 'Notifications', 'Review'];

const EVENT_TYPES = ['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'];

const EVENT_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  HACKATHON: 'Hackathon',
  WORKSHOP: 'Workshop',
  COMPETITION: 'Competition',
  SEMINAR: 'Seminar',
  OTHER: 'Other',
};

const formatEventType = (type?: string | null): string => {
  if (!type) return 'General';
  const upper = type.toUpperCase();
  if (EVENT_TYPE_LABELS[upper]) return EVENT_TYPE_LABELS[upper];
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

const DEPENDENT_LABELS: Record<string, string> = {
  registrations: 'Registrations',
  submissions: 'Submissions',
  formFields: 'Registration form fields',
  teams: 'Teams',
  votes: 'Votes cast',
  emailLogs: 'Email log entries',
};

/** ISO timestamp -> the `YYYY-MM-DDTHH:mm` string a `datetime-local` input needs. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface FormState {
  name: string;
  description: string;
  type: string;
  year: number;
  registrationStart: string;
  registrationEnd: string;
  eventDate: string;
  eligibilityYears: string[];
  minCompletion: number;
  teamEnabled: boolean;
  teamMin: number;
  teamMax: number;
  notifyOnOpen: boolean;
  notifyReminder: boolean;
}

const emptyForm: FormState = {
  name: '', description: '', type: 'HACKATHON', year: new Date().getFullYear(),
  registrationStart: '', registrationEnd: '', eventDate: '',
  eligibilityYears: [], minCompletion: 0,
  teamEnabled: false, teamMin: 1, teamMax: 4,
  notifyOnOpen: true, notifyReminder: true,
};

const fromEvent = (e: EventItem): FormState => ({
  name: e.name,
  description: e.description ?? '',
  type: e.type || 'GENERAL',
  year: e.year ?? new Date().getFullYear(),
  registrationStart: toLocalInput(e.registrationStart),
  registrationEnd: toLocalInput(e.registrationEnd),
  eventDate: toLocalInput(e.eventDate),
  eligibilityYears: (e.eligibilityYears ?? []).map(String),
  minCompletion: e.minCompletion ?? 0,
  teamEnabled: e.teamEnabled ?? false,
  teamMin: e.teamMin ?? 1,
  teamMax: e.teamMax ?? 4,
  notifyOnOpen: e.notifyOnOpen ?? true,
  notifyReminder: e.notifyReminder ?? true,
});

const EventWizard: React.FC<{
  onClose: () => void;
  onSaved: () => void;
  existing?: EventItem;
  notify: (message: string, type?: 'success' | 'error') => void;
}> = ({ onClose, onSaved, existing, notify }) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(existing ? fromEvent(existing) : emptyForm);

  const update = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload: EventPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      year: form.year,
      status: existing ? existing.status : 'DRAFT',
      registrationStart: form.registrationStart || null,
      registrationEnd: form.registrationEnd || null,
      eventDate: form.eventDate || null,
      eligibilityYears: form.eligibilityYears.map(Number),
      minCompletion: form.minCompletion,
      teamEnabled: form.teamEnabled,
      teamMin: form.teamMin,
      teamMax: form.teamMax,
      notifyOnOpen: form.notifyOnOpen,
      notifyReminder: form.notifyReminder,
    };
    try {
      if (existing) {
        await adminApi.updateEvent(existing.id, payload);
        notify('Event saved.');
      } else {
        await adminApi.createEvent(payload);
        notify(`${payload.name} created.`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Could not save the event.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div className="surface bg-surface text-ink w-full max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col shadow-modal animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 id="wizard-title" className="text-headline-sm font-semibold text-ink">
            {existing ? 'Edit event' : 'Create event'}
          </h2>
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
                <input id="event-title" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Event title" className="input" aria-required="true" />
              </label>
              <label htmlFor="event-description" className="block">
                <span className="label">Description</span>
                <textarea id="event-description" value={form.description} onChange={e => update('description', e.target.value)} rows={4} className="textarea resize-none" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label htmlFor="event-type" className="block">
                  <span className="label">Event Type</span>
                  <select id="event-type" value={form.type} onChange={e => update('type', e.target.value)} className="select">
                    {EVENT_TYPES.map(t => (
                      <option key={t} value={t}>
                        {EVENT_TYPE_LABELS[t] || t}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="event-year" className="block">
                  <span className="label">Year</span>
                  <input type="number" id="event-year" min={2000} max={2100} value={form.year} onChange={e => update('year', +e.target.value)} className="input" />
                </label>
              </div>
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
                <p className="text-label-sm text-ink-muted mt-2">Leave all unselected to allow every year.</p>
              </div>
              <label htmlFor="min-completion" className="block">
                <span className="label">Min Profile Completion %</span>
                <input type="number" id="min-completion" min={0} max={100} value={form.minCompletion} onChange={e => update('minCompletion', +e.target.value)} className="input" />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-body-sm text-ink-secondary">
                Registration questions can be added after the event is created, from the event detail view.
              </p>
            </>
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
                    <input type="number" id="team-min" min={1} max={20} value={form.teamMin} onChange={e => update('teamMin', +e.target.value)} className="input" />
                  </label>
                  <label htmlFor="team-max" className="block">
                    <span className="label">Max Members</span>
                    <input type="number" id="team-max" min={1} max={20} value={form.teamMax} onChange={e => update('teamMax', +e.target.value)} className="input" />
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
                <div><span className="font-semibold text-ink-secondary">Title:</span> <span className="text-ink ml-2">{form.name || '—'}</span></div>
                <div><span className="font-semibold text-ink-secondary">Type:</span> <span className="text-ink ml-2">{formatEventType(form.type)}</span></div>
                <div><span className="font-semibold text-ink-secondary">Event Date:</span> <span className="text-ink ml-2">{formatDate(form.eventDate)}</span></div>
                <div><span className="font-semibold text-ink-secondary">Registration:</span> <span className="text-ink ml-2">{formatRegistrationRange(form.registrationStart, form.registrationEnd)}</span></div>
                <div><span className="font-semibold text-ink-secondary">Eligible years:</span> <span className="text-ink ml-2">{form.eligibilityYears.length ? form.eligibilityYears.join(', ') : 'All years'}</span></div>
                <div><span className="font-semibold text-ink-secondary">Teams:</span> <span className="text-ink ml-2">{form.teamEnabled ? `Yes (${form.teamMin}-${form.teamMax})` : 'No'}</span></div>
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
            <button onClick={handleSubmit} disabled={submitting || !form.name.trim()} className="btn btn-primary text-label-sm" aria-busy={submitting}>
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              {existing ? 'Save changes' : 'Create event'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const EventDetail: React.FC<{ event: EventItem; onClose: () => void }> = ({ event, onClose }) => (
  <div className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="detail-title">
    <div className="surface bg-surface text-ink w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col shadow-modal animate-scale-in">
      <div className="flex items-center justify-between p-5 border-b border-edge">
        <h2 id="detail-title" className="text-headline-sm font-semibold text-ink">{event.name}</h2>
        <button onClick={onClose} className="btn btn-ghost p-2" aria-label="Close details">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3 text-body-sm">
        {event.description && <p className="text-ink-secondary">{event.description}</p>}
        <div className="surface-sunken rounded-lg p-4 space-y-2">
          <div><span className="font-semibold text-ink-secondary">Status:</span> <span className="text-ink ml-2"><StatusBadge status={event.status} /></span></div>
          <div><span className="font-semibold text-ink-secondary">Type:</span> <span className="text-ink ml-2">{formatEventType(event.type)}</span></div>
          <div><span className="font-semibold text-ink-secondary">Year:</span> <span className="text-ink ml-2">{event.year}</span></div>
          <div><span className="font-semibold text-ink-secondary">Event date:</span> <span className="text-ink ml-2">{formatDate(event.eventDate)}</span></div>
          <div><span className="font-semibold text-ink-secondary">Registration:</span> <span className="text-ink ml-2">{formatRegistrationRange(event.registrationStart, event.registrationEnd)}</span></div>
          <div><span className="font-semibold text-ink-secondary">Eligible years:</span> <span className="text-ink ml-2">{event.eligibilityYears?.length ? event.eligibilityYears.join(', ') : 'All years'}</span></div>
          <div><span className="font-semibold text-ink-secondary">Min completion:</span> <span className="text-ink ml-2">{event.minCompletion ?? 0}%</span></div>
          <div><span className="font-semibold text-ink-secondary">Teams:</span> <span className="text-ink ml-2">{event.teamEnabled ? `${event.teamMin ?? 1}-${event.teamMax ?? 4} members` : 'Disabled'}</span></div>
          <div><span className="font-semibold text-ink-secondary">Notifications:</span> <span className="text-ink ml-2">{event.notifyOnOpen ? 'On open' : 'No open notice'}, {event.notifyReminder ? 'reminder on' : 'no reminder'}</span></div>
          <div><span className="font-semibold text-ink-secondary">Registrations:</span> <span className="text-ink ml-2">{event.registrationCount ?? 0}</span></div>
        </div>
      </div>
    </div>
  </div>
);

const ArchiveEventDialog: React.FC<{
  event: EventItem;
  onClose: () => void;
  onArchived: () => void;
  notify: (message: string, type?: 'success' | 'error') => void;
}> = ({ event, onClose, onArchived, notify }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.archiveEvent(event.id);
      notify(`Archived "${event.name}".`);
      onArchived();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not archive this event.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="archive-title">
      <div className="surface bg-surface text-ink w-full max-w-md overflow-hidden flex flex-col shadow-modal animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 id="archive-title" className="text-headline-sm font-semibold text-ink">Archive event</h2>
          <button onClick={onClose} disabled={busy} className="btn btn-ghost p-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-body-sm text-ink-secondary">
            Students will no longer be able to register for <span className="font-semibold text-ink">{event.name}</span>. Existing registrations, submissions and teams are kept.
          </p>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-status-rejected/30 bg-status-bg-rejected p-3 text-status-rejected text-xs" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-edge bg-surface-sunken">
          <button onClick={onClose} disabled={busy} className="btn btn-secondary text-xs">
            Cancel
          </button>
          <button onClick={confirm} disabled={busy} className="btn btn-primary text-xs flex items-center gap-1.5">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Archive event
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteEventDialog: React.FC<{
  event: EventItem;
  onClose: () => void;
  onDeleted: () => void;
  notify: (message: string, type?: 'success' | 'error') => void;
}> = ({ event, onClose, onDeleted, notify }) => {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDelete = async (force: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteEvent(event.id, force);
      notify(`Deleted "${event.name}".`);
      onDeleted();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.error === 'CONFIRMATION_REQUIRED') {
        setCounts(data.dependents || {});
      } else {
        setError("Couldn't delete this event. Nothing was deleted.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveInstead = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.archiveEvent(event.id);
      notify(`Archived "${event.name}".`);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not archive this event.');
    } finally {
      setBusy(false);
    }
  };

  const listed = counts
    ? Object.entries(counts).filter(([, n]) => (n as number) > 0)
    : [];

  return (
    <div
      className="fixed inset-0 z-modal bg-scrim flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-event-title"
    >
      <div className="surface bg-surface text-ink w-full max-w-md overflow-hidden flex flex-col shadow-modal animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 id="delete-event-title" className="text-headline-sm font-semibold text-ink">
            Delete event
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="btn btn-ghost p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-body-sm text-ink-secondary">
            Permanently delete <span className="font-semibold text-ink">{event.name}</span>?
          </p>

          {counts && (
            <div className="rounded-lg border border-status-rejected/30 bg-status-bg-rejected p-4 space-y-2">
              <p className="text-xs font-bold text-status-rejected">
                This will also permanently delete the following:
              </p>
              <ul className="space-y-1">
                {listed.map(([key, n]) => (
                  <li key={key} className="flex items-center justify-between text-xs text-status-rejected">
                    <span>{DEPENDENT_LABELS[key] ?? key}</span>
                    <span className="font-bold">{n}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-status-rejected pt-1 border-t border-status-rejected/20">
                This cannot be undone.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-status-rejected/30 bg-status-bg-rejected p-3 text-status-rejected text-xs" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{error}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => runDelete(counts !== null)}
                    disabled={busy}
                    className="underline font-semibold hover:opacity-80 cursor-pointer"
                  >
                    Try again
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleArchiveInstead}
                    disabled={busy}
                    className="underline font-semibold hover:opacity-80 cursor-pointer"
                  >
                    Archive instead
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-edge bg-surface-sunken">
          <button
            onClick={onClose}
            disabled={busy}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => runDelete(counts !== null)}
            disabled={busy}
            className="btn btn-danger text-xs flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {counts ? 'Delete anyway' : 'Delete event'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventItem | null | undefined>(undefined);
  const [viewing, setViewing] = useState<EventItem | null>(null);
  const [archiving, setArchiving] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 6000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getEvents();
      setEvents(res.events || []);
    } catch {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleDuplicate = async (ev: EventItem) => {
    setBusyId(ev.id);
    try {
      await adminApi.createEvent({
        ...fromEvent(ev),
        name: `${ev.name} (Copy)`,
        registrationStart: toLocalInput(ev.registrationStart) || null,
        registrationEnd: toLocalInput(ev.registrationEnd) || null,
        eventDate: toLocalInput(ev.eventDate) || null,
        eligibilityYears: ev.eligibilityYears ?? [],
        description: ev.description ?? undefined,
        status: 'DRAFT',
      } as EventPayload);
      notify(`Duplicated "${ev.name}".`);
      await fetchEvents();
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Could not duplicate the event.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-overlay text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-status-bg-rejected text-status-rejected border border-status-rejected/30'
              : 'bg-surface-inverse text-ink-inverse'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:opacity-75 rounded ml-2 text-current cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Wizard */}
      {editing !== undefined && (
        <EventWizard
          existing={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={fetchEvents}
          notify={notify}
        />
      )}

      {/* Details */}
      {viewing && <EventDetail event={viewing} onClose={() => setViewing(null)} />}

      {/* Archive Dialog */}
      {archiving && (
        <ArchiveEventDialog
          event={archiving}
          onClose={() => setArchiving(null)}
          onArchived={fetchEvents}
          notify={notify}
        />
      )}

      {/* Delete Dialog */}
      {deleting && (
        <DeleteEventDialog
          event={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={fetchEvents}
          notify={notify}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-edge">
        <div>
          <h1 className="text-headline-md font-semibold text-ink">Events</h1>
          <p className="text-body-sm text-ink-muted">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        <button onClick={() => setEditing(null)} className="btn btn-primary">
          <Plus className="w-4 h-4" aria-hidden="true" /> Create event
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
          <button onClick={() => setEditing(null)} className="btn btn-ghost text-body-sm">Create your first event</button>
        </div>
      ) : (
        <div className="surface">
          <div className="overflow-x-auto min-h-[260px]">
            <table className="w-full text-sm" role="grid">
              <thead className="bg-surface-inset border-b border-edge">
                <tr>
                  {['Event', 'Type', 'Event Date', 'Registration', 'Registrations', 'Status', 'Actions'].map(h => (
                    <th key={h} scope="col" className="text-left px-4 py-3 text-label-sm font-bold text-ink-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink">{ev.name}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-muted">{formatEventType(ev.type)}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-secondary">{formatDate(ev.eventDate)}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-secondary">
                      {formatRegistrationRange(ev.registrationStart, ev.registrationEnd)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/event-registrations?eventId=${ev.id}`}
                        className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-brand hover:underline"
                        aria-label={`View ${ev.registrationCount ?? 0} registrations for ${ev.name}`}
                      >
                        <Users className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                        <span>{ev.registrationCount ?? 0}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" role="group" aria-label={`Actions for ${ev.name}`}>
                        <button
                          type="button"
                          onClick={() => setEditing(ev)}
                          disabled={busyId === ev.id}
                          className="btn btn-ghost px-2.5 py-1 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <div className="relative inline-block text-left" ref={menuOpenId === ev.id ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={() => setMenuOpenId(menuOpenId === ev.id ? null : ev.id)}
                            className="btn btn-ghost px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1"
                            aria-haspopup="menu"
                            aria-expanded={menuOpenId === ev.id}
                          >
                            <span>More</span>
                            <ChevronDown className="w-3 h-3 text-ink-muted" aria-hidden="true" />
                          </button>
                          {menuOpenId === ev.id && (
                            <div
                              role="menu"
                              className="absolute right-0 mt-1 w-36 bg-surface border border-edge rounded-lg shadow-raised z-raised py-1 text-left animate-scale-in"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setMenuOpenId(null); handleDuplicate(ev); }}
                                disabled={busyId === ev.id}
                                className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setMenuOpenId(null); setViewing(ev); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-sunken transition-colors cursor-pointer"
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setMenuOpenId(null); setArchiving(ev); }}
                                disabled={busyId === ev.id || ev.status === 'ARCHIVED'}
                                title={ev.status === 'ARCHIVED' ? 'Already archived' : undefined}
                                className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-sunken transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Archive
                              </button>
                              <div className="my-1 border-t border-edge" role="separator" />
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setMenuOpenId(null); setDeleting(ev); }}
                                disabled={busyId === ev.id}
                                className="w-full text-left px-3 py-1.5 text-xs text-status-rejected hover:bg-status-bg-rejected transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
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
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Plus, Pencil, Copy, Archive, Eye, Users,
  AlertCircle, Loader2, CheckCircle, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { adminApi } from '../services/api';
import { EventItem, EventPayload } from '../types';
import { useConfirm } from '../components/ui/ConfirmDialog';

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

/** ISO timestamp -> the `YYYY-MM-DDTHH:mm` string a `datetime-local` input needs. */
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : 'To be announced');

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
  // Preserve whatever the event already is, including the 'GENERAL' default.
  // Mapping GENERAL onto a specific type here silently rewrote the type of
  // every default event the moment an admin opened Edit and hit Save.
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
      // New events start as DRAFT, matching handleDuplicate and the existence of a
      // separate publish action. Creating straight to OPEN made the event
      // student-visible the instant the wizard finished, before an admin had
      // reviewed or published it.
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
      // Previously swallowed by an empty catch, so a failed create looked
      // exactly like a successful one: the wizard closed and nothing appeared.
      notify(err?.response?.data?.message || 'Could not save the event.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal bg-on-primary/40 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div className="surface w-full max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col shadow-modal animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 id="wizard-title" className="text-headline-sm font-extrabold text-ink">{existing ? 'Edit Event' : 'Create Event'}</h2>
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
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
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
                <div><span className="font-semibold text-ink-secondary">Title:</span> <span className="text-ink ml-2">{form.name || 'To be announced'}</span></div>
                <div><span className="font-semibold text-ink-secondary">Type:</span> <span className="text-ink ml-2">{form.type}</span></div>
                <div><span className="font-semibold text-ink-secondary">Event Date:</span> <span className="text-ink ml-2">{form.eventDate || 'To be announced'}</span></div>
                <div><span className="font-semibold text-ink-secondary">Registration:</span> <span className="text-ink ml-2">{form.registrationStart || 'To be announced'} to {form.registrationEnd || 'To be announced'}</span></div>
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
              {existing ? 'Save Changes' : 'Create Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const EventDetail: React.FC<{ event: EventItem; onClose: () => void }> = ({ event, onClose }) => (
  <div className="fixed inset-0 z-modal bg-on-primary/40 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="detail-title">
    <div className="surface w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col shadow-modal animate-scale-in">
      <div className="flex items-center justify-between p-5 border-b border-edge">
        <h2 id="detail-title" className="text-headline-sm font-extrabold text-ink">{event.name}</h2>
        <button onClick={onClose} className="btn btn-ghost p-2" aria-label="Close details">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3 text-body-sm">
        {event.description && <p className="text-ink-secondary">{event.description}</p>}
        <div className="surface-sunken rounded-lg p-4 space-y-2">
          <div><span className="font-semibold text-ink-secondary">Status:</span> <span className="text-ink ml-2"><StatusBadge status={event.status} /></span></div>
          <div><span className="font-semibold text-ink-secondary">Type:</span> <span className="text-ink ml-2">{event.type || 'GENERAL'}</span></div>
          <div><span className="font-semibold text-ink-secondary">Year:</span> <span className="text-ink ml-2">{event.year}</span></div>
          <div><span className="font-semibold text-ink-secondary">Event date:</span> <span className="text-ink ml-2">{formatDate(event.eventDate)}</span></div>
          <div><span className="font-semibold text-ink-secondary">Registration:</span> <span className="text-ink ml-2">{formatDate(event.registrationStart)} to {formatDate(event.registrationEnd)}</span></div>
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

export const AdminEvents: React.FC = () => {
  const confirm = useConfirm();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventItem | null | undefined>(undefined);
  const [viewing, setViewing] = useState<EventItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

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
        // The dates were read back out of datetime-local inputs, so they are
        // already in the `YYYY-MM-DDTHH:mm` shape the create endpoint parses.
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

  const handleArchive = async (ev: EventItem) => {
    const confirmed = await confirm({
      title: `Archive “${ev.name}”?`,
      description: 'Students will no longer be able to register for this event. Existing registrations are kept.',
      confirmLabel: 'Archive event',
    });
    if (!confirmed) return;
    setBusyId(ev.id);
    try {
      await adminApi.setEventStatus(ev.id, 'ARCHIVED');
      notify(`Archived "${ev.name}".`);
      await fetchEvents();
    } catch (err: any) {
      notify(err?.response?.data?.message || 'Could not archive the event.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-toast text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-status-bg-rejected text-status-rejected border border-status-rejected/30'
              : 'bg-surface-inverse text-ink-inverse'
          }`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* `undefined` means closed, `null` means creating, an item means editing. */}
      {editing !== undefined && (
        <EventWizard
          existing={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={fetchEvents}
          notify={notify}
        />
      )}
      {viewing && <EventDetail event={viewing} onClose={() => setViewing(null)} />}

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
        <button onClick={() => setEditing(null)} className="btn btn-primary">
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
          <button onClick={() => setEditing(null)} className="btn btn-ghost text-body-sm">Create your first event</button>
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
                    <td className="px-4 py-3 font-semibold text-ink">{ev.name}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-muted">{ev.type || 'GENERAL'}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-secondary">{formatDate(ev.eventDate)}</td>
                    <td className="px-4 py-3 text-label-sm text-ink-secondary">
                      {formatDate(ev.registrationStart)} to {formatDate(ev.registrationEnd)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-label-sm font-semibold text-ink-secondary">
                        <Users className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                        {ev.registrationCount ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" role="group" aria-label={`Actions for ${ev.name}`}>
                        <Link
                          to={`/admin/event-registrations?eventId=${ev.id}`}
                          title="Registrations"
                          className="btn btn-ghost p-2 text-brand hover:bg-brand-soft"
                          aria-label={`Registrations for ${ev.name}`}
                        >
                          <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                        <button
                          onClick={() => setEditing(ev)}
                          disabled={busyId === ev.id}
                          title="Edit"
                          className="btn btn-ghost p-2"
                          aria-label={`Edit ${ev.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(ev)}
                          disabled={busyId === ev.id}
                          title="Duplicate"
                          className="btn btn-ghost p-2"
                          aria-label={`Duplicate ${ev.name}`}
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => setViewing(ev)}
                          title="View"
                          className="btn btn-ghost p-2"
                          aria-label={`View ${ev.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleArchive(ev)}
                          disabled={busyId === ev.id || ev.status === 'ARCHIVED'}
                          title="Archive"
                          className="btn btn-ghost p-2"
                          aria-label={`Archive ${ev.name}`}
                        >
                          {busyId === ev.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            : <Archive className="w-3.5 h-3.5" aria-hidden="true" />}
                        </button>
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
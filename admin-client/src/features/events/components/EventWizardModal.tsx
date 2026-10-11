import React, { useState } from 'react';
import { X, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { formatDate, formatRegistrationRange } from '@/shared/utils/formatDate';
import { eventsApi } from '../api';
import { EventItem, EventPayload, FormState } from '../types';
import { fromEvent, emptyEventForm } from '../hooks/useEvents';
import { EventStatusBadge } from './EventStatusBadge';
import { formatEventType, EVENT_TYPE_LABELS } from './EventDetailModal';

export const EVENT_TYPES = ['HACKATHON', 'WORKSHOP', 'COMPETITION', 'SEMINAR', 'OTHER'];
const steps = ['Basics', 'Dates', 'Eligibility', 'Form', 'Teams', 'Notifications', 'Review'];

export interface EventWizardModalProps {
  onClose: () => void;
  onSaved: () => void;
  existing?: EventItem;
  notify: (message: string, type?: 'success' | 'error') => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  onClose,
  onSaved,
  existing,
  notify,
}) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(existing ? fromEvent(existing) : emptyEventForm);

  const update = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload: EventPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      year: form.year,
      status: form.status || 'OPEN',
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
        await eventsApi.updateEvent(existing.id, payload);
        notify('Event saved.');
      } else {
        await eventsApi.createEvent(payload);
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
              <label htmlFor="event-status" className="block">
                <span className="label">Status</span>
                <select id="event-status" value={form.status} onChange={e => update('status', e.target.value)} className="select">
                  <option value="OPEN">Open (Published & Visible to Students)</option>
                  <option value="DRAFT">Draft (Hidden from Students)</option>
                  <option value="CLOSED">Closed (Registration ended)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <p className="text-label-sm text-ink-muted mt-1">
                  Events set to "Open" appear in the Student Portal and send notifications to eligible students.
                </p>
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
                    <button key={y} type="button" onClick={() => update('eligibilityYears', form.eligibilityYears.includes(y) ? form.eligibilityYears.filter(e => e !== y) : [...form.eligibilityYears, y])}
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
                <div><span className="font-semibold text-ink-secondary">Status:</span> <span className="ml-2"><EventStatusBadge status={form.status} /></span></div>
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

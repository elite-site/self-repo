import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Event, EventRegistration } from '../types';
import {
  Calendar,
  Clock,
  Users,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Trash2,
  Plus
} from 'lucide-react';
import { BrandedLoading } from '../components/BrandedLoading';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any | null>(null);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration modal
  const [modalOpen, setModalOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Team creation modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);

  const loadEventAndReg = async (isInitial = true) => {
    if (!id) return;
    if (isInitial && !event) setLoading(true);
    setError(null);

    try {
      const [evData, regList] = await Promise.all([
        api.getEvent(id).catch(() => api.getPublicEvent(id)),
        api.getRegistrations().catch(() => []),
      ]);
      setEvent(evData);

      if (Array.isArray(regList)) {
        const found = regList.find(
          (r: EventRegistration) =>
            r.eventId === id && (r.status === 'REGISTERED' || r.status === 'CONFIRMED')
        );
        setRegistration(found || null);
      }
    } catch {
      if (isInitial) setError('Event not found or failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  const requireSession = async (): Promise<boolean> => {
    try {
      await api.getMe();
      return true;
    } catch {
      window.location.href = api.getOAuthAuthorizeUrl();
      return false;
    }
  };

  useEffect(() => {
    loadEventAndReg(true);
  }, [id]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setRegError(null);

    try {
      const res = await api.registerForEvent(id, { answers });
      // Instantly update registration state so it immediately appears as registered
      setRegistration({
        id: res?.id || `reg-${Date.now()}`,
        eventId: id,
        eventTitle: event?.title || '',
        status: 'REGISTERED',
        registeredAt: res?.registeredAt || new Date().toISOString(),
        ...res,
      });
      setModalOpen(false);
      // Silently refresh in the background
      loadEventAndReg(false);
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!registration) return;
    if (!window.confirm('Are you sure you want to cancel your registration for this event?')) return;
    setCancelling(true);

    try {
      await api.cancelRegistration(registration.id);
      setRegistration(null);
      loadEventAndReg(false);
    } catch {
      alert('Failed to cancel registration.');
    } finally {
      setCancelling(false);
    }
  };

  const isEventActive = event && (event.status === 'OPEN' || !event.status);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !teamName.trim()) return;
    setCreatingTeam(true);
    setTeamError(null);

    try {
      await api.createTeam({ name: teamName.trim(), eventId: id });
      setTeamSuccess(`Team "${teamName.trim()}" created successfully!`);
      setTimeout(() => {
        setTeamModalOpen(false);
        setTeamName('');
        setTeamSuccess(null);
        navigate('/teams');
      }, 1200);
    } catch (err: any) {
      setTeamError(err.response?.data?.message || 'Failed to create team.');
    } finally {
      setCreatingTeam(false);
    }
  };

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : 'To be announced');

  if (loading) {
    return (
      <div className="py-24" role="status" aria-live="polite">
        <BrandedLoading fullScreen={false} message="Loading Event Details..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="surface text-center py-16 max-w-lg mx-auto space-y-4 page-enter" role="alert">
        <AlertCircle className="w-10 h-10 text-status-rejected mx-auto" aria-hidden="true" />
        <h2 className="text-body-md font-bold text-ink font-heading">Event Not Found</h2>
        <p className="text-body-sm text-ink-muted">The requested event could not be found or has been removed.</p>
        <Link
          to="/events"
          className="btn btn-secondary inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Events</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* BACK BUTTON */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-label-sm font-bold text-ink-secondary hover:text-ink cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to All Events</span>
        </button>
      </div>

      {/* EVENT BANNER */}
      <div className="surface overflow-hidden">
        <div className="h-44 sm:h-56 bg-surface-inverse p-6 sm:p-8 flex flex-col justify-end text-ink-inverse relative text-left">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="badge badge-brand text-label-xs uppercase tracking-wider">
              {event.type || 'Department Event'}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-label-xs font-mono font-bold text-brand-soft uppercase tracking-widest">
              SASI Department of Information Technology
            </span>
            <h1 className="text-headline-md sm:text-headline-lg font-black text-ink-inverse font-heading tracking-tight">{event.title}</h1>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          {/* LEFT: DESCRIPTION & CRITERIA (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <h2 className="text-body-md font-bold text-ink font-heading mb-2">About This Event</h2>
              <p className="text-body-sm text-ink-secondary leading-relaxed surface-sunken p-4 rounded-lg border border-edge whitespace-pre-line">
                {event.description || 'Details will be announced shortly.'}
              </p>
            </div>

            <div>
              <h2 className="text-body-md font-bold text-ink font-heading mb-2">Eligibility & Requirements</h2>
              <div className="surface-sunken p-4 rounded-lg border border-edge text-body-sm text-ink-secondary space-y-1">
                <p>
                  <strong className="text-ink">Target Audience:</strong> {event.eligibility || 'All IT Students'}
                </p>
                <p className="text-ink-muted">
                  Open to enrolled undergraduate students in good academic standing.
                </p>
              </div>
            </div>

            {/* Optional Registration Form Fields Information */}
            {event.registrationFields && event.registrationFields.length > 0 && (
              <div>
                <h2 className="text-body-md font-bold text-ink font-heading mb-2">Registration Information Needed</h2>
                <div className="space-y-2">
                  {event.registrationFields.map((field: any) => (
                    <div
                      key={field.id}
                      className="p-3 surface-sunken rounded-lg border border-edge text-body-sm flex items-center justify-between"
                    >
                      <span className="font-semibold text-ink">{field.label}</span>
                      <span className="text-label-xs font-mono text-ink-muted uppercase">
                        {field.fieldType} {field.isRequired ? '(Required)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: REGISTRATION STATUS & ACTION (4 COLS) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="surface-sunken p-6 rounded-lg border border-edge space-y-5">
              <div className="space-y-3 divide-y divide-edge text-body-sm">
                <div className="flex items-center gap-3 pt-1">
                  <Calendar className="w-5 h-5 text-ink-brand shrink-0" aria-hidden="true" />
                  <div>
                    <span className="text-label-xs text-ink-muted block uppercase font-bold">Event Date</span>
                    <span className="font-bold text-ink">
                      {formatDate(event.date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Clock className="w-5 h-5 text-ink-brand shrink-0" aria-hidden="true" />
                  <div>
                    <span className="text-label-xs text-ink-muted block uppercase font-bold">Registration Closes</span>
                    <span className="font-bold text-ink">
                      {formatDate(event.deadline)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION AREA */}
              <div className="pt-2">
                {registration ? (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-status-bg-approved border border-edge-strong rounded-lg text-status-approved text-body-sm flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-status-approved shrink-0" aria-hidden="true" />
                      <div>
                        <span className="font-bold block">You are registered!</span>
                        <span className="text-label-xs text-status-approved">Participation slot confirmed</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCancelRegistration}
                      disabled={cancelling}
                      className="btn btn-ghost w-full border-status-rejected text-status-rejected hover:bg-status-bg-rejected"
                    >
                      {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
                      <span>Cancel Registration</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      const authed = await requireSession();
                      if (!authed) return;
                      setModalOpen(true);
                    }}
                    className="btn btn-primary w-full"
                  >
                    <span>Register Now</span>
                  </button>
                )}
              </div>
            </div>

            {/* TEAM FORMATION CARD */}
            <div className="surface-sunken p-6 rounded-lg border border-edge space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-ink-brand" aria-hidden="true" />
                <h3 className="text-body-sm font-bold text-ink font-heading">Team Formation</h3>
              </div>
              <p className="text-body-sm text-ink-secondary">
                Form a collaborative team for this event and invite your peers to participate together.
              </p>

              {!isEventActive && (
                <div className="p-3 bg-status-bg-pending border border-edge-strong rounded-lg text-body-sm text-status-pending flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>No active event available to create a team for. This event is not currently accepting team registrations.</span>
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  const authed = await requireSession();
                  if (!authed) return;
                  setTeamName('');
                  setTeamError(null);
                  setTeamSuccess(null);
                  setTeamModalOpen(true);
                }}
                disabled={!isEventActive}
                title={!isEventActive ? 'No active event available to create a team for.' : undefined}
                className="btn btn-secondary w-full"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Create Team for This Event</span>
              </button>

              <div className="text-center">
                <Link to="/teams" className="text-label-sm font-bold text-ink-brand hover:text-brand-hover transition-colors">
                  View your existing teams &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {modalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="registration-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submitting) setModalOpen(false);
            }}
          >
            <div
              className="surface max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge animate-scale-in text-left my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-edge">
                <h3 id="registration-modal-title" className="text-body-md font-bold text-ink font-heading">Confirm Event Registration</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
                  aria-label="Close registration modal"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4 pt-4">
                {regError && (
                  <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected flex items-center gap-2" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{regError}</span>
                  </div>
                )}

                <p className="text-body-sm text-ink-secondary">
                  You are about to register for <strong>{event.title}</strong>. Your college roll number and email will be
                  associated with this entry.
                </p>

                {/* Dynamic form fields if required by event */}
                {event.registrationFields && event.registrationFields.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {event.registrationFields.map((field: any) => (
                      <div key={field.id}>
                        <label htmlFor={`reg-field-${field.id}`} className="label">
                          {field.label} {field.isRequired ? '*' : ''}
                        </label>
                        <input
                          id={`reg-field-${field.id}`}
                          type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
                          required={field.isRequired}
                          value={answers[field.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="input"
                          aria-required={field.isRequired}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-edge">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>Confirm Registration</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* TEAM CREATION MODAL */}
      {teamModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !creatingTeam) {
                setTeamModalOpen(false);
                setTeamError(null);
                setTeamSuccess(null);
              }
            }}
          >
            <div
              className="surface max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal border border-edge animate-scale-in text-left my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-edge">
                <h3 id="team-modal-title" className="text-body-md font-bold text-ink font-heading">Create Team for Event</h3>
                <button
                  onClick={() => {
                    setTeamModalOpen(false);
                    setTeamError(null);
                    setTeamSuccess(null);
                  }}
                  className="p-1 text-ink-muted hover:text-ink rounded-lg cursor-pointer transition-colors"
                  aria-label="Close team creation modal"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {teamSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-status-approved mx-auto" aria-hidden="true" />
                  <h4 className="text-body-sm font-bold text-ink font-heading">Team Created!</h4>
                  <p className="text-body-sm text-ink-secondary">{teamSuccess}</p>
                  <p className="text-label-sm text-ink-muted">Redirecting to your teams...</p>
                </div>
              ) : (
                <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
                  {teamError && (
                    <div className="p-3 bg-status-bg-rejected border border-edge-strong rounded-lg text-body-sm text-status-rejected flex items-center gap-2" role="alert">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{teamError}</span>
                    </div>
                  )}

                  {!isEventActive && (
                    <div className="p-3 bg-status-bg-pending border border-edge-strong rounded-lg text-body-sm text-status-pending flex items-center gap-2" role="status">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>No active event available to create a team for.</span>
                    </div>
                  )}

                  <div>
                    <label className="label">Target Event</label>
                    <div className="p-2.5 surface-sunken border border-edge rounded-lg text-body-sm text-ink font-medium">
                      {event?.title || event?.name}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="team-name" className="label">Team Name *</label>
                    <input
                      id="team-name"
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. AlgoRhythms / CyberKnights"
                      className="input"
                      autoFocus
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-edge">
                    <button
                      type="button"
                      onClick={() => {
                        setTeamModalOpen(false);
                        setTeamError(null);
                      }}
                      className="btn btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingTeam || !teamName.trim() || !isEventActive}
                      className="btn btn-primary"
                    >
                      {creatingTeam ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                      <span>Create Team</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default EventDetailPage;

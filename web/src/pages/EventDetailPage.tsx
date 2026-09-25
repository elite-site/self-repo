import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Event, EventRegistration } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Trash2,
  ShieldCheck,
  Plus
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl max-w-lg mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
        <h2 className="text-base font-bold text-[#0B192C]">Event Not Found</h2>
        <p className="text-xs text-neutral-500">The requested event could not be found or has been removed.</p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-[#0B192C]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Events</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BACK BUTTON */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-[#0B192C] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </button>
      </div>

      {/* EVENT BANNER */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="h-44 sm:h-56 bg-gradient-to-r from-[#0B192C] via-[#1E293B] to-[#B5121B] p-6 sm:p-8 flex flex-col justify-end text-white relative text-left">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
              {event.type || 'Department Event'}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-red-300 uppercase tracking-widest">
              SASI Department of Information Technology
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{event.title}</h1>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          {/* LEFT: DESCRIPTION & CRITERIA (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#0B192C] mb-2">About This Event</h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-100 whitespace-pre-line">
                {event.description || 'Details will be announced shortly.'}
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-[#0B192C] mb-2">Eligibility & Requirements</h2>
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-xs text-neutral-700 space-y-1">
                <p>
                  <strong>Target Audience:</strong> {event.eligibility || 'All IT Students'}
                </p>
                <p className="text-neutral-500">
                  Open to enrolled undergraduate students in good academic standing.
                </p>
              </div>
            </div>

            {/* Optional Registration Form Fields Information */}
            {event.registrationFields && event.registrationFields.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-[#0B192C] mb-2">Registration Information Needed</h2>
                <div className="space-y-2">
                  {event.registrationFields.map((field: any) => (
                    <div
                      key={field.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-neutral-700">{field.label}</span>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase">
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
            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 space-y-5">
              <div className="space-y-3 divide-y divide-neutral-200/60 text-xs">
                <div className="flex items-center gap-3 pt-1">
                  <Calendar className="w-5 h-5 text-[#DC2626] shrink-0" />
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Event Date</span>
                    <span className="font-bold text-[#0B192C]">
                      {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Clock className="w-5 h-5 text-[#DC2626] shrink-0" />
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Registration Closes</span>
                    <span className="font-bold text-[#0B192C]">
                      {event.deadline ? new Date(event.deadline).toLocaleDateString() : 'TBA'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION AREA */}
              <div className="pt-2">
                {registration ? (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">You are registered!</span>
                        <span className="text-[10px] text-emerald-700">Participation slot confirmed</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCancelRegistration}
                      disabled={cancelling}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Cancel Registration</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const sessionData = localStorage.getItem('ita_student_session');
                      if (!sessionData) {
                        window.location.href = api.getOAuthAuthorizeUrl();
                        return;
                      }
                      setModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>Register Now</span>
                  </button>
                )}
              </div>
            </div>

            {/* TEAM FORMATION CARD */}
            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#DC2626]" />
                <h3 className="font-bold text-sm text-[#0B192C]">Team Formation</h3>
              </div>
              <p className="text-xs text-neutral-500">
                Form a collaborative team for this event and invite your peers to participate together.
              </p>

              {!isEventActive && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>No active event available to create a team for. This event is not currently accepting team registrations.</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const sessionData = localStorage.getItem('ita_student_session');
                  if (!sessionData) {
                    window.location.href = api.getOAuthAuthorizeUrl();
                    return;
                  }
                  setTeamName('');
                  setTeamError(null);
                  setTeamSuccess(null);
                  setTeamModalOpen(true);
                }}
                disabled={!isEventActive}
                title={!isEventActive ? 'No active event available to create a team for.' : undefined}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0B192C] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Create Team for This Event</span>
              </button>

              <div className="text-center">
                <Link to="/teams" className="text-[11px] font-bold text-[#DC2626] hover:underline">
                  View your existing teams &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-[#0B192C]">Confirm Event Registration</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 pt-4">
              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <p className="text-xs text-neutral-600">
                You are about to register for <strong>{event.title}</strong>. Your college roll number and email will be
                associated with this entry.
              </p>

              {/* Dynamic form fields if required by event */}
              {event.registrationFields && event.registrationFields.length > 0 && (
                <div className="space-y-3 pt-2">
                  {event.registrationFields.map((field: any) => (
                    <div key={field.id}>
                      <label className="block text-xs font-bold text-[#0B192C] mb-1">
                        {field.label} {field.isRequired ? '*' : ''}
                      </label>
                      <input
                        type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
                        required={field.isRequired}
                        value={answers[field.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Confirm Registration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM CREATION MODAL */}
      {teamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-[#0B192C]">Create Team for Event</h3>
              <button
                onClick={() => {
                  setTeamModalOpen(false);
                  setTeamError(null);
                  setTeamSuccess(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {teamSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-[#0B192C]">Team Created!</h4>
                <p className="text-xs text-neutral-500">{teamSuccess}</p>
                <p className="text-[11px] text-neutral-400">Redirecting to your teams...</p>
              </div>
            ) : (
              <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
                {teamError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{teamError}</span>
                  </div>
                )}

                {!isEventActive && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>No active event available to create a team for.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0B192C] mb-1">Target Event</label>
                  <div className="p-2.5 bg-neutral-100 rounded-xl text-xs text-neutral-700 font-medium">
                    {event?.title || event?.name}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B192C] mb-1">Team Name *</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. AlgoRhythms / CyberKnights"
                    className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTeamModalOpen(false);
                      setTeamError(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTeam || !teamName.trim() || !isEventActive}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                  >
                    {creatingTeam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Create Team</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

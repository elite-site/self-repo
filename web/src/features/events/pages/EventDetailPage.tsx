import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { useEventDetail } from '../hooks/useEventDetail';
import { RegistrationModal, EventTeamModal } from '../components';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    event,
    registration,
    loading,
    error,
    modalOpen,
    setModalOpen,
    answers,
    setAnswers,
    submitting,
    regError,
    cancelling,
    teamModalOpen,
    setTeamModalOpen,
    teamName,
    setTeamName,
    creatingTeam,
    teamError,
    teamSuccess,
    handleRegister,
    handleCancelRegistration,
    handleCreateTeam,
  } = useEventDetail(id);

  if (loading) {
    return <SkeletonPage label="Loading event details" cards={1} rows={4} />;
  }

  if (error || !event) {
    return (
      <div className="surface max-w-xl mx-auto p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-status-rejected mx-auto" />
        <h2 className="text-body-md font-bold text-ink font-heading">Event Not Found</h2>
        <p className="text-body-sm text-ink-muted">{error || 'This event does not exist.'}</p>
        <Link to="/events" className="btn btn-secondary inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to events
        </Link>
      </div>
    );
  }

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : 'TBA');

  return (
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-12" role="main">
      <div>
        <Link to="/events" className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to events
        </Link>
      </div>

      {/* 1. ASYMMETRIC EVENT SPOTLIGHT HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div className="surface p-6 sm:p-8 space-y-6 rounded-2xl border border-edge">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-edge pb-6">
              <div className="space-y-2">
                <span className="badge badge-brand text-xs uppercase">{event.type || 'EVENT'}</span>
                <h1 className="text-xl sm:text-2xl font-black text-ink font-heading">{event.title}</h1>
                <p className="text-body-sm text-ink-secondary">{event.eligibility || 'Open to all students'}</p>
              </div>

              <div className="flex items-center gap-2">
                {registration ? (
                  <div className="flex items-center gap-3">
                    <span className="badge badge-approved inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                    </span>
                    <button
                      onClick={handleCancelRegistration}
                      disabled={cancelling}
                      className="btn btn-ghost text-status-rejected hover:bg-status-bg-rejected text-xs min-h-[44px]"
                    >
                      {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Cancel</span>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setModalOpen(true)} className="btn btn-primary min-h-[44px] px-6 shadow-sm">
                    Register now
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="surface-sunken p-4 rounded-xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-brand" />
                <div>
                  <div className="text-label-xs text-ink-muted">Event date</div>
                  <div className="text-body-sm font-bold text-ink">{formatDate(event.date)}</div>
                </div>
              </div>
              <div className="surface-sunken p-4 rounded-xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-status-review" />
                <div>
                  <div className="text-label-xs text-ink-muted">Deadline</div>
                  <div className="text-body-sm font-bold text-ink">{formatDate(event.deadline)}</div>
                </div>
              </div>
              <div className="surface-sunken p-4 rounded-xl flex items-center gap-3">
                <Users className="w-5 h-5 text-status-changes" />
                <div>
                  <div className="text-label-xs text-ink-muted">Team size</div>
                  <div className="text-body-sm font-bold text-ink">
                    {event.maxTeamSize && event.maxTeamSize > 1
                      ? `${event.minTeamSize || 1}–${event.maxTeamSize} members`
                      : 'Individual'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="font-heading text-body-md font-bold text-ink">About this event</h2>
              <p className="text-body-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
                {event.description || 'No detailed description provided for this event.'}
              </p>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                <Sparkles size={16} aria-hidden="true" />
                Registration Status
              </span>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                {registration
                  ? `You are registered for this event. Status: ${registration.status}.`
                  : 'Registrations are currently open. Reserve your spot before the deadline.'}
              </p>
              <div className="space-y-1.5 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Type: <span className="text-ink">{event.type || 'Event'}</span></div>
                <div>Status: <span className="text-ink">{event.status || 'Active'}</span></div>
              </div>
            </div>

            {event.maxTeamSize && event.maxTeamSize > 1 && registration && (
              <div className="mt-4 pt-3 border-t border-brand/20">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(true)}
                  className="btn btn-primary text-xs w-full min-h-[40px] inline-flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create / Join Team</span>
                </button>
              </div>
            )}
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      <RegistrationModal
        isOpen={modalOpen}
        event={event}
        answers={answers}
        submitting={submitting}
        regError={regError}
        onAnswerChange={(qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }))}
        onClose={() => setModalOpen(false)}
        onSubmit={handleRegister}
      />

      <EventTeamModal
        isOpen={teamModalOpen}
        eventTitle={event.title}
        teamName={teamName}
        creatingTeam={creatingTeam}
        teamError={teamError}
        teamSuccess={teamSuccess}
        onTeamNameChange={setTeamName}
        onClose={() => setTeamModalOpen(false)}
        onSubmit={handleCreateTeam}
      />
    </div>
  );
};

export default EventDetailPage;

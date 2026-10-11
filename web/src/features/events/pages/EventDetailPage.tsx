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
} from 'lucide-react';
import { SkeletonPage } from '@/shared/ui/Skeleton';
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
    loadEventAndReg,
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
    <div className="space-y-6 text-left page-enter max-w-4xl mx-auto" role="main">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink font-semibold">
        <ArrowLeft className="w-4 h-4" /> Back to events
      </Link>

      <div className="surface p-6 sm:p-8 space-y-6">
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
                  className="btn btn-ghost text-status-rejected hover:bg-status-bg-rejected text-xs"
                >
                  {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setModalOpen(true)} className="btn btn-primary">
                Register now
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-sunken p-4 rounded-lg flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand" />
            <div>
              <div className="text-label-xs text-ink-muted">Event date</div>
              <div className="text-body-sm font-bold text-ink">{formatDate(event.date)}</div>
            </div>
          </div>
          <div className="surface-sunken p-4 rounded-lg flex items-center gap-3">
            <Clock className="w-5 h-5 text-status-review" />
            <div>
              <div className="text-label-xs text-ink-muted">Deadline</div>
              <div className="text-body-sm font-bold text-ink">{formatDate(event.deadline)}</div>
            </div>
          </div>
          <div className="surface-sunken p-4 rounded-lg flex items-center gap-3">
            <Users className="w-5 h-5 text-status-changes" />
            <div>
              <div className="text-label-xs text-ink-muted">Team size</div>
              <div className="text-body-sm font-bold text-ink">
                {event.maxTeamSize && event.maxTeamSize > 1
                  ? `${event.minTeamSize || 1} - ${event.maxTeamSize} Members`
                  : 'Individual'}
              </div>
            </div>
          </div>
        </div>

        {event.description && (
          <div className="space-y-2">
            <h3 className="font-heading text-body-md font-bold text-ink">About this event</h3>
            <p className="text-body-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        {event.maxTeamSize && event.maxTeamSize > 1 && (
          <div className="surface-sunken p-5 rounded-lg border border-edge flex items-center justify-between">
            <div>
              <h4 className="font-heading text-body-sm font-bold text-ink">Team Participation</h4>
              <p className="text-label-sm text-ink-secondary">Create a team to invite peers and participate collaboratively.</p>
            </div>
            <button onClick={() => setTeamModalOpen(true)} className="btn btn-secondary inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Create team
            </button>
          </div>
        )}
      </div>

      <RegistrationModal
        isOpen={modalOpen}
        event={event}
        answers={answers}
        submitting={submitting}
        regError={regError}
        onAnswerChange={(fieldId, val) => setAnswers((prev) => ({ ...prev, [fieldId]: val }))}
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

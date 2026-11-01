import React from 'react';
import { CalendarDays, Plus, AlertCircle, Loader2, CheckCircle, X, Calendar } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { EventWizardModal } from '../components/EventWizardModal';
import { EventDetailModal } from '../components/EventDetailModal';
import { ArchiveEventDialog } from '../components/ArchiveEventDialog';
import { DeleteEventDialog } from '../components/DeleteEventDialog';
import { EventsTable } from '../components/EventsTable';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

export const AdminEventsPage: React.FC = () => {
  const {
    events,
    loading,
    error,
    editing,
    setEditing,
    viewing,
    setViewing,
    archiving,
    setArchiving,
    deleting,
    setDeleting,
    busyId,
    menuOpenId,
    setMenuOpenId,
    menuRef,
    toast,
    setToast,
    notify,
    fetchEvents,
    handleDuplicate,
    handlePublish,
    handleCloseEvent,
  } = useEvents();

  const publishedCount = events.filter((e) => e.status === 'OPEN').length;
  const draftCount = events.filter((e) => e.status === 'DRAFT').length;
  const totalRegistrations = events.reduce((sum, e) => sum + (e.registrationCount ?? 0), 0);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-overlay text-xs font-semibold px-4 py-3 rounded-xl shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-status-rejected/10 text-status-rejected border border-status-rejected/30' : 'bg-surface-inverse text-ink-inverse'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> : <CheckCircle className="w-4 h-4 shrink-0 text-success" aria-hidden="true" />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="p-1 hover:opacity-75 rounded ml-2 text-current cursor-pointer" aria-label="Close notification">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Wizard */}
      {editing !== undefined && (
        <EventWizardModal
          existing={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={fetchEvents}
          notify={notify}
        />
      )}

      {/* Details */}
      {viewing && <EventDetailModal event={viewing} onClose={() => setViewing(null)} />}

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

      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <CalendarDays size={13} className="shrink-0" />
                <span>Department Event Operations</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
                Events
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                {events.length} {events.length === 1 ? 'event' : 'events'} managed across hackathons, technical symposiums, and workshops.
              </p>
            </div>
            <button
              onClick={() => setEditing(null)}
              className="btn btn-primary text-xs sm:text-sm min-h-[40px] px-4 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Create event
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Published Events</span>
              <span className="text-2xl font-bold text-status-approved tabular-nums">{publishedCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Drafts / Planning</span>
              <span className="text-2xl font-bold text-ink tabular-nums">{draftCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover col-span-2 sm:col-span-1">
              <span className="text-xs text-ink-muted block font-medium">Total Registrations</span>
              <span className="text-2xl font-bold text-brand tabular-nums">{totalRegistrations}</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Calendar size={13} />
                  Campus Schedule
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  {publishedCount} Active
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Registration Scheduling</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Automated opening and closing of registration windows with team roster enforcement.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Total Signups</span>
                  <span className="font-bold text-ink text-sm tabular-nums">{totalRegistrations}</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Status</span>
                  <span className="font-bold text-status-approved text-sm">Operational</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <CheckCircle size={14} className="text-brand shrink-0" />
              <span>Real-time co-curricular coordination</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* Events Table Container */}
      {loading ? (
        <div className="flex items-center justify-center p-12 surface rounded-xl border border-edge text-ink-muted text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-brand mr-2" />
          <span>Loading department events...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-12 surface rounded-xl border border-edge text-center gap-3">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-xs text-status-rejected font-medium">{error}</p>
          <button onClick={fetchEvents} className="btn btn-secondary text-xs cursor-pointer shadow-xs">
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="p-16 text-center surface rounded-xl border border-edge space-y-2">
          <CalendarDays className="w-10 h-10 text-ink-muted mx-auto" />
          <p className="text-base font-bold text-ink">No events found</p>
          <p className="text-xs text-ink-muted">Create a new competition, workshop, or symposium to get started.</p>
        </div>
      ) : (
        <EventsTable
          events={events}
          busyId={busyId}
          menuOpenId={menuOpenId}
          menuRef={menuRef}
          onEdit={setEditing}
          onDelete={setDeleting}
          onPreview={setViewing}
          onArchive={setArchiving}
          onDuplicate={handleDuplicate}
          onPublish={handlePublish}
          onCloseEvent={handleCloseEvent}
          setMenuOpenId={setMenuOpenId}
        />
      )}
    </div>
  );
};

export default AdminEventsPage;

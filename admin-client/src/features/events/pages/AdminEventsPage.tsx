import React from 'react';
import { CalendarDays, Plus, AlertCircle, Loader2, CheckCircle, X } from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import { EventWizardModal } from '../components/EventWizardModal';
import { EventDetailModal } from '../components/EventDetailModal';
import { ArchiveEventDialog } from '../components/ArchiveEventDialog';
import { DeleteEventDialog } from '../components/DeleteEventDialog';
import { EventsTable } from '../components/EventsTable';

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

  return (
    <div className="space-y-6 page-enter">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-overlay text-xs font-semibold px-4 py-3 rounded-lg shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-status-bg-rejected text-status-rejected border border-status-rejected/30' : 'bg-surface-inverse text-ink-inverse'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />}
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

      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-edge">
        <div>
          <h1 className="text-headline-md font-semibold text-ink">Events</h1>
          <p className="text-body-sm text-ink-muted">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        <button onClick={() => setEditing(null)} className="btn btn-primary cursor-pointer">
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
          <button onClick={() => setEditing(null)} className="btn btn-ghost text-body-sm cursor-pointer">Create your first event</button>
        </div>
      ) : (
        <EventsTable
          events={events}
          busyId={busyId}
          menuOpenId={menuOpenId}
          menuRef={menuRef}
          onEdit={(ev) => setEditing(ev)}
          onDelete={(ev) => setDeleting(ev)}
          onPreview={(ev) => setViewing(ev)}
          onArchive={(ev) => setArchiving(ev)}
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

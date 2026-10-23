import React from 'react';
import { Megaphone, Plus, AlertCircle, Inbox } from 'lucide-react';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { ComposeAnnouncementDialog } from '../components/ComposeAnnouncementDialog';
import { AnnouncementCard } from '../components/AnnouncementCard';

export const AnnouncementsPage: React.FC = () => {
  const {
    announcements,
    loading,
    error,
    actionError,
    setActionError,
    deletingId,
    showCompose,
    setShowCompose,
    fetchAnnouncements,
    handleDelete,
  } = useAnnouncements();

  return (
    <div className="space-y-6">
      {showCompose && (
        <ComposeAnnouncementDialog
          onClose={() => setShowCompose(false)}
          onPublished={fetchAnnouncements}
        />
      )}

      {actionError && (
        <div className="flex items-start gap-2 bg-status-bg-rejected border border-edge text-status-rejected text-xs rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span className="flex-1">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="shrink-0 font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-status-rejected" />
          <div>
            <h1 className="text-xl font-semibold text-ink">Announcements</h1>
            <p className="text-xs text-ink-muted">Send messages to all or specific groups of students</p>
          </div>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold hover:bg-brand cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 p-10 justify-center bg-surface rounded-xl border border-edge text-center">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="text-xs text-status-rejected font-semibold hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (announcements || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-xl border border-edge gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">No Broadcast Announcements</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm">
              Keep students updated with important notices, deadline reminders, and campus event alerts.
            </p>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="btn btn-secondary text-xs mt-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Write the first announcement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(announcements || []).map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              deleting={deletingId === a.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;

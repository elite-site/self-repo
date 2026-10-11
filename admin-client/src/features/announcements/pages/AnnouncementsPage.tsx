import React from 'react';
import { Megaphone, Plus, Loader2, AlertCircle, Inbox } from 'lucide-react';
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
        <div className="flex items-center justify-center h-48 bg-surface rounded-lg border border-edge">
          <Loader2 className="w-7 h-7 animate-spin text-status-rejected" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 h-48 justify-center bg-surface rounded-lg border border-edge">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="text-xs text-status-rejected font-semibold hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-surface rounded-lg border border-edge gap-3">
          <Inbox className="w-10 h-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink-muted">No announcements yet</p>
          <button
            onClick={() => setShowCompose(true)}
            className="text-xs text-status-rejected font-semibold hover:underline cursor-pointer"
          >
            Write the first one
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
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

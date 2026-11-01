import React from 'react';
import { Megaphone, Plus, AlertCircle, Inbox, Send, CheckCircle } from 'lucide-react';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { ComposeAnnouncementDialog } from '../components/ComposeAnnouncementDialog';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryGrid';

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

  const totalAnnouncements = (announcements || []).length;
  const urgentCount = (announcements || []).filter((a) => a.priority === 'URGENT' || a.priority === 'HIGH').length;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {showCompose && (
        <ComposeAnnouncementDialog
          onClose={() => setShowCompose(false)}
          onPublished={fetchAnnouncements}
        />
      )}

      {actionError && (
        <div className="flex items-start gap-2 bg-status-rejected/10 border border-status-rejected/20 text-status-rejected text-xs rounded-xl p-3.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span className="flex-1 font-medium">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="shrink-0 font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. ASYMMETRICAL TOP SECTION */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <Megaphone size={13} className="shrink-0" />
                <span>Department Broadcast Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-sans">
                Announcements
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                Broadcast priority notices, deadline alerts, and general updates to targeted student cohorts.
              </p>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="btn btn-primary text-xs sm:text-sm min-h-[40px] px-4 inline-flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Announcement</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">Broadcast Notices</span>
              <span className="text-2xl font-bold text-ink tabular-nums">{totalAnnouncements}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover">
              <span className="text-xs text-ink-muted block font-medium">High / Urgent Priority</span>
              <span className="text-2xl font-bold text-status-rejected tabular-nums">{urgentCount}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-edge shadow-xs card-hover col-span-2 sm:col-span-1">
              <span className="text-xs text-ink-muted block font-medium">Delivery Mode</span>
              <span className="text-2xl font-bold text-brand">Portal & Push</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <Send size={13} />
                  Student Reach
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  100% Delivery
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Targeted Push Channels</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Messages display instantly on student dashboards and trigger notification center highlights.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Audience Scope</span>
                  <span className="font-bold text-ink text-sm">Year / Sec / All</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Dispatch Engine</span>
                  <span className="font-bold text-status-approved text-sm">Instant</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <CheckCircle size={14} className="text-brand shrink-0" />
              <span>Broadcast audit trail logged</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY GRID OF ANNOUNCEMENTS */}
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 p-12 justify-center bg-surface rounded-xl border border-edge text-center">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="btn btn-secondary text-xs font-semibold cursor-pointer shadow-xs mt-2"
          >
            Retry
          </button>
        </div>
      ) : (announcements || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-xl border border-edge gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted border border-edge">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">No Broadcast Announcements</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm">
              Keep students updated with important notices, deadline reminders, and campus event alerts.
            </p>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="btn btn-primary text-xs mt-2 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Write the first announcement</span>
          </button>
        </div>
      ) : (
        <MasonryGrid cols={2}>
          {(announcements || []).map((a) => (
            <MasonryItem key={a.id}>
              <div className="card-hover">
                <AnnouncementCard
                  announcement={a}
                  deleting={deletingId === a.id}
                  onDelete={handleDelete}
                />
              </div>
            </MasonryItem>
          ))}
        </MasonryGrid>
      )}
    </div>
  );
};

export default AnnouncementsPage;

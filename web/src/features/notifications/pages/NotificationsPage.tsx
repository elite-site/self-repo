import React from 'react';
import { Bell, Loader2, CheckCheck, AlertCircle, RefreshCw, ChevronRight, Inbox } from 'lucide-react';
import { SkeletonListPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem, NotificationFilters } from '../components';

export const NotificationsPage: React.FC = () => {
  const {
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    error,
    activeFilter,
    setActiveFilter,
    markingAll,
    filteredNotifs,
    loadNotifications,
    handleLoadMore,
    handleMarkAllRead,
    handleDeleteNotification,
    handleNotificationClick,
  } = useNotifications();

  if (loading) {
    return <SkeletonListPage label="Loading notifications" rows={5} />;
  }

  return (
    <div className="space-y-8 text-left page-enter max-w-6xl mx-auto pb-12" role="main">
      {/* 1. ASYMMETRICAL FILTER & SUMMARY HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="badge badge-brand text-xs font-semibold">Activity Hub</span>
                <div className="mt-1 flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-ink font-heading">Notification Inbox</h1>
                  {unreadCount > 0 && <span className="badge badge-brand">{unreadCount} Unread</span>}
                </div>
                <p className="mt-1 text-body-sm text-ink-secondary">
                  Announcements, event confirmations, change request decisions, and system alerts.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="btn btn-secondary min-h-[44px]"
                    aria-label={markingAll ? 'Marking all as read' : `Mark all ${unreadCount} notifications as read`}
                  >
                    <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Mark All Read</span>
                  </button>
                )}

                <button
                  onClick={() => loadNotifications()}
                  className="btn btn-ghost p-2.5 min-h-[44px] min-w-[44px] rounded-xl"
                  aria-label="Refresh notifications"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <NotificationFilters
              activeFilter={activeFilter}
              unreadCount={unreadCount}
              onFilterChange={setActiveFilter}
            />
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <Inbox size={16} aria-hidden="true" />
                  Inbox Summary
                </span>
                <span className="badge badge-brand text-[11px]">
                  {unreadCount} New
                </span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Clicking any item routes directly to the relevant event, submission feedback, or election ballot.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand/20 text-label-xs text-ink-muted">
              <span>Showing {filteredNotifs.length} notifications</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {error && (
        <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center justify-between p-4 rounded-2xl" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadNotifications()} className="label underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 2. MASONRY GROUPED NOTIFICATION CARDS */}
      {filteredNotifs.length === 0 ? (
        <div className="surface text-center py-16 px-4 rounded-2xl border border-edge">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-brand" aria-hidden="true" />
          </div>
          <h3 className="text-body-lg font-bold text-ink font-heading">No notifications to display</h3>
          <p className="text-body-sm text-ink-secondary mt-1 max-w-sm mx-auto">
            You're all caught up! New updates from faculty, moderation, or event registrations will appear here.
          </p>
        </div>
      ) : (
        <MasonryGrid cols={2}>
          {filteredNotifs.map((n) => (
            <MasonryItem key={n.id}>
              <div className="surface rounded-2xl border border-edge overflow-hidden card-lift">
                <NotificationItem
                  notification={n}
                  onClick={handleNotificationClick}
                  onDelete={handleDeleteNotification}
                />
              </div>
            </MasonryItem>
          ))}
        </MasonryGrid>
      )}

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary min-h-[44px] px-6"
            aria-busy={loadingMore}
          >
            {loadingMore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 rotate-90" aria-hidden="true" />
            )}
            <span>{loadingMore ? 'Loading…' : 'Load more'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

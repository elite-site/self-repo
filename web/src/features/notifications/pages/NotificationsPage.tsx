import React from 'react';
import { Bell, Loader2, CheckCheck, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { SkeletonListPage } from '@/shared/ui/Skeleton';
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
    <div className="space-y-6 text-left page-enter" role="main">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-ink font-heading">Notification Inbox</h1>
            {unreadCount > 0 && <span className="badge badge-brand">{unreadCount} Unread</span>}
          </div>
          <p className="text-body-sm text-ink-secondary">
            Announcements, event confirmations, change request decisions, and system alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="btn btn-secondary"
              aria-label={markingAll ? 'Marking all as read' : `Mark all ${unreadCount} notifications as read`}
            >
              <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={() => loadNotifications()}
            className="btn btn-ghost p-2"
            aria-label="Refresh notifications"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center justify-between animate-fade-in" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadNotifications()} className="label underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      <NotificationFilters
        activeFilter={activeFilter}
        unreadCount={unreadCount}
        onFilterChange={setActiveFilter}
      />

      {filteredNotifs.length === 0 ? (
        <div className="surface text-center py-16 px-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-brand" aria-hidden="true" />
          </div>
          <h3 className="text-body-lg font-bold text-ink font-heading">No notifications to display</h3>
          <p className="text-body-sm text-ink-secondary mt-1 max-w-sm mx-auto">
            You're all caught up! New updates from faculty, moderation, or event registrations will appear here.
          </p>
        </div>
      ) : (
        <div className="surface divide-y animate-fade-in">
          {filteredNotifs.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleNotificationClick}
              onDelete={handleDeleteNotification}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-1 animate-fade-in">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary"
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

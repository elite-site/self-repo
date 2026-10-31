import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Notification } from '@/shared/types';

interface DashboardActivityFeedProps {
  notifications: Notification[];
  error: string | null;
  onRetry: () => void;
  onNotificationClick: (n: Notification) => void;
  onClearAll?: () => void;
  clearing?: boolean;
}

const relativeTime = (value: string | undefined) => {
  const time = value ? new Date(value).getTime() : NaN;
  if (Number.isNaN(time)) return '';
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value as string).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const DashboardActivityFeed: React.FC<DashboardActivityFeedProps> = ({
  notifications,
  error,
  onRetry,
  onNotificationClick,
  onClearAll,
  clearing = false,
}) => {
  return (
    <section className="surface p-4 sm:p-5 lg:p-6" aria-labelledby="activity-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="activity-heading" className="font-heading text-headline-md text-ink">
          Recent activity
        </h2>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={clearing}
              className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Clear all recent activities"
            >
              {clearing ? 'Clearing...' : 'Clear all'}
            </button>
          )}
          <Link
            to="/notifications"
            className="flex items-center gap-1 text-label-lg font-semibold text-ink-brand transition-colors hover:text-brand-hover"
          >
            <span>See all</span>
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-4">
        {error ? (
          <ErrorState bare message={error} onRetry={onRetry} />
        ) : notifications.length === 0 ? (
          <EmptyState
            bare
            icon={Bell}
            title="You're all caught up"
            description="Moderation decisions, announcements and event updates land here."
          />
        ) : (
          <ul className="-mx-2 divide-y divide-edge">
            {notifications.slice(0, 8).map((n) => {
              const isUnread = !n.isRead && n.status !== 'READ';
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onNotificationClick(n)}
                    className="w-full cursor-pointer rounded-lg px-2 py-3 text-left transition-colors duration-fast hover:bg-surface-sunken"
                  >
                    <span className="flex items-start gap-2">
                      {isUnread && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand ring-2 ring-surface"
                          aria-label="Unread"
                          role="img"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-label-lg text-ink ${
                            isUnread ? 'font-semibold' : ''
                          }`}
                        >
                          {n.title || 'Department update'}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-body-sm text-ink-secondary">
                          {n.message || (n as any).content}
                        </span>
                        <span className="mt-1 block text-label-md text-ink-muted">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

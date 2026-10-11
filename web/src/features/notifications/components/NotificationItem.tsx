import React from 'react';
import { Calendar, Award, Vote, Video, Info, ChevronRight } from 'lucide-react';
import { Notification } from '../types';

interface NotificationItemProps {
  notification: Notification;
  onClick: (n: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification: n, onClick }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT':
        return <Calendar className="w-4 h-4 text-brand" />;
      case 'ACADEMIC':
        return <Award className="w-4 h-4 text-brand" />;
      case 'VOTING':
        return <Vote className="w-4 h-4 text-status-review" />;
      case 'MODERATION':
        return <Video className="w-4 h-4 text-status-changes" />;
      default:
        return <Info className="w-4 h-4 text-ink-muted" />;
    }
  };

  return (
    <div
      onClick={() => onClick(n)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(n);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={!n.isRead ? 'Unread notification' : 'Read notification'}
      className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer group ${
        !n.isRead ? 'bg-brand-soft/50 hover:bg-brand-soft' : 'hover:bg-surface-sunken'
      }`}
    >
      <div className="p-2.5 rounded-lg bg-surface-sunken border border-edge shrink-0 mt-0.5">
        {getTypeIcon(n.type)}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="badge badge-draft text-xs">{n.type}</span>
            <h4
              className={`text-body-sm ${
                !n.isRead ? 'font-bold text-ink font-heading' : 'font-medium text-ink-secondary'
              }`}
            >
              {n.title}
            </h4>
          </div>
          <span className="text-label-sm text-ink-muted shrink-0">
            {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'}
          </span>
        </div>

        <p className="text-body-sm text-ink-secondary leading-relaxed">{n.message}</p>
      </div>

      <div className="shrink-0 flex items-center gap-2 pt-1">
        {!n.isRead && (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-brand block" aria-hidden="true" />
            <span className="sr-only">Unread</span>
          </>
        )}
        <ChevronRight
          className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-transform duration-fast"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

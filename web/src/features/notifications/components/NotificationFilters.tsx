import React from 'react';
import { NotificationFilterType } from '../types';

interface NotificationFiltersProps {
  activeFilter: NotificationFilterType;
  unreadCount: number;
  onFilterChange: (filter: NotificationFilterType) => void;
}

const FILTERS: NotificationFilterType[] = ['ALL', 'UNREAD', 'ACADEMIC', 'VOTING', 'VIDEO'];

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  activeFilter,
  unreadCount,
  onFilterChange,
}) => {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Notification filters">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          role="tab"
          aria-selected={activeFilter === filter}
          className={`btn ${activeFilter === filter ? 'btn-primary' : 'btn-secondary'} text-xs`}
        >
          {filter === 'ALL'
            ? 'All Notifications'
            : filter === 'UNREAD'
            ? `Unread (${unreadCount})`
            : filter === 'VIDEO'
            ? 'Video Reviews'
            : filter}
        </button>
      ))}
    </div>
  );
};

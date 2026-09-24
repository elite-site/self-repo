import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Notification } from '../types';
import { Bell, Loader2, Check, CheckCheck, AlertCircle, RefreshCw, Calendar, Award, Vote, Info } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'EVENT' | 'ACADEMIC' | 'VOTING'>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) setNotifs(data);
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      alert('Failed to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {}
  };

  const filteredNotifs = notifs.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.isRead;
    if (activeFilter !== 'ALL') return n.type === activeFilter;
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT':
        return <Calendar className="w-4 h-4 text-[#DC2626]" />;
      case 'ACADEMIC':
        return <Award className="w-4 h-4 text-blue-600" />;
      case 'VOTING':
        return <Vote className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-neutral-500" />;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#0B192C]">Notification Inbox</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-[#DC2626]">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            Announcements, event confirmations, change request decisions, and system alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
            >
              {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-4 h-4 text-neutral-500" />}
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadNotifications} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* FILTER CHIPS */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'UNREAD', 'EVENT', 'ACADEMIC', 'VOTING'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === filter
                ? 'bg-[#0B192C] text-white shadow-xs'
                : 'bg-white border border-[#CBD5E1] text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {filter === 'ALL'
              ? 'All Notifications'
              : filter === 'UNREAD'
              ? `Unread (${unreadCount})`
              : filter}
          </button>
        ))}
      </div>

      {/* NOTIFICATIONS LIST */}
      {filteredEventsListOrEmpty(filteredNotifs, handleMarkSingleRead, getTypeIcon)}
    </div>
  );
};

function filteredEventsListOrEmpty(
  notifs: Notification[],
  handleMarkSingleRead: (id: string) => void,
  getTypeIcon: (type: string) => React.ReactNode
) {
  if (notifs.length === 0) {
    return (
      <div className="text-center py-20 px-4 bg-white border border-[#E2E8F0] rounded-2xl">
        <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h3 className="font-bold text-sm text-[#0B192C]">No notifications to display</h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
          You're all caught up! New updates from faculty, moderation, or event registrations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs divide-y divide-neutral-100">
      {notifs.map((n) => (
        <div
          key={n.id}
          onClick={() => !n.isRead && handleMarkSingleRead(n.id)}
          className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer ${
            !n.isRead ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-neutral-50/80'
          }`}
        >
          <div className="p-2.5 rounded-xl bg-white border border-neutral-200/80 shadow-2xs shrink-0 mt-0.5">
            {getTypeIcon(n.type)}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                  {n.type}
                </span>
                <h4
                  className={`text-xs sm:text-sm ${
                    !n.isRead ? 'font-black text-[#0B192C]' : 'font-semibold text-neutral-700'
                  }`}
                >
                  {n.title}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'}
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">{n.message}</p>
          </div>

          {!n.isRead && (
            <div className="shrink-0 pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] block" title="Unread" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

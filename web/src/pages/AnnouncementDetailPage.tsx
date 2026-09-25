import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { api } from '../services/api';
import { Announcement } from '../types';

export const AnnouncementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAnnouncement = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const data = await api.getAnnouncement(id);
        if (!cancelled) setAnnouncement(data);
      } catch {
        if (!cancelled) {
          setError('This announcement is no longer available.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAnnouncement();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="max-w-xl mx-auto mt-8 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h1 className="text-lg font-black text-[#0B192C]">Announcement unavailable</h1>
        <p className="text-sm text-neutral-500">{error || 'The announcement could not be loaded.'}</p>
        <Link to="/notifications" className="inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to notifications
        </Link>
      </div>
    );
  }

  const publishedAt = announcement.publishedAt || announcement.createdAt;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link to="/notifications" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-[#DC2626]">
        <ArrowLeft className="w-4 h-4" />
        Back to notifications
      </Link>

      <article className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-[#0B192C] to-[#1E293B] px-6 sm:px-8 py-7 text-white">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-red-200 mb-4">
            <Megaphone className="w-4 h-4" />
            Department announcement
          </div>
          <h1 className="text-xl sm:text-2xl font-black leading-tight">{announcement.title}</h1>
          {publishedAt && (
            <div className="flex items-center gap-2 mt-4 text-xs text-neutral-300">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{new Date(publishedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 mb-5">
            <Bell className="w-4 h-4 text-[#DC2626]" />
            {announcement.priority ? `${announcement.priority} priority` : 'Portal update'}
          </div>
          <p className="text-sm sm:text-base text-neutral-700 leading-7 whitespace-pre-wrap">
            {announcement.body || announcement.message}
          </p>
        </div>
      </article>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Megaphone,
} from 'lucide-react';
import { api } from '../services/api';
import { Announcement } from '../types';
import { BrandedLoading } from '../components/BrandedLoading';

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
      <div className="py-24">
        <BrandedLoading fullScreen={false} message="Loading Announcement..." />
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="max-w-xl mx-auto mt-8 p-8 text-center space-y-4 bg-white border border-[#E4E7F2] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h1 className="text-lg font-black text-[#0F172A] font-heading">Announcement unavailable</h1>
        <p className="text-sm text-[#475569]">{error || 'The announcement could not be loaded.'}</p>
        <Link to="/notifications" className="inline-flex items-center gap-2 text-sm font-bold text-[#4F46E5] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to notifications
        </Link>
      </div>
    );
  }

  const publishedAt = announcement.publishedAt || announcement.createdAt;

  return (
    <div className="max-w-3xl mx-auto space-y-5 text-left">
      <Link to="/notifications" className="inline-flex items-center gap-2 text-xs font-bold text-[#475569] hover:text-[#4F46E5] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to notifications
      </Link>

      <article className="bg-white border border-[#E4E7F2] rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] px-6 sm:px-8 py-7 text-white">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#E0E7FF] mb-4">
            <Megaphone className="w-4 h-4 text-[#E0E7FF]" />
            Department announcement
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-heading leading-tight">{announcement.title}</h1>
          {publishedAt && (
            <div className="flex items-center gap-2 mt-4 text-xs text-neutral-300">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{new Date(publishedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold text-[#475569] mb-5">
            <Bell className="w-4 h-4 text-[#4F46E5]" />
            {announcement.priority ? `${announcement.priority} priority` : 'Portal update'}
          </div>
          <p className="text-sm sm:text-base text-[#475569] leading-7 whitespace-pre-wrap">
            {announcement.body || announcement.message}
          </p>
        </div>
      </article>
    </div>
  );
};

export default AnnouncementDetailPage;


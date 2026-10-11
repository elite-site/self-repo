import React from 'react';
import { Users, Clock, Loader2, Trash2 } from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementCardProps {
  announcement: Announcement;
  deleting: boolean;
  onDelete: (a: Announcement) => void;
}

const audienceLabel = (a: Announcement): string => {
  if (a.audience) return String(a.audience).replace(/_/g, ' ');
  if (a.targetAll === false) {
    const parts: string[] = [];
    if (a.targetYear !== null && a.targetYear !== undefined) parts.push(`Year ${a.targetYear}`);
    if (a.targetSection) parts.push(`Section ${a.targetSection}`);
    return parts.length ? parts.join(' · ') : 'Targeted group';
  }
  return 'All Students';
};

const targetsEveryone = (a: Announcement): boolean =>
  a.audience ? a.audience === 'ALL' : a.targetAll !== false;

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement: a,
  deleting,
  onDelete,
}) => {
  return (
    <div className="bg-surface rounded-lg border border-edge p-5 shadow-xs transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ink text-sm truncate">{a.title}</h3>
          <p className="text-xs text-ink-secondary mt-1 line-clamp-2 leading-relaxed whitespace-pre-wrap">
            {a.message ?? a.body ?? ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-semibold text-ink-muted">
            {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
          </div>
          {typeof a.recipientCount === 'number' && (
            <div className="flex items-center gap-1 text-xs text-ink-muted mt-1 justify-end">
              <Users className="w-3.5 h-3.5" /> {a.recipientCount} recipients
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-edge">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted">
          <Clock className="w-3 h-3" /> {a.createdBy ?? a.createdByName ?? 'admin'}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
            targetsEveryone(a)
              ? 'bg-status-bg-approved text-status-approved border-edge'
              : 'bg-surface-canvas text-ink-secondary border-edge'
          }`}
        >
          {audienceLabel(a)}
        </span>
        <button
          onClick={() => onDelete(a)}
          disabled={deleting}
          title={`Delete "${a.title}"`}
          aria-label={`Delete announcement: ${a.title}`}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-status-rejected hover:bg-status-bg-rejected disabled:opacity-50 cursor-pointer"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {deleting ? 'Deleting' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

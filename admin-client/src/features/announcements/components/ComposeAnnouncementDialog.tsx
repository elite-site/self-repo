import React, { useState, useEffect } from 'react';
import { X, Users, Loader2, Send } from 'lucide-react';
import { announcementsApi } from '../api';

const audienceToTargeting = (audience: string) => {
  const match = /^YEAR_(\d+)$/.exec(audience);
  if (!match) return { targetAll: true, targetYear: null, targetSection: null };
  return { targetAll: false, targetYear: parseInt(match[1], 10), targetSection: null };
};

interface ComposeAnnouncementDialogProps {
  onClose: () => void;
  onPublished: () => void;
}

export const ComposeAnnouncementDialog: React.FC<ComposeAnnouncementDialogProps> = ({
  onClose,
  onPublished,
}) => {
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL', scheduledAt: '' });
  const [preview, setPreview] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const fetchPreview = async () => {
    try {
      const res = await announcementsApi.getAnnouncementAudiencePreview(form.audience);
      setPreview(res?.count ?? 0);
    } catch {
      setPreview(null);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [form.audience]);

  const handlePublish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSubmitting(true);
    try {
      await announcementsApi.createAnnouncement({
        title: form.title,
        body: form.body,
        scheduledAt: form.scheduledAt || null,
        ...audienceToTargeting(form.audience),
      });
      onPublished();
      onClose();
    } catch {
      setError('Failed to publish. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-scrim flex items-center justify-center p-4">
      <div className="bg-surface text-ink rounded-lg shadow-2xl border border-edge w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 className="text-base font-semibold text-ink">New Announcement</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="bg-status-bg-rejected border border-edge text-status-rejected text-xs rounded-lg p-3">
              {error}
            </div>
          )}
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Title *</span>
            <input
              value={form.title}
              onChange={e => update('title', e.target.value)}
              className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected"
              placeholder="Announcement title"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Body *</span>
            <textarea
              value={form.body}
              onChange={e => update('body', e.target.value)}
              rows={6}
              className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected resize-none"
              placeholder="Write your announcement here…"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Audience</span>
            <select
              value={form.audience}
              onChange={e => update('audience', e.target.value)}
              className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected"
            >
              <option value="ALL">All Students</option>
              <option value="YEAR_1">Year 1 only</option>
              <option value="YEAR_2">Year 2 only</option>
              <option value="YEAR_3">Year 3 only</option>
              <option value="YEAR_4">Year 4 only</option>
            </select>
          </label>
          {preview !== null && (
            <div className="flex items-center gap-2 text-xs text-ink-secondary bg-status-bg-approved border border-edge rounded-lg px-3 py-2">
              <Users className="w-3.5 h-3.5 text-status-approved" />
              <span>
                This announcement will reach <strong className="text-ink">{preview} student{preview !== 1 ? 's' : ''}</strong>
              </span>
            </div>
          )}
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Schedule (optional)</span>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => update('scheduledAt', e.target.value)}
              className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected"
            />
            <p className="text-xs text-ink-muted mt-1">Leave blank to publish immediately.</p>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t border-edge">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-edge rounded-lg text-xs font-bold text-ink-secondary hover:bg-surface-sunken cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold hover:bg-brand disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {form.scheduledAt ? 'Schedule' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

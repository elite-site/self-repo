import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Send, X, Users, Clock, Loader2, AlertCircle, Inbox, Trash2 } from 'lucide-react';
import { adminApi } from '../services/api';
import { useConfirm } from '../components/ui/ConfirmDialog';

/**
 * Shape returned by GET /admin/api/announcements.
 */
interface Announcement {
  id: string;
  title: string;
  message?: string | null;
  body?: string | null;
  priority?: string | null;
  status?: string | null;
  targetAll?: boolean;
  targetYear?: number | null;
  targetSection?: string | null;
  createdBy?: string | null;
  createdAt: string;
  audience?: string;
  createdByName?: string | null;
  recipientCount?: number;
}

/** Human-readable audience label derived from the announcement's targeting fields. */
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

/**
 * Translate the audience picker into the targeting fields the API understands.
 */
const audienceToTargeting = (audience: string) => {
  const match = /^YEAR_(\d+)$/.exec(audience);
  if (!match) return { targetAll: true, targetYear: null, targetSection: null };
  return { targetAll: false, targetYear: parseInt(match[1], 10), targetSection: null };
};

const ComposeDialog: React.FC<{ onClose: () => void; onPublished: () => void }> = ({ onClose, onPublished }) => {
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL', scheduledAt: '' });
  const [preview, setPreview] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const fetchPreview = async () => {
    try {
      const res = await adminApi.getAnnouncementAudiencePreview(form.audience);
      setPreview(res?.count ?? 0);
    } catch { setPreview(null); }
  };

  useEffect(() => { fetchPreview(); }, [form.audience]);

  const handlePublish = async () => {
    if (!form.title.trim() || !form.body.trim()) { setError('Title and body are required.'); return; }
    setSubmitting(true);
    try {
      await adminApi.createAnnouncement({
        title: form.title,
        body: form.body,
        scheduledAt: form.scheduledAt || null,
        ...audienceToTargeting(form.audience),
      });
      onPublished(); onClose();
    } catch { setError('Failed to publish. Try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-scrim flex items-center justify-center p-4">
      <div className="bg-surface text-ink rounded-lg shadow-2xl border border-edge w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 className="text-base font-semibold text-ink">New Announcement</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="bg-status-bg-rejected border border-edge text-status-rejected text-xs rounded-lg p-3">{error}</div>}
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Title *</span>
            <input value={form.title} onChange={e => update('title', e.target.value)} className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected" placeholder="Announcement title" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Body *</span>
            <textarea value={form.body} onChange={e => update('body', e.target.value)} rows={6} className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected resize-none" placeholder="Write your announcement here…" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Audience</span>
            <select value={form.audience} onChange={e => update('audience', e.target.value)} className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected">
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
              <span>This announcement will reach <strong className="text-ink">{preview} student{preview !== 1 ? 's' : ''}</strong></span>
            </div>
          )}
          <label className="block">
            <span className="text-xs font-bold text-ink-secondary">Schedule (optional)</span>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => update('scheduledAt', e.target.value)} className="mt-1 w-full text-sm bg-surface text-ink border border-edge rounded-lg px-3 py-2 focus:outline-none focus:border-status-rejected" />
            <p className="text-xs text-ink-muted mt-1">Leave blank to publish immediately.</p>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t border-edge">
          <button onClick={onClose} className="flex-1 py-2.5 border border-edge rounded-lg text-xs font-bold text-ink-secondary hover:bg-surface-sunken cursor-pointer">Cancel</button>
          <button onClick={handlePublish} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold hover:bg-brand disabled:opacity-50 cursor-pointer">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {form.scheduledAt ? 'Schedule' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Communications: React.FC = () => {
  const confirm = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.getAnnouncements?.();
      const list = Array.isArray(res) ? res : (res?.announcements ?? []);
      setAnnouncements(list);
    } catch { setError('Failed to load announcements.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleDelete = async (a: Announcement) => {
    const confirmed = await confirm({
      title: `Delete “${a.title}”?`,
      description: 'This permanently removes the announcement and the notification sent to students. This cannot be undone.',
      confirmLabel: 'Delete announcement',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(a.id);
    setActionError(null);
    try {
      await adminApi.deleteAnnouncement(a.id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== a.id));
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || 'Failed to delete the announcement. Please retry.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {showCompose && <ComposeDialog onClose={() => setShowCompose(false)} onPublished={fetchAnnouncements} />}

      {actionError && (
        <div className="flex items-start gap-2 bg-status-bg-rejected border border-edge text-status-rejected text-xs rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} className="shrink-0 font-bold hover:underline cursor-pointer">Dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-status-rejected" />
          <div>
            <h1 className="text-xl font-semibold text-ink">Announcements</h1>
            <p className="text-xs text-ink-muted">Send messages to all or specific groups of students</p>
          </div>
        </div>
        <button onClick={() => setShowCompose(true)} className="flex items-center gap-2 px-4 py-2 bg-status-solid-rejected text-on-primary rounded-lg text-xs font-bold hover:bg-brand cursor-pointer">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-surface rounded-lg border border-edge">
          <Loader2 className="w-7 h-7 animate-spin text-status-rejected" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 h-48 justify-center bg-surface rounded-lg border border-edge">
          <AlertCircle className="w-8 h-8 text-status-rejected" />
          <p className="text-sm text-ink-muted">{error}</p>
          <button onClick={fetchAnnouncements} className="text-xs text-status-rejected font-semibold hover:underline cursor-pointer">Retry</button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-surface rounded-lg border border-edge gap-3">
          <Inbox className="w-10 h-10 text-ink-muted" />
          <p className="text-sm font-semibold text-ink-muted">No announcements yet</p>
          <button onClick={() => setShowCompose(true)} className="text-xs text-status-rejected font-semibold hover:underline cursor-pointer">Write the first one</button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-surface rounded-lg border border-edge p-5 shadow-xs transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink text-sm truncate">{a.title}</h3>
                  <p className="text-xs text-ink-secondary mt-1 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                    {a.message ?? a.body ?? ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-ink-muted">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</div>
                  {typeof a.recipientCount === 'number' && (
                    <div className="flex items-center gap-1 text-xs text-ink-muted mt-1 justify-end">
                      <Users className="w-3 h-3" /> {a.recipientCount} recipients
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-edge">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted">
                  <Clock className="w-3 h-3" /> {a.createdBy ?? a.createdByName ?? 'admin'}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                  targetsEveryone(a)
                    ? 'bg-status-bg-approved text-status-approved border-edge'
                    : 'bg-surface-canvas text-ink-secondary border-edge'
                }`}>
                  {audienceLabel(a)}
                </span>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={deletingId === a.id}
                  title={`Delete "${a.title}"`}
                  aria-label={`Delete announcement: ${a.title}`}
                  className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-status-rejected hover:bg-status-bg-rejected disabled:opacity-50 cursor-pointer"
                >
                  {deletingId === a.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                  {deletingId === a.id ? 'Deleting' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Communications;

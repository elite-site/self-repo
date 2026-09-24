import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Send, X, Users, Clock, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { adminApi } from '../services/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
  createdByName: string;
  recipientCount: number;
}

const ComposeDialog: React.FC<{ onClose: () => void; onPublished: () => void }> = ({ onClose, onPublished }) => {
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL', scheduledAt: '' });
  const [preview, setPreview] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const fetchPreview = async () => {
    try {
      const res = await adminApi.getAnnouncementAudiencePreview?.(form.audience) ?? { count: 0 };
      setPreview(res.count ?? 0);
    } catch { setPreview(null); }
  };

  useEffect(() => { fetchPreview(); }, [form.audience]);

  const handlePublish = async () => {
    if (!form.title.trim() || !form.body.trim()) { setError('Title and body are required.'); return; }
    setSubmitting(true);
    try {
      await adminApi.createAnnouncement?.(form);
      onPublished(); onClose();
    } catch { setError('Failed to publish. Try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <h2 className="text-base font-extrabold text-[#0B192C]">New Announcement</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-[#0B192C] cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">{error}</div>}
          <label className="block">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Title *</span>
            <input value={form.title} onChange={e => update('title', e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" placeholder="Announcement title" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Body *</span>
            <textarea value={form.body} onChange={e => update('body', e.target.value)} rows={6} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626] resize-none" placeholder="Write your announcement here..." />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Audience</span>
            <select value={form.audience} onChange={e => update('audience', e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]">
              <option value="ALL">All Students</option>
              <option value="YEAR_1">Year 1 only</option>
              <option value="YEAR_2">Year 2 only</option>
              <option value="YEAR_3">Year 3 only</option>
              <option value="YEAR_4">Year 4 only</option>
            </select>
          </label>
          {preview !== null && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>This announcement will reach <strong className="text-[#0B192C]">{preview} student{preview !== 1 ? 's' : ''}</strong></span>
            </div>
          )}
          <label className="block">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Schedule (optional)</span>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => update('scheduledAt', e.target.value)} className="mt-1 w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#DC2626]" />
            <p className="text-[10px] text-neutral-400 mt-1">Leave blank to publish immediately.</p>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t border-[#E2E8F0]">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-50 cursor-pointer">Cancel</button>
          <button onClick={handlePublish} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#DC2626] text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {form.scheduledAt ? 'Schedule' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Communications: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.getAnnouncements?.() ?? { announcements: [] };
      setAnnouncements(res.announcements ?? []);
    } catch { setError('Failed to load announcements.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  return (
    <div className="space-y-6">
      {showCompose && <ComposeDialog onClose={() => setShowCompose(false)} onPublished={fetchAnnouncements} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-[#DC2626]" />
          <div>
            <h1 className="text-xl font-extrabold text-[#0B192C]">Announcements</h1>
            <p className="text-xs text-neutral-500">Send messages to all or specific groups of students</p>
          </div>
        </div>
        <button onClick={() => setShowCompose(true)} className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-[#E2E8F0]">
          <Loader2 className="w-7 h-7 animate-spin text-[#DC2626]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 h-48 justify-center bg-white rounded-2xl border border-red-100">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-neutral-500">{error}</p>
          <button onClick={fetchAnnouncements} className="text-xs text-[#DC2626] font-semibold hover:underline cursor-pointer">Retry</button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-[#E2E8F0] gap-3">
          <Inbox className="w-10 h-10 text-neutral-200" />
          <p className="text-sm font-semibold text-neutral-500">No announcements yet</p>
          <button onClick={() => setShowCompose(true)} className="text-xs text-[#DC2626] font-semibold hover:underline cursor-pointer">Write the first one</button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#0B192C] text-sm truncate">{a.title}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{a.body}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-neutral-400">{new Date(a.createdAt).toLocaleDateString()}</div>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1 justify-end">
                    <Users className="w-3 h-3" /> {a.recipientCount} recipients
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#E2E8F0]">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-neutral-400">
                  <Clock className="w-3 h-3" /> {a.createdByName}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  a.audience === 'ALL' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {a.audience.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

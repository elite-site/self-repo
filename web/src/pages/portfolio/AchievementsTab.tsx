import React, { useEffect, useState } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { Achievement } from '../../types';
import { Plus, Trophy, Loader2, AlertCircle, Trash2, X, Calendar, Pencil, ExternalLink } from 'lucide-react';

export const AchievementsTab: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organization, setOrganization] = useState('');
  const [date, setDate] = useState('');

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAchievements();
      if (Array.isArray(data)) setAchievements(data);
    } catch {
      setError('Could not load achievements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingAchievement(null);
    setTitle('');
    setDescription('');
    setOrganization('');
    setDate(new Date().toISOString().split('T')[0]);
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (a: Achievement) => {
    setEditingAchievement(a);
    setTitle(a.title || '');
    setDescription(a.description || '');
    setOrganization(a.organization || '');
    setDate(a.date ? new Date(a.date).toISOString().split('T')[0] : '');
    setModalError(null);
    setModalOpen(true);
  };

  const handleSaveAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setModalError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      organization: organization.trim(),
      date: date || new Date().toISOString(),
    };

    try {
      if (editingAchievement) {
        await api.updateAchievement(editingAchievement.id, payload);
      } else {
        await api.createAchievement(payload);
      }
      setModalOpen(false);
      loadAchievements();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save achievement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this achievement?')) return;
    try {
      await api.deleteAchievement(id);
      loadAchievements();
    } catch {
      alert('Failed to delete achievement.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#DC2626]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B192C]">Honors & Achievements</h2>
          <p className="text-xs text-neutral-500">Record hackathon awards, academic distinctions, and competitions</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Achievement</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACHIEVEMENTS LIST */}
      {achievements.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/60">
          <Trophy className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-neutral-700">No achievements recorded yet</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto mb-4">
            Add contest wins, hackathon certificates, coding competition ranks, or academic honors.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B192C] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Achievement</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="p-5 border border-[#E2E8F0] rounded-2xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 transition-all text-left"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#0B192C]">{a.title}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      a.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : a.status === 'CHANGES_REQUESTED'
                        ? 'bg-orange-50 text-orange-800 border border-orange-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {a.status === 'CHANGES_REQUESTED' ? 'Revision Requested' : (a.status || 'Pending')}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">{a.description}</p>
                {a.status === 'CHANGES_REQUESTED' && (
                  <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 my-1.5">
                    <strong className="font-bold">Faculty Revision Note: </strong>
                    <span>{a.reviewNote || 'The admin requested changes on this achievement. Click the edit icon to update and re-submit.'}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 pt-1">
                  <span>{a.organization || 'Department'}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {a.date ? new Date(a.date).toLocaleDateString() : 'N/A'}
                  </span>
                  {(a.viewUrl || a.proofUrl) && (
                    <>
                      <span>·</span>
                      <a
                        href={resolveMediaUrl((a.viewUrl || a.proofUrl)!)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] hover:underline"
                      >
                        <span>Proof</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 self-end sm:self-center">
                <button
                  onClick={() => handleOpenEditModal(a)}
                  className="p-2 text-neutral-400 hover:text-[#0B192C] transition-colors cursor-pointer rounded-lg hover:bg-neutral-50"
                  title="Edit achievement"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2 text-neutral-300 hover:text-red-600 transition-colors cursor-pointer rounded-lg hover:bg-neutral-50"
                  title="Delete achievement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT ACHIEVEMENT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-[#0B192C]">
                {editingAchievement ? 'Edit Honor or Achievement' : 'Add Honor or Achievement'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAchievement} className="space-y-4 pt-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0B192C] mb-1">Achievement Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 1st Place - Smart India Hackathon"
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B192C] mb-1">Issuing Body / Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Ministry of Education / ACM Student Chapter"
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B192C] mb-1">Date Achieved</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B192C] mb-1">Description / Details</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the criteria, project created, or team role..."
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B5121B] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editingAchievement ? 'Update Achievement' : 'Save Achievement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

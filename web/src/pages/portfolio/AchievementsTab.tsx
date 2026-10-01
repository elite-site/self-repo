import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, resolveMediaUrl } from '../../services/api';
import { Achievement } from '../../types';
import { Plus, Trophy, Loader2, AlertCircle, Trash2, X, Calendar, Pencil, ExternalLink } from 'lucide-react';
import { BrandedLoading } from '../../components/BrandedLoading';

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

  const modalTitleRef = useRef<HTMLHeadingElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

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

  // Focus management for modal
  useEffect(() => {
    if (modalOpen) {
      lastFocusedElement.current = document.activeElement as HTMLElement;
      // Focus the first input after modal renders
      setTimeout(() => firstInputRef.current?.focus(), 0);
    } else if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, [modalOpen]);

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
      <div className="py-16 animate-fade-in">
        <BrandedLoading fullScreen={false} message="Loading Achievements..." />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-approved">Approved</span>;
      case 'CHANGES_REQUESTED':
        return <span className="badge badge-changes">Revision Requested</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected">Rejected</span>;
      case 'PENDING':
        return <span className="badge badge-pending">Pending Review</span>;
      case 'DRAFT':
        return <span className="badge badge-draft">Draft</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-body-lg font-bold text-ink font-heading">Honors & Achievements</h2>
          <p className="text-body-sm text-ink-secondary">Record hackathon awards, academic distinctions, and competitions</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary"
          aria-label="Add new achievement"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Achievement</span>
        </button>
      </div>

      {error && (
        <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center gap-2 animate-fade-in" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* ACHIEVEMENTS LIST */}
      {achievements.length === 0 ? (
        <div className="surface text-center py-16 px-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-6 h-6 text-brand" aria-hidden="true" />
          </div>
          <h3 className="text-body-lg font-bold text-ink font-heading">No achievements recorded yet</h3>
          <p className="text-body-sm text-ink-secondary mt-1 max-w-sm mx-auto mb-4">
            Add contest wins, hackathon certificates, coding competition ranks, or academic honors.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Achievement</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                {a.thumbnailUrl && (
                  <div className="w-16 h-12 rounded-lg bg-surface-sunken overflow-hidden shrink-0 border border-edge">
                    <img
                      src={resolveMediaUrl(a.thumbnailUrl)}
                      alt={a.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-body-sm text-ink font-heading">{a.title}</h3>
                    {getStatusBadge(a.status || 'PENDING')}
                  </div>
                  <p className="text-body-sm text-ink-secondary">{a.description}</p>
                  {a.status === 'CHANGES_REQUESTED' && (
                    <div className="p-2.5 bg-status-bg-changes border border-status-changes rounded-lg text-body-sm text-status-changes my-1.5">
                      <strong className="font-bold">Faculty Revision Note: </strong>
                      <span>{a.reviewNote || 'The admin requested changes on this achievement. Click the edit icon to update and re-submit.'}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-label-sm text-ink-muted pt-1">
                    <span>{a.organization || 'Department'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" aria-hidden="true" />
                      {a.date ? new Date(a.date).toLocaleDateString() : 'To be announced'}
                    </span>
                    {(a.viewUrl || a.proofUrl) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <a
                          href={resolveMediaUrl((a.viewUrl || a.proofUrl)!)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-label-sm font-bold text-brand hover:underline"
                        >
                          <span>Proof</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 self-end sm:self-center">
                <button
                  onClick={() => handleOpenEditModal(a)}
                  className="btn btn-ghost p-2"
                  aria-label={`Edit ${a.title}`}
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="btn btn-ghost p-2 text-status-rejected hover:bg-status-bg-rejected"
                  aria-label={`Delete ${a.title}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT ACHIEVEMENT MODAL */}
      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="surface max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-modal animate-scale-in text-left my-auto"
            ref={modalTitleRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-edge sticky -top-6 bg-surface pt-0 -mt-1 z-10">
              <h3 id="achievement-modal-title" className="text-body-lg font-bold text-ink font-heading">
                {editingAchievement ? 'Edit Honor or Achievement' : 'Add Honor or Achievement'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-ghost p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveAchievement} className="space-y-4 pt-4">
              {modalError && (
                <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label htmlFor="achievement-title" className="label">Achievement Title <span className="text-status-rejected" aria-hidden="true">*</span></label>
                <input
                  id="achievement-title"
                  ref={firstInputRef}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 1st Place - Smart India Hackathon"
                  className="input"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="achievement-description" className="label">Description</label>
                <textarea
                  id="achievement-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details about the award, your contribution, or rank..."
                  className="textarea"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="achievement-organization" className="label">Awarding Organization</label>
                  <input
                    id="achievement-organization"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Ministry of Education"
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="achievement-date" className="label">Date Received</label>
                  <input
                    id="achievement-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-edge mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="btn btn-primary"
                  aria-busy={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{editingAchievement ? 'Update Achievement' : 'Save Achievement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AchievementsTab;

import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { Achievement } from '../../types';
import { Plus, Trophy, Loader2, Trash2, Calendar, Pencil } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

const statusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <span className="badge badge-approved">Approved</span>;
    case 'CHANGES_REQUESTED':
      return <span className="badge badge-changes">Revision requested</span>;
    case 'REJECTED':
      return <span className="badge badge-rejected">Rejected</span>;
    case 'PENDING':
      return <span className="badge badge-pending">Pending review</span>;
    case 'DRAFT':
      return <span className="badge badge-draft">Draft</span>;
    default:
      return <span className="badge badge-draft">{status}</span>;
  }
};

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="space-y-3">
    <legend className="text-label-sm uppercase tracking-wider text-ink-muted">{title}</legend>
    {children}
  </fieldset>
);

export const AchievementsTab: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organization, setOrganization] = useState('');
  const [date, setDate] = useState('');

  const firstInputRef = useRef<HTMLInputElement>(null);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAchievements();
      if (Array.isArray(data)) setAchievements(data);
    } catch {
      setError('We could not load your achievements. Check your connection and try again.');
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
    setTitleError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (a: Achievement) => {
    setEditingAchievement(a);
    setTitle(a.title || '');
    setDescription(a.description || '');
    setOrganization(a.organization || '');
    setDate(a.date ? new Date(a.date).toISOString().split('T')[0] : '');
    setModalError(null);
    setTitleError(null);
    setModalOpen(true);
  };

  const handleSaveAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Give this achievement a title.');
      return;
    }

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
        showToast('Achievement updated.');
      } else {
        await api.createAchievement(payload);
        showToast('Achievement added.');
      }
      setModalOpen(false);
      loadAchievements();
    } catch (err: any) {
      setModalError(
        err.response?.data?.message || 'We could not save this achievement. Your changes are still here — try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (achievement: Achievement) => {
    const confirmed = await confirm({
      title: 'Delete this achievement?',
      description: `“${achievement.title}” will be removed from your portfolio. This cannot be undone.`,
      confirmLabel: 'Delete achievement',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.deleteAchievement(achievement.id);
      showToast('Achievement deleted.');
      loadAchievements();
    } catch {
      showToast('We could not delete that achievement. Try again.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-headline-sm text-ink">
            Achievements{' '}
            <span className="font-sans text-body-sm font-normal text-ink-muted">{achievements.length}</span>
          </h2>
          <p className="mt-0.5 text-body-sm text-ink-secondary">
            Hackathon results, competition ranks and academic distinctions.
          </p>
        </div>
        <button type="button" onClick={handleOpenCreateModal} className="btn btn-primary shrink-0">
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          <span>Add achievement</span>
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={loadAchievements} />}

      {loading ? (
        <>
          <span className="sr-only" role="status">
            Loading your achievements
          </span>
          <ul className="surface divide-y divide-edge" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="space-y-2 p-4">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-4 w-2/3" />
              </li>
            ))}
          </ul>
        </>
      ) : achievements.length === 0 && !error ? (
        <EmptyState
          icon={Trophy}
          title="No achievements recorded yet"
          description="Add contest wins, hackathon results, coding ranks or academic honours so they appear on your public profile."
          action={
            <button type="button" onClick={handleOpenCreateModal} className="btn btn-primary">
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              <span>Add achievement</span>
            </button>
          }
        />
      ) : achievements.length > 0 ? (
        <ul className="surface divide-y divide-edge">
          {achievements.map((a) => (
            <li key={a.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-label-lg font-semibold text-ink">{a.title}</h3>
                  {statusBadge(a.status || 'PENDING')}
                </div>
                {a.description && (
                  <p className="mt-1 text-body-sm text-ink-secondary">{a.description}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-label-md text-ink-muted">
                  {a.organization && <span>{a.organization}</span>}
                  {a.organization && a.date && <span aria-hidden="true">·</span>}
                  <span className="flex items-center gap-1">
                    <Calendar size={12} strokeWidth={2} aria-hidden="true" />
                    {a.date ? new Date(a.date).toLocaleDateString() : 'No date set'}
                  </span>
                </div>
                {a.status === 'CHANGES_REQUESTED' && (
                  <div className="mt-2 rounded-lg border border-status-changes bg-status-bg-changes px-3 py-2 text-body-sm text-status-changes">
                    <strong className="font-semibold">Faculty revision note: </strong>
                    <span>
                      {a.reviewNote ||
                        'Changes were requested on this achievement. Edit it to update and re-submit.'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1 self-start">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(a)}
                  className="btn btn-ghost px-2"
                  aria-label={`Edit ${a.title}`}
                >
                  <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  className="btn btn-ghost px-2 text-ink-muted hover:text-status-rejected"
                  aria-label={`Delete ${a.title}`}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAchievement ? 'Edit achievement' : 'Add achievement'}
        description="Only the title is required."
        initialFocusRef={firstInputRef}
      >
        <form onSubmit={handleSaveAchievement} className="space-y-5" noValidate>
          {modalError && <ErrorState bare message={modalError} />}

          <FormSection title="The achievement">
            <div>
              <label htmlFor="achievement-title" className="label">
                Title <span className="text-status-rejected">*</span>
              </label>
              <input
                id="achievement-title"
                ref={firstInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError(null);
                }}
                placeholder="1st place — Smart India Hackathon"
                className="input"
                aria-required="true"
                aria-invalid={Boolean(titleError)}
                aria-describedby={titleError ? 'achievement-title-error' : undefined}
              />
              {titleError && (
                <p id="achievement-title-error" className="error-text" role="alert">
                  {titleError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="achievement-description" className="label">
                Description
              </label>
              <textarea
                id="achievement-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The award, your contribution, and the result."
                className="textarea"
              />
            </div>
          </FormSection>

          <FormSection title="When and where">
            <div>
              <label htmlFor="achievement-organization" className="label">
                Awarding organisation
              </label>
              <input
                id="achievement-organization"
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Ministry of Education"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="achievement-date" className="label">
                Date received
              </label>
              <input
                id="achievement-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>
          </FormSection>

          <div className="flex flex-wrap justify-end gap-3 border-t border-edge pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary" aria-busy={saving}>
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              <span>{saving ? 'Saving…' : editingAchievement ? 'Save changes' : 'Save achievement'}</span>
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default AchievementsTab;

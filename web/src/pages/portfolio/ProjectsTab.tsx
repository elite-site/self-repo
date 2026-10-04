import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { Project } from '../../types';
import { Plus, Github, ExternalLink, Loader2, Trash2, FolderGit2, Pencil } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { ProjectBento } from '../../components/ProjectBento';

/** The portal caps a portfolio at five projects; mirrored in the header count. */
const MAX_PROJECTS = 5;

interface FieldErrors {
  title?: string;
  description?: string;
  githubUrl?: string;
  videoUrl?: string;
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return <span className="badge badge-approved">Approved</span>;
    case 'CHANGES_REQUESTED':
      return <span className="badge badge-changes">Changes requested</span>;
    case 'REJECTED':
      return <span className="badge badge-rejected">Rejected</span>;
    case 'PENDING':
    case 'SUBMITTED':
      return <span className="badge badge-pending">Under review</span>;
    default:
      return <span className="badge badge-draft">{status}</span>;
  }
};

/** Two letters standing in for a thumbnail, which the project model has no field for. */
const monogram = (title: string) =>
  title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'PR';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="space-y-3">
    <legend className="text-label-sm uppercase tracking-wider text-ink-muted">{title}</legend>
    {children}
  </fieldset>
);

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} className="error-text" role="alert">
      {message}
    </p>
  ) : null;

export const ProjectsTab: React.FC = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const firstInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjects();
      if (Array.isArray(data)) setProjects(data);
    } catch {
      setError('We could not load your projects. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setTechStackInput('');
    setGithubUrl('');
    setVideoUrl('');
    setModalError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Project) => {
    setEditingProject(p);
    setTitle(p.title || '');
    setDescription(p.description || '');
    setTechStackInput(p.techStack?.join(', ') || '');
    setGithubUrl(p.githubUrl || '');
    setVideoUrl(p.videoUrl || '');
    setModalError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'A project needs a name.';
    if (!description.trim()) next.description = 'Add a short description so this reads as a portfolio entry.';
    if (githubUrl.trim() && !isHttpUrl(githubUrl)) next.githubUrl = 'Enter a full link starting with https://';
    if (videoUrl.trim() && !isHttpUrl(videoUrl)) next.videoUrl = 'Enter a full link starting with https://';
    return next;
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems = validate();
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSaving(true);
    setModalError(null);

    const techStack = techStackInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      techStack,
      githubUrl: githubUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
    };

    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, payload);
        showToast('Project updated.');
      } else {
        await api.createProject(payload);
        showToast('Project added.');
      }
      setModalOpen(false);
      loadProjects();
    } catch (err: any) {
      setModalError(
        err.response?.data?.message || 'We could not save this project. Your changes are still here — try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = await confirm({
      title: 'Delete this project?',
      description: `“${project.title}” will be removed from your portfolio. This cannot be undone.`,
      confirmLabel: 'Delete project',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.deleteProject(project.id);
      showToast('Project removed.');
      loadProjects();
    } catch {
      showToast('We could not delete that project. Try again.', 'error');
    }
  };

  const atLimit = projects.length >= MAX_PROJECTS;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-headline-sm text-ink">
            Projects{' '}
            <span className="font-sans text-body-sm font-normal text-ink-muted">
              {projects.length} of {MAX_PROJECTS}
            </span>
          </h2>
          <p className="mt-0.5 text-body-sm text-ink-secondary">
            What you built, what you built it with, and where to see it.
          </p>
        </div>
        {projects.length > 0 && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            disabled={atLimit}
            className="btn btn-primary shrink-0"
            aria-label={atLimit ? `Maximum of ${MAX_PROJECTS} projects reached` : 'Add project'}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            <span>Add project</span>
          </button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={loadProjects} />}

      {loading ? (
        <>
          <span className="sr-only" role="status">
            Loading your projects
          </span>
          <ul className="surface divide-y divide-edge" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-5 p-4">
                <div className="skeleton h-12 w-12 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-4 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : projects.length === 0 && !error ? (
        <EmptyState
          icon={FolderGit2}
          title="Your portfolio is empty"
          description="Showcase your work by adding your first project — what it does, the stack you used, and a link to the repository."
          action={
            <button type="button" onClick={handleOpenCreateModal} className="btn btn-primary">
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              <span>Add project</span>
            </button>
          }
        />
      ) : projects.length > 0 ? (
        <ProjectBento
          projects={projects}
          showStatus
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
        />
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProject ? 'Edit project' : 'Add project'}
        description="Only the name and description are required."
        initialFocusRef={firstInputRef}
      >
        <form onSubmit={handleSaveProject} className="space-y-5" noValidate>
          {modalError && <ErrorState bare message={modalError} />}

          <FormSection title="Basic information">
            <div>
              <label htmlFor="project-title" className="label">
                Project name <span className="text-status-rejected">*</span>
              </label>
              <input
                id="project-title"
                ref={firstInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="Distributed task queue"
                className="input"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'project-title-error' : undefined}
              />
              <FieldError id="project-title-error" message={fieldErrors.title} />
            </div>

            <div>
              <label htmlFor="project-description" className="label">
                Description <span className="text-status-rejected">*</span>
              </label>
              <textarea
                id="project-description"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="What it does, what you built, and what you learned."
                className="textarea"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? 'project-description-error' : 'project-description-hint'}
              />
              <p id="project-description-hint" className="hint">
                Two or three sentences is plenty.
              </p>
              <FieldError id="project-description-error" message={fieldErrors.description} />
            </div>
          </FormSection>

          <FormSection title="Project details">
            <div>
              <label htmlFor="project-techstack" className="label">
                Technologies
              </label>
              <input
                id="project-techstack"
                type="text"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                placeholder="React, Node.js, Postgres"
                className="input"
                aria-describedby="project-techstack-hint"
              />
              <p id="project-techstack-hint" className="hint">
                Separate each technology with a comma.
              </p>
            </div>
          </FormSection>

          <FormSection title="Links">
            <div>
              <label htmlFor="project-github" className="label">
                GitHub repository
              </label>
              <input
                id="project-github"
                type="url"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, githubUrl: undefined }));
                }}
                placeholder="https://github.com/you/project"
                className="input"
                aria-invalid={Boolean(fieldErrors.githubUrl)}
                aria-describedby={fieldErrors.githubUrl ? 'project-github-error' : undefined}
              />
              <FieldError id="project-github-error" message={fieldErrors.githubUrl} />
            </div>

            <div>
              <label htmlFor="project-video" className="label">
                Live demo or video
              </label>
              <input
                id="project-video"
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, videoUrl: undefined }));
                }}
                placeholder="https://project.yoursite.com"
                className="input"
                aria-invalid={Boolean(fieldErrors.videoUrl)}
                aria-describedby={fieldErrors.videoUrl ? 'project-video-error' : undefined}
              />
              <FieldError id="project-video-error" message={fieldErrors.videoUrl} />
            </div>
          </FormSection>

          <div className="flex flex-wrap justify-end gap-3 border-t border-edge pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary" aria-busy={saving}>
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              <span>{saving ? 'Saving…' : 'Save project'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsTab;

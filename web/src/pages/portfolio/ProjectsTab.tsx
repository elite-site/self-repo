import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { Project } from '../../types';
import { Plus, Github, ExternalLink, Loader2, AlertCircle, Trash2, X, FolderGit2, Pencil } from 'lucide-react';
import { BrandedLoading } from '../../components/BrandedLoading';
import { useToast } from '../../components/Toast';

export const ProjectsTab: React.FC = () => {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const modalTitleRef = useRef<HTMLHeadingElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProjects();
      if (Array.isArray(data)) setProjects(data);
    } catch {
      setError('Could not load projects. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Focus management for modal
  useEffect(() => {
    if (modalOpen) {
      lastFocusedElement.current = document.activeElement as HTMLElement;
      setTimeout(() => firstInputRef.current?.focus(), 0);
    } else if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, [modalOpen]);

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setTechStackInput('');
    setGithubUrl('');
    setVideoUrl('');
    setModalError(null);
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
    setModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
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
      } else {
        await api.createProject(payload);
      }
      setModalOpen(false);
      loadProjects();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this project?')) return;
    try {
      await api.deleteProject(id);
      showToast('Project removed.');
      loadProjects();
    } catch {
      showToast('Failed to delete project.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-16 animate-fade-in">
        <BrandedLoading fullScreen={false} message="Loading Projects..." />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge badge-approved">Approved</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected">Rejected</span>;
      case 'PENDING':
        return <span className="badge badge-pending">Pending Review</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-left page-enter" role="main">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-body-lg font-bold text-ink font-heading">Project Portfolio ({projects.length}/5)</h2>
          <p className="text-body-sm text-ink-secondary">Showcase technical builds, full-stack applications, and research code</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          disabled={projects.length >= 5}
          className="btn btn-primary disabled:opacity-40"
          aria-label={projects.length >= 5 ? 'Maximum of 5 projects reached' : 'Add new project'}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Project</span>
        </button>
      </div>

      {error && (
        <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center gap-2 animate-fade-in" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* PROJECTS GRID */}
      {projects.length === 0 ? (
        <div className="surface text-center py-16 px-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <FolderGit2 className="w-6 h-6 text-brand" aria-hidden="true" />
          </div>
          <h3 className="text-body-lg font-bold text-ink font-heading">No projects added yet</h3>
          <p className="text-body-sm text-ink-secondary mt-1 max-w-sm mx-auto mb-4">
            Upload your technical projects with GitHub links and tech stack tags to build your recruitment profile.
          </p>
          <button
            onClick={handleOpenCreateModal}
            disabled={projects.length >= 5}
            className="btn btn-primary"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Your First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {projects.map((p) => (
            <div
              key={p.id}
              className="surface p-5 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-body-sm text-ink font-heading line-clamp-1">{p.title}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getStatusBadge(p.status)}
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="btn btn-ghost p-1"
                      aria-label={`Edit ${p.title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="btn btn-ghost p-1 text-ink-muted hover:text-status-rejected"
                      aria-label={`Delete ${p.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="text-body-sm text-ink-secondary line-clamp-2 leading-relaxed">{p.description}</p>

                {/* Tech stack badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.techStack?.map((t) => (
                    <span
                      key={t}
                      className="badge badge-brand text-[10px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-edge flex items-center justify-between text-label-sm">
                {p.githubUrl ? (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-brand font-semibold"
                  >
                    <Github className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Repository</span>
                  </a>
                ) : (
                  <span className="text-ink-muted">No repo link</span>
                )}

                {p.videoUrl && (
                  <a
                    href={p.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand hover:underline font-semibold"
                  >
                    <span>Demo</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT PROJECT MODAL */}
      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6 bg-scrim backdrop-blur-xs animate-fade-in overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-modal-title"
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
              <h3 id="project-modal-title" className="text-body-lg font-bold text-ink font-heading">
                {editingProject ? 'Edit Technical Project' : 'Add New Technical Project'}
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

            <form onSubmit={handleSaveProject} className="space-y-4 pt-4">
              {modalError && (
                <div className="surface-sunken border border-status-rejected bg-status-bg-rejected text-status-rejected text-body-sm flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label htmlFor="project-title" className="label">Project Title <span className="text-status-rejected" aria-hidden="true">*</span></label>
                <input
                  id="project-title"
                  ref={firstInputRef}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Queue"
                  className="input"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="project-description" className="label">Description <span className="text-status-rejected" aria-hidden="true">*</span></label>
                <textarea
                  id="project-description"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the system architecture, problems solved, and outcomes..."
                  className="textarea"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="project-techstack" className="label">Technologies / Tech Stack (comma separated)</label>
                <input
                  id="project-techstack"
                  type="text"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  placeholder="e.g. React, Node.js, Redis, Docker"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="project-github" className="label">GitHub Repo URL</label>
                  <input
                    id="project-github"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="project-video" className="label">Live Demo / Video URL</label>
                  <input
                    id="project-video"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
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
                  disabled={saving || !title.trim() || !description.trim()}
                  className="btn btn-primary"
                  aria-busy={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{editingProject ? 'Update Project' : 'Save Project'}</span>
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

export default ProjectsTab;

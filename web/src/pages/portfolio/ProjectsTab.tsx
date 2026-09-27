import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Project } from '../../types';
import { Plus, Github, ExternalLink, Loader2, AlertCircle, Trash2, X, FolderGit2, Pencil } from 'lucide-react';
import { BrandedLoading } from '../../components/BrandedLoading';

export const ProjectsTab: React.FC = () => {
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
      loadProjects();
    } catch {
      alert('Failed to delete project.');
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <BrandedLoading fullScreen={false} message="Loading Projects..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] font-heading">Project Portfolio ({projects.length}/5)</h2>
          <p className="text-xs text-[#475569]">Showcase technical builds, full-stack applications, and research code</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          disabled={projects.length >= 5}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-opacity shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-[#E11D48] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PROJECTS GRID */}
      {projects.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-[#E4E7F2] rounded-lg bg-[#F7F8FC]">
          <FolderGit2 className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#0F172A] font-heading">No projects added yet</h3>
          <p className="text-xs text-[#475569] mt-1 max-w-sm mx-auto mb-4">
            Upload your technical projects with GitHub links and tech stack tags to build your recruitment profile.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-lg text-xs font-bold transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Your First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <div
              key={p.id}
              className="border border-[#E4E7F2] rounded-lg p-5 hover:border-[#4F46E5]/40 hover:shadow-md transition-all flex flex-col justify-between bg-white group text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-[#0F172A] font-heading line-clamp-1">{p.title}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.status}
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1 text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer rounded"
                      title="Edit project"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 text-[#94A3B8] hover:text-[#E11D48] transition-colors cursor-pointer rounded"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">{p.description}</p>

                {/* Tech stack badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.techStack?.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-semibold rounded-md border border-[#E0E7FF]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E4E7F2] flex items-center justify-between text-xs">
                {p.githubUrl ? (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#475569] hover:text-[#4F46E5] font-semibold"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>Repository</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-[#94A3B8]">No repo link</span>
                )}

                {p.videoUrl && (
                  <a
                    href={p.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#4F46E5] hover:underline font-semibold"
                  >
                    <span>Demo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT PROJECT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl border border-[#E4E7F2] animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E7F2]">
              <h3 className="text-base font-bold text-[#0F172A] font-heading">
                {editingProject ? 'Edit Technical Project' : 'Add New Technical Project'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4 pt-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-[#E11D48] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">Project Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Queue"
                  className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the system architecture, problems solved, and outcomes..."
                  className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">
                  Technologies / Tech Stack (comma separated)
                </label>
                <input
                  type="text"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                  placeholder="e.g. React, Node.js, Redis, Docker"
                  className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">GitHub Repo URL</label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 font-heading">Live Demo / Video URL</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 bg-white border border-[#E4E7F2] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-[#475569] hover:bg-[#F7F8FC] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim() || !description.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#3730A3] text-white text-xs font-bold transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editingProject ? 'Update Project' : 'Save Project'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTab;

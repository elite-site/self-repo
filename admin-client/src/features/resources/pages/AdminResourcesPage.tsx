import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { adminResourcesApi } from '../api';
import type { AdminResource, ResourceFormData, ResourceType } from '../types';

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'NOTES', label: 'Notes' },
  { value: 'PPT', label: 'PPT' },
  { value: 'QUESTION_PAPER', label: 'Question Paper' },
  { value: 'LAB_MANUAL', label: 'Lab Manual' },
  { value: 'SYLLABUS', label: 'Syllabus' },
  { value: 'OTHER', label: 'Other' },
];

function isDriveUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    return host === 'drive.google.com' || host === 'docs.google.com';
  } catch {
    return false;
  }
}

export const AdminResourcesPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<number | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<ResourceType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<AdminResource | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formYear, setFormYear] = useState<number>(1);
  const [formSemester, setFormSemester] = useState<number>(1);
  const [formSubject, setFormSubject] = useState('');
  const [formType, setFormType] = useState<ResourceType>('NOTES');
  const [formDriveLink, setFormDriveLink] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Resources
  const queryParams = useMemo(() => ({
    year: selectedYear === 'ALL' ? undefined : selectedYear,
    semester: selectedSemester === 'ALL' ? undefined : selectedSemester,
    type: selectedType === 'ALL' ? undefined : selectedType,
    search: search.trim() || undefined,
  }), [selectedYear, selectedSemester, selectedType, search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-resources', queryParams],
    queryFn: () => adminResourcesApi.getResources(queryParams),
  });

  const resources = data?.resources || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: ResourceFormData) => adminResourcesApi.createResource(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      closeDialog();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to create resource');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ResourceFormData> }) =>
      adminResourcesApi.updateResource(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      closeDialog();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to update resource');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminResourcesApi.deleteResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
    },
  });

  const openAddDialog = () => {
    setEditingResource(null);
    setFormTitle('');
    setFormYear(1);
    setFormSemester(1);
    setFormSubject('');
    setFormType('NOTES');
    setFormDriveLink('');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (res: AdminResource) => {
    setEditingResource(res);
    setFormTitle(res.title);
    setFormYear(res.year);
    setFormSemester(res.semester);
    setFormSubject(res.subject);
    setFormType(res.type);
    setFormDriveLink(res.driveLink);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingResource(null);
    setFormError(null);
  };

  const handleYearChange = (year: number) => {
    setFormYear(year);
    // Auto-align semester to the year's first semester if it falls outside
    const sem1 = (year * 2) - 1;
    const sem2 = year * 2;
    if (formSemester !== sem1 && formSemester !== sem2) {
      setFormSemester(sem1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = formTitle.trim();
    const subject = formSubject.trim();
    const driveLink = formDriveLink.trim();

    if (!title) {
      setFormError('Please enter a resource title.');
      return;
    }
    if (!subject) {
      setFormError('Please enter a subject name.');
      return;
    }
    if (!driveLink) {
      setFormError('Please enter a Google Drive link.');
      return;
    }
    if (!isDriveUrl(driveLink)) {
      setFormError('URL must be a valid Google Drive link (e.g., https://drive.google.com/...)');
      return;
    }

    const payload: ResourceFormData = {
      title,
      year: formYear,
      semester: formSemester,
      subject,
      type: formType,
      drive_link: driveLink,
    };

    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 text-left max-w-canvas mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-edge pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <BookOpen className="size-5" />
            </span>
            <h1 className="font-heading text-title-lg font-bold text-ink">
              Study Resources
            </h1>
          </div>
          <p className="mt-1 text-body-sm text-ink-muted">
            Manage semester notes, past question papers, syllabus, and lab manuals.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddDialog}
          className="btn btn-primary inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Resource</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="surface p-4 rounded-xl border border-edge grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Search</label>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-2.5 text-ink-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or subject..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Year */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="w-full text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand cursor-pointer"
          >
            <option value="ALL">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>

        {/* Semester */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="w-full text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand cursor-pointer"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="w-full text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand cursor-pointer"
          >
            <option value="ALL">All Types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resource Table / List */}
      <div className="surface rounded-xl border border-edge overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ink-muted">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-brand" />
            Loading resources…
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-status-rejected">
            <AlertCircle className="size-6 mx-auto mb-2" />
            Failed to load resources.
            <button onClick={() => refetch()} className="btn btn-secondary mt-3">Retry</button>
          </div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">
            <BookOpen className="size-10 mx-auto mb-3 opacity-40" />
            <h3 className="font-heading text-body-md font-semibold text-ink">No resources found</h3>
            <p className="text-body-sm mt-1">Click "Add Resource" above to upload study materials.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface-sunken border-b border-edge text-ink-muted font-heading font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title & Subject</th>
                  <th className="py-3 px-3">Year / Sem</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Uploaded By</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {resources.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-sunken/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink break-words">{item.title}</div>
                      <div className="text-xs text-ink-muted font-mono">{item.subject}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-medium text-ink">Year {item.year}</span>
                      <span className="text-ink-muted text-xs block">Sem {item.semester}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken text-ink">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-ink-muted whitespace-nowrap">
                      {item.uploadedBy || 'Admin'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                      <a
                        href={item.previewUrl || item.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1 cursor-pointer"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="size-3.5" />
                        <span className="hidden sm:inline">Drive</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => openEditDialog(item)}
                        className="btn btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1 cursor-pointer"
                        title="Edit Resource"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="btn py-1 px-2 text-xs inline-flex items-center gap-1 text-status-rejected hover:bg-status-rejected/10 rounded-lg cursor-pointer"
                        title="Delete Resource"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={closeDialog}
        title={editingResource ? 'Edit Study Resource' : 'Add Study Resource'}
        description="Provide resource details and Google Drive link for students."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-status-bg-rejected border border-status-rejected/40 rounded-lg text-status-rejected text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-ink block mb-1">
              Title <span className="text-status-rejected">*</span>
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Computer Networks Unit 1 & 2 Lecture Notes"
              className="w-full text-sm px-3 py-2 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Year <span className="text-status-rejected">*</span>
              </label>
              <select
                value={formYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Semester <span className="text-status-rejected">*</span>
              </label>
              <select
                value={formSemester}
                onChange={(e) => setFormSemester(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value={(formYear * 2) - 1}>Semester {(formYear * 2) - 1}</option>
                <option value={formYear * 2}>Semester {formYear * 2}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Subject <span className="text-status-rejected">*</span>
              </label>
              <input
                type="text"
                required
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="e.g. Operating Systems"
                className="w-full text-sm px-3 py-2 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Type <span className="text-status-rejected">*</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ResourceType)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand cursor-pointer"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink block mb-1">
              Google Drive Link <span className="text-status-rejected">*</span>
            </label>
            <input
              type="url"
              required
              value={formDriveLink}
              onChange={(e) => setFormDriveLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/... or /folders/..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-edge bg-surface text-ink focus:outline-none focus:border-brand font-mono text-xs"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              File or folder link from Google Drive. Ensure file sharing permissions match your cohort.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-edge">
            <button
              type="button"
              onClick={closeDialog}
              className="btn btn-secondary text-sm"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary text-sm inline-flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              <span>{editingResource ? 'Save Changes' : 'Create Resource'}</span>
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default AdminResourcesPage;

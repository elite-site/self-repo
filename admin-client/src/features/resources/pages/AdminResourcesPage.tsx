import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import { adminResourcesApi } from '../api';
import type { AdminResource, ResourceFormData, ResourceType } from '../types';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymGrid';

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
    placeholderData: keepPreviousData,
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
    onError: (err: any) => {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete resource');
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Handlers
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

  const openEditDialog = (item: AdminResource) => {
    setEditingResource(item);
    setFormTitle(item.title);
    setFormYear(item.year);
    setFormSemester(item.semester);
    setFormSubject(item.subject);
    setFormType(item.type);
    setFormDriveLink(item.drive_link || item.driveLink || '');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingResource(null);
    setFormError(null);
  };

  const handleYearChange = (newYear: number) => {
    setFormYear(newYear);
    // Keep semester valid for year (Year 1 = Sem 1 or 2, Year 2 = Sem 3 or 4, etc.)
    const minSem = (newYear * 2) - 1;
    setFormSemester(minSem);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = formTitle.trim();
    const trimmedSubject = formSubject.trim();
    const trimmedLink = formDriveLink.trim();

    if (!trimmedTitle) {
      setFormError('Title is required');
      return;
    }
    if (!trimmedSubject) {
      setFormError('Subject is required');
      return;
    }
    if (!trimmedLink) {
      setFormError('Google Drive link is required');
      return;
    }
    if (!isDriveUrl(trimmedLink)) {
      setFormError('Must be a valid Google Drive or Google Docs URL');
      return;
    }

    const payload: ResourceFormData = {
      title: trimmedTitle,
      year: formYear,
      semester: formSemester,
      subject: trimmedSubject,
      type: formType,
      drive_link: trimmedLink,
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

  return (
    <div className="space-y-8 animate-fade-in-up text-left">
      {/* 1. TOP ASYMMETRICAL OVERVIEW */}
      <AsymGrid>
        <AsymFeatured cols={8}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-edge">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-soft-text text-xs font-semibold mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Academic Resource Hub</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">
                Study Materials & Syllabus
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
                Curated lecture notes, previous exam question papers, lab manuals, and syllabus files
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openAddDialog}
                className="btn btn-primary min-h-[40px] px-4 inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Resource</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Cataloged Items</span>
              <span className="text-2xl font-bold text-ink font-mono">{resources.length}</span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Year Scope</span>
              <span className="text-2xl font-bold text-brand font-mono">
                {selectedYear === 'ALL' ? '1st–4th' : `Year ${selectedYear}`}
              </span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Category</span>
              <span className="text-2xl font-bold text-ink font-mono">
                {selectedType === 'ALL' ? 'All Types' : selectedType}
              </span>
            </div>
            <div className="p-3.5 rounded-xl surface border border-edge shadow-xs">
              <span className="text-xs text-ink-muted block font-semibold mb-1">Access Protocol</span>
              <span className="text-2xl font-bold text-status-approved font-mono">Google Drive</span>
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols={4}>
          <AsymAccent className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand text-on-primary shadow-xs">
                  <FolderOpen size={13} />
                  Curriculum Policy
                </span>
                <span className="text-xs font-mono font-semibold text-brand-soft-text">
                  Verified Only
                </span>
              </div>
              <h2 className="text-base font-bold text-ink">Institutional Study Library</h2>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                Provide clean, peer-reviewed study resources mapped directly to syllabus curriculum. All links must reside on Google Drive with viewer permissions enabled.
              </p>
              <div className="mt-4 pt-3 border-t border-brand/20 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">Supported Types</span>
                  <span className="font-bold text-ink text-sm">Notes, PYQs, Lab</span>
                </div>
                <div className="p-2.5 bg-surface/70 rounded-lg border border-brand/10">
                  <span className="text-ink-muted block text-[11px]">File Delivery</span>
                  <span className="font-bold text-status-approved text-sm">Direct / Proxy</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck size={14} className="text-brand shrink-0" />
              <span>Drive link validation enforced</span>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. FILTER CONTROLS BAR */}
      <div className="surface p-4 rounded-xl border border-edge grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-xs">
        {/* Search */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Search Catalog</label>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or subject..."
              className="input pl-9 pr-3 text-xs sm:text-sm min-h-[40px] w-full"
            />
          </div>
        </div>

        {/* Year */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Academic Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="select text-xs sm:text-sm min-h-[40px] cursor-pointer"
          >
            <option value="ALL">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>

        {/* Semester */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="select text-xs sm:text-sm min-h-[40px] cursor-pointer"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-ink-muted block mb-1">Document Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="select text-xs sm:text-sm min-h-[40px] cursor-pointer"
          >
            <option value="ALL">All Types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. RESPONSIVE TABLE CONTAINER - Strict horizontal container scrolling */}
      <div className="surface rounded-xl border border-edge overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-ink-muted">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-brand" />
            <span className="text-sm">Loading study resources…</span>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-status-rejected">
            <AlertCircle className="size-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">Failed to load resources.</p>
            <button onClick={() => refetch()} className="btn btn-secondary mt-3 min-h-[38px] text-xs">Retry</button>
          </div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">
            <BookOpen className="size-10 mx-auto mb-3 opacity-40 text-brand" />
            <h3 className="font-heading text-base font-semibold text-ink">No resources found</h3>
            <p className="text-xs mt-1">Click "Add Resource" above to upload study materials.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-sunken border-b border-edge text-ink-secondary text-xs font-semibold">
                <tr>
                  <th className="py-3 px-4">Title & Subject</th>
                  <th className="py-3 px-4">Year / Sem</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {resources.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-soft/40 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink group-hover:text-brand transition-colors text-sm break-words">
                        {item.title}
                      </div>
                      <div className="text-xs text-ink-muted font-mono">{item.subject}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      <span className="font-medium text-ink">Year {item.year}</span>
                      <span className="text-ink-muted block">Sem {item.semester}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-soft text-brand border border-brand/20">
                        <FileText className="w-3 h-3" />
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-ink-muted whitespace-nowrap">
                      {item.uploadedBy || 'Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      <a
                        href={item.previewUrl || item.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary py-1.5 px-2.5 text-xs min-h-[34px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="size-3.5 text-brand" />
                        <span className="hidden sm:inline">Drive</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => openEditDialog(item)}
                        className="btn btn-secondary py-1.5 px-2.5 text-xs min-h-[34px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Edit Resource"
                      >
                        <Edit2 className="size-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="btn py-1.5 px-2.5 text-xs min-h-[34px] inline-flex items-center gap-1 text-status-rejected hover:bg-status-rejected/10 rounded-lg cursor-pointer transition-colors"
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
            <div className="p-3 bg-status-rejected/10 border border-status-rejected/30 rounded-lg text-status-rejected text-xs flex items-center gap-2">
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
              className="input text-sm px-3 py-2 min-h-[40px] w-full"
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
                className="select text-sm px-3 py-2 min-h-[40px] cursor-pointer"
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
                className="select text-sm px-3 py-2 min-h-[40px] cursor-pointer"
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
                className="input text-sm px-3 py-2 min-h-[40px] w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Type <span className="text-status-rejected">*</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ResourceType)}
                className="select text-sm px-3 py-2 min-h-[40px] cursor-pointer"
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
              className="input text-sm px-3 py-2 min-h-[40px] w-full font-mono text-xs"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              File or folder link from Google Drive. Ensure file sharing permissions match your cohort.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-edge">
            <button
              type="button"
              onClick={closeDialog}
              className="btn btn-secondary text-sm min-h-[38px] px-4 cursor-pointer"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary text-sm min-h-[38px] px-4 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
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

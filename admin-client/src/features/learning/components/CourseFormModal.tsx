import React, { useState, useEffect } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { AdminCourseItem, CourseLevel, CourseStatus, EnrolmentType } from '../types';

export interface CourseFormModalProps {
  open: boolean;
  onClose: () => void;
  course?: AdminCourseItem | null;
  onSubmit: (data: Partial<AdminCourseItem>) => void | Promise<void>;
  isSubmitting?: boolean;
}

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
  open, onClose, course, onSubmit, isSubmitting = false,
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<CourseLevel>('BEGINNER');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [status, setStatus] = useState<CourseStatus>('DRAFT');
  const [enrolment, setEnrolment] = useState<EnrolmentType>('OPEN');
  const [featured, setFeatured] = useState(false);
  const [dueAt, setDueAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setSlug(course.slug || '');
      setDescription(course.description || '');
      setCategory(course.category || '');
      setLevel(course.level || 'BEGINNER');
      setEstimatedHours(course.estimatedHours != null ? String(course.estimatedHours) : '');
      setThumbnailUrl(course.thumbnailUrl || '');
      setStatus(course.status || 'DRAFT');
      setEnrolment(course.enrolment || 'OPEN');
      setFeatured(Boolean(course.featured));
      setDueAt(course.dueAt ? course.dueAt.slice(0, 16) : '');
    } else {
      setTitle(''); setSlug(''); setDescription(''); setCategory(''); setLevel('BEGINNER');
      setEstimatedHours(''); setThumbnailUrl(''); setStatus('DRAFT'); setEnrolment('OPEN');
      setFeatured(false); setDueAt('');
    }
    setErrors({});
  }, [course, open]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!course) setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!slug.trim()) errs.slug = 'Slug is required';
    if (estimatedHours && Number(estimatedHours) < 0) errs.estimatedHours = 'Hours must be positive';
    if (Object.keys(errs).length > 0) return setErrors(errs);

    onSubmit({
      title: title.trim(), slug: slug.trim(), description: description.trim(),
      category: category.trim() || null, level,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      thumbnailUrl: thumbnailUrl.trim() || null, status, enrolment, featured,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title={course ? 'Edit Course' : 'Create Course'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-title">Title *</label>
            <input id="cf-title" value={title} onChange={(e) => handleTitleChange(e.target.value)} className="input text-sm" placeholder="Course Title" />
            {errors.title && <p className="text-xs text-status-rejected mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-slug">Slug *</label>
            <input id="cf-slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="input text-sm" placeholder="course-slug" />
            {errors.slug && <p className="text-xs text-status-rejected mt-1">{errors.slug}</p>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-desc">Description</label>
          <textarea id="cf-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="textarea text-sm" rows={2} placeholder="Course summary..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-cat">Category</label>
            <input id="cf-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input text-sm" placeholder="e.g. Backend" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-lvl">Level</label>
            <select id="cf-lvl" value={level} onChange={(e) => setLevel(e.target.value as CourseLevel)} className="select text-sm">
              <option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-hrs">Estimated Hours</label>
            <input id="cf-hrs" type="number" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} className="input text-sm" placeholder="e.g. 5" />
            {errors.estimatedHours && <p className="text-xs text-status-rejected mt-1">{errors.estimatedHours}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-stat">Status</label>
            <select id="cf-stat" value={status} onChange={(e) => setStatus(e.target.value as CourseStatus)} className="select text-sm">
              <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-enr">Enrolment</label>
            <select id="cf-enr" value={enrolment} onChange={(e) => setEnrolment(e.target.value as EnrolmentType)} className="select text-sm">
              <option value="OPEN">Open</option><option value="ASSIGNED_ONLY">Assigned Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-due">Due Date</label>
            <input id="cf-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="input text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-thumb">Thumbnail URL</label>
          <input id="cf-thumb" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="input text-sm" placeholder="https://..." />
        </div>
        <div className="flex items-center gap-2">
          <input id="cf-feat" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="rounded border-edge" />
          <label htmlFor="cf-feat" className="text-xs font-medium text-ink cursor-pointer">Featured course</label>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-edge">
          <button type="button" onClick={onClose} className="btn btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary text-sm disabled:opacity-50">
            {isSubmitting ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

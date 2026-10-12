import React, { useState, useEffect } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import {
  ListVideo,
  Calendar,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  BookOpen,
  Users,
} from 'lucide-react';
import { AdminCourseItem, CourseLevel, CourseStatus, EnrolmentType, YouTubePlaylistItem } from '../types';
import { learningAdminApi } from '../api';

export interface CourseFormModalProps {
  open: boolean;
  onClose: () => void;
  course?: AdminCourseItem | null;
  onSubmit: (data: any) => void | Promise<void>;
  isSubmitting?: boolean;
}

const CATEGORY_SUGGESTIONS = [
  'Web Development',
  'Backend Development',
  'Frontend Development',
  'AI & Machine Learning',
  'Cloud & DevOps',
  'Data Structures & Algorithms',
  'Cybersecurity',
  'Core Computer Science',
];

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
  open,
  onClose,
  course,
  onSubmit,
  isSubmitting = false,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'curriculum' | 'access'>('general');

  // General Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<CourseLevel>('BEGINNER');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // Curriculum & Instructor Fields
  const [instructor, setInstructor] = useState('');
  const [skills, setSkills] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [prerequisites, setPrerequisites] = useState('');

  // Access & Deadline Fields
  const [status, setStatus] = useState<CourseStatus>('DRAFT');
  const [enrolment, setEnrolment] = useState<EnrolmentType>('OPEN');
  const [featured, setFeatured] = useState(false);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [dueAt, setDueAt] = useState('');
  const [targetType, setTargetType] = useState<'OPEN' | 'ALL' | 'BATCH'>('OPEN');
  const [targetYear, setTargetYear] = useState<number | ''>('');
  const [targetSection, setTargetSection] = useState('');

  // YouTube Playlist Quick Import
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistSuccess, setPlaylistSuccess] = useState<string | null>(null);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [stagedLessons, setStagedLessons] = useState<YouTubePlaylistItem[]>([]);

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
      setInstructor(course.instructor || '');
      setSkills(Array.isArray(course.skills) ? course.skills.join(', ') : '');
      setOutcomes(course.outcomes || '');
      setPrerequisites(course.prerequisites || '');
      setStatus(course.status || 'DRAFT');
      setEnrolment(course.enrolment || 'OPEN');
      setFeatured(Boolean(course.featured));
      setHasDeadline(Boolean(course.dueAt));
      setDueAt(course.dueAt ? course.dueAt.slice(0, 16) : '');
      setTargetType('OPEN');
      setTargetYear('');
      setTargetSection('');
      setStagedLessons([]);
      setPlaylistUrl('');
      setPlaylistSuccess(null);
      setPlaylistError(null);
    } else {
      setTitle('');
      setSlug('');
      setDescription('');
      setCategory('');
      setLevel('BEGINNER');
      setEstimatedHours('');
      setThumbnailUrl('');
      setInstructor('');
      setSkills('');
      setOutcomes('');
      setPrerequisites('');
      setStatus('DRAFT');
      setEnrolment('OPEN');
      setFeatured(false);
      setHasDeadline(false);
      setDueAt('');
      setTargetType('OPEN');
      setTargetYear('');
      setTargetSection('');
      setStagedLessons([]);
      setPlaylistUrl('');
      setPlaylistSuccess(null);
      setPlaylistError(null);
    }
    setErrors({});
    setActiveTab('general');
  }, [course, open]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!course) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleFetchPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    setPlaylistLoading(true);
    setPlaylistError(null);
    setPlaylistSuccess(null);

    try {
      const data = await learningAdminApi.previewYouTubePlaylist(playlistUrl.trim());
      if (data.title && !title) {
        setTitle(data.title);
        if (!course) {
          setSlug(
            data.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '')
          );
        }
      }
      if (data.description && !description) {
        setDescription(data.description);
      }
      if (data.thumbnailUrl && !thumbnailUrl) {
        setThumbnailUrl(data.thumbnailUrl);
      }
      setStagedLessons(data.videos);
      setPlaylistSuccess(`Successfully loaded ${data.videos.length} videos from "${data.title || 'Playlist'}"!`);
    } catch (err: any) {
      setPlaylistError(err?.response?.data?.message || err?.message || 'Could not fetch YouTube playlist');
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!slug.trim()) errs.slug = 'Slug is required';
    if (estimatedHours && Number(estimatedHours) < 0) errs.estimatedHours = 'Hours must be positive';
    if (hasDeadline && !dueAt) errs.dueAt = 'Please select a deadline date or disable deadline';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.title || errs.slug || errs.estimatedHours) setActiveTab('general');
      else if (errs.dueAt) setActiveTab('access');
      return;
    }

    const payload: any = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      category: category.trim() || null,
      level,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      thumbnailUrl: thumbnailUrl.trim() || null,
      instructor: instructor.trim() || null,
      skills: skills
        ? skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      outcomes: outcomes.trim() || null,
      prerequisites: prerequisites.trim() || null,
      status,
      enrolment,
      featured,
      dueAt: hasDeadline && dueAt ? new Date(dueAt).toISOString() : null,
    };

    // If creating new course with target audience
    if (!course && targetType !== 'OPEN') {
      payload.target = {
        targetType: targetType === 'ALL' ? 'ALL' : 'BATCH',
        year: targetYear !== '' ? Number(targetYear) : undefined,
        section: targetSection.trim() || undefined,
      };
    }

    // If playlist lessons were staged on creation
    if (!course && stagedLessons.length > 0) {
      payload.lessons = stagedLessons.map((v, i) => ({
        title: v.title,
        type: 'YOUTUBE',
        youtubeVideoId: v.videoId,
        durationSec: v.durationSec,
        order: i + 1,
      }));
    }

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} title={course ? 'Edit Course' : 'Create Course'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick YouTube Playlist Importer Box (visible on creation or edit) */}
        {!course && (
          <div className="surface-raised border border-brand/20 bg-brand-soft/5 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <ListVideo className="w-4 h-4" />
              <span>Quick Start from YouTube Playlist (Optional)</span>
            </div>
            <p className="text-[11px] text-ink-muted">
              Paste a YouTube playlist link to auto-fill course details and automatically stage all videos as lessons.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={playlistUrl}
                onChange={(e) => {
                  setPlaylistUrl(e.target.value);
                  setPlaylistError(null);
                }}
                placeholder="https://www.youtube.com/playlist?list=..."
                className="input text-xs flex-1"
                disabled={playlistLoading}
              />
              <button
                type="button"
                onClick={handleFetchPlaylist}
                disabled={playlistLoading || !playlistUrl.trim()}
                className="btn btn-secondary text-xs px-3 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {playlistLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-brand" />}
                {playlistLoading ? 'Loading...' : 'Auto-Fill'}
              </button>
            </div>
            {playlistSuccess && (
              <p className="text-xs text-status-approved flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> {playlistSuccess}
              </p>
            )}
            {playlistError && (
              <p className="text-xs text-status-rejected flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {playlistError}
              </p>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-edge gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'general' ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Basic Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'curriculum' ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Instructor & Curriculum
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'access' ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Deadline, Access & Target
          </button>
        </div>

        {/* Tab 1: Basic Details */}
        {activeTab === 'general' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-title">
                  Course Title *
                </label>
                <input
                  id="cf-title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. Modern Full-Stack Web Development"
                />
                {errors.title && <p className="text-xs text-status-rejected mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-slug">
                  URL Slug *
                </label>
                <input
                  id="cf-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="input text-sm font-mono"
                  placeholder="modern-fullstack-web-dev"
                />
                {errors.slug && <p className="text-xs text-status-rejected mt-1">{errors.slug}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-desc">
                Course Description *
              </label>
              <textarea
                id="cf-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea text-sm"
                rows={3}
                placeholder="Comprehensive summary of what this course covers..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-cat">
                Category
              </label>
              <input
                id="cf-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input text-sm"
                placeholder="e.g. Web Development"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-edge bg-surface-sunken hover:bg-surface text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-lvl">
                  Difficulty Level
                </label>
                <select
                  id="cf-lvl"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as CourseLevel)}
                  className="select text-sm"
                >
                  <option value="BEGINNER">Beginner (Foundational)</option>
                  <option value="INTERMEDIATE">Intermediate (Core Engineering)</option>
                  <option value="ADVANCED">Advanced (Specialized / Mastery)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-hrs">
                  Estimated Total Hours
                </label>
                <input
                  id="cf-hrs"
                  type="number"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. 10"
                />
                {errors.estimatedHours && <p className="text-xs text-status-rejected mt-1">{errors.estimatedHours}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-thumb">
                Thumbnail Image URL
              </label>
              <div className="flex gap-2">
                <input
                  id="cf-thumb"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="input text-sm flex-1"
                  placeholder="https://..."
                />
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Preview"
                    className="w-12 h-9 object-cover rounded border border-edge shrink-0"
                    onError={() => {}}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Instructor & Curriculum */}
        {activeTab === 'curriculum' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-instr">
                Instructor / Faculty / Mentor Name
              </label>
              <input
                id="cf-instr"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="input text-sm"
                placeholder="e.g. Dr. Rajesh Sharma (Dept of CSE) or Industry Mentor"
              />
              <p className="text-[11px] text-ink-muted mt-0.5">Displayed prominently on the course syllabus for students.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-skills">
                Target Skills / Technologies (comma-separated)
              </label>
              <input
                id="cf-skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="input text-sm"
                placeholder="e.g. React, TypeScript, Docker, REST APIs, Git"
              />
              <p className="text-[11px] text-ink-muted mt-0.5">
                Students will see these skill badges and associate them with their learning profile.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-outcomes">
                What Students Will Learn (Learning Outcomes)
              </label>
              <textarea
                id="cf-outcomes"
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                className="textarea text-sm font-sans"
                rows={3}
                placeholder="• Build scalable web applications from scratch&#10;• Master state management and modern APIs&#10;• Deploy to production environments"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-prereq">
                Prerequisites & Prior Knowledge
              </label>
              <textarea
                id="cf-prereq"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                className="textarea text-sm font-sans"
                rows={2}
                placeholder="e.g. Basic knowledge of JavaScript fundamentals and HTML."
              />
            </div>
          </div>
        )}

        {/* Tab 3: Access, Deadline & Target */}
        {activeTab === 'access' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-stat">
                  Publication Status
                </label>
                <select
                  id="cf-stat"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CourseStatus)}
                  className="select text-sm"
                >
                  <option value="DRAFT">Draft (Admin only)</option>
                  <option value="PUBLISHED">Published (Visible to students)</option>
                  <option value="ARCHIVED">Archived (Closed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-enr">
                  Enrollment Access
                </label>
                <select
                  id="cf-enr"
                  value={enrolment}
                  onChange={(e) => setEnrolment(e.target.value as EnrolmentType)}
                  className="select text-sm"
                >
                  <option value="OPEN">Open (All eligible students can self-enroll)</option>
                  <option value="ASSIGNED_ONLY">Assigned Only (Invite-only by faculty)</option>
                </select>
              </div>
            </div>

            {/* Deadline / Due Date Option */}
            <div className="p-3 surface-sunken border border-edge rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand" />
                  <span className="text-xs font-semibold text-ink">Course Completion Deadline</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDeadline}
                    onChange={(e) => {
                      setHasDeadline(e.target.checked);
                      if (!e.target.checked) setDueAt('');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-edge peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                </label>
              </div>
              <p className="text-[11px] text-ink-muted">
                Enable a target submission deadline for student coursework. Students will see remaining time and overdue notices.
              </p>
              {hasDeadline && (
                <div className="pt-2">
                  <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-due">
                    Due Date & Time *
                  </label>
                  <input
                    id="cf-due"
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="input text-sm"
                  />
                  {errors.dueAt && <p className="text-xs text-status-rejected mt-1">{errors.dueAt}</p>}
                </div>
              )}
            </div>

            {/* Target Audience on Course Creation */}
            {!course && (
              <div className="p-3 surface border border-edge rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <Users className="w-4 h-4 text-brand" />
                  <span>Target Audience & Initial Enrollment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('OPEN')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      targetType === 'OPEN' ? 'border-brand bg-brand-soft/10 text-brand font-semibold' : 'border-edge text-ink-secondary hover:bg-surface-sunken'
                    }`}
                  >
                    Open Catalog
                    <span className="block text-[10px] font-normal text-ink-muted mt-0.5">Students discover and enroll on demand</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('ALL')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      targetType === 'ALL' ? 'border-brand bg-brand-soft/10 text-brand font-semibold' : 'border-edge text-ink-secondary hover:bg-surface-sunken'
                    }`}
                  >
                    All Students
                    <span className="block text-[10px] font-normal text-ink-muted mt-0.5">Enrolls all students immediately</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('BATCH')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      targetType === 'BATCH' ? 'border-brand bg-brand-soft/10 text-brand font-semibold' : 'border-edge text-ink-secondary hover:bg-surface-sunken'
                    }`}
                  >
                    Specific Batch
                    <span className="block text-[10px] font-normal text-ink-muted mt-0.5">Filter by graduation year & section</span>
                  </button>
                </div>

                {targetType === 'BATCH' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-edge">
                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-year">Year (1-4)</label>
                      <input
                        id="cf-year"
                        type="number"
                        min="1"
                        max="4"
                        value={targetYear}
                        onChange={(e) => setTargetYear(e.target.value ? Number(e.target.value) : '')}
                        className="input text-xs"
                        placeholder="e.g. 3"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1" htmlFor="cf-sec">Section</label>
                      <input
                        id="cf-sec"
                        value={targetSection}
                        onChange={(e) => setTargetSection(e.target.value)}
                        className="input text-xs"
                        placeholder="e.g. A"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="cf-feat"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-edge"
              />
              <label htmlFor="cf-feat" className="text-xs font-medium text-ink cursor-pointer">
                Highlight as Featured Course on learning home banner
              </label>
            </div>

            <div className="text-[11px] text-ink-muted bg-surface-sunken p-2.5 rounded-lg border border-edge">
              ℹ️ Courses provide progress tracking and optional quiz assessments. Certificate generation is disabled.
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-edge">
          <div className="text-xs text-ink-muted">
            {stagedLessons.length > 0 && !course && (
              <span className="text-brand font-medium">
                ✨ {stagedLessons.length} lessons will be auto-created
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isSubmitting ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default CourseFormModal;

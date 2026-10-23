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

export function parseYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regexMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  if (regexMatch && regexMatch[1]) return regexMatch[1];
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (
        (pathParts[0] === 'embed' || pathParts[0] === 'v' || pathParts[0] === 'shorts') &&
        pathParts[1] &&
        /^[\w-]{11}$/.test(pathParts[1])
      ) {
        return pathParts[1];
      }
    } else if (parsed.hostname.includes('youtu.be')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] && /^[\w-]{11}$/.test(pathParts[0])) return pathParts[0];
    }
  } catch {
    // ignore
  }
  return null;
}

export function isYouTubePlaylist(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /[?&]list=([a-zA-Z0-9_-]+)/.test(trimmed) || /^(PL[a-zA-Z0-9_-]+)$/.test(trimmed);
}

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

  // YouTube Video / Playlist Quick Import
  const [quickStartUrl, setQuickStartUrl] = useState('');
  const [quickStartLoading, setQuickStartLoading] = useState(false);
  const [quickStartSuccess, setQuickStartSuccess] = useState<string | null>(null);
  const [quickStartError, setQuickStartError] = useState<string | null>(null);
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
      setQuickStartUrl('');
      setQuickStartSuccess(null);
      setQuickStartError(null);
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
      setQuickStartUrl('');
      setQuickStartSuccess(null);
      setQuickStartError(null);
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

  const handleAutoFill = async () => {
    const trimmed = quickStartUrl.trim();
    if (!trimmed) return;

    setQuickStartLoading(true);
    setQuickStartError(null);
    setQuickStartSuccess(null);

    const isPlaylist = isYouTubePlaylist(trimmed);
    const videoId = parseYouTubeVideoId(trimmed);

    if (!isPlaylist && !videoId) {
      setQuickStartLoading(false);
      setQuickStartError(
        'Invalid YouTube URL. Please enter a valid YouTube video (watch, youtu.be, embed) or playlist link.'
      );
      return;
    }

    try {
      if (isPlaylist) {
        // Case A (Playlist Link detected): Maintain existing workflow
        const data = await learningAdminApi.previewYouTubePlaylist(trimmed);
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
        setQuickStartSuccess(`Successfully loaded ${data.videos.length} videos from "${data.title || 'Playlist'}"!`);
      } else if (videoId) {
        // Case B (Single Video Link detected): Parse out specific Video ID, auto-fill Title/Description, push as Lesson 1
        const data = await learningAdminApi.previewYouTube(trimmed);
        const resolvedTitle = data.title || 'Lesson 1';
        const resolvedDescription =
          data.description ||
          (data.title ? `In-depth instructional video covering ${data.title}.` : 'Instructional video lesson.');
        const resolvedThumbnail = data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        setTitle(resolvedTitle);
        if (!course) {
          setSlug(
            resolvedTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '')
          );
        }
        setDescription(resolvedDescription);
        if (resolvedThumbnail && !thumbnailUrl) {
          setThumbnailUrl(resolvedThumbnail);
        }
        if (data.authorName && !instructor) {
          setInstructor(data.authorName);
        }
        if (data.durationSec && !estimatedHours) {
          setEstimatedHours((data.durationSec / 3600).toFixed(1));
        }

        const singleLesson: YouTubePlaylistItem = {
          videoId,
          title: resolvedTitle,
          durationSec: data.durationSec || null,
          durationText: data.durationSec
            ? `${Math.floor(data.durationSec / 60)}:${String(data.durationSec % 60).padStart(2, '0')}`
            : undefined,
          thumbnailUrl: resolvedThumbnail,
        };

        setStagedLessons([singleLesson]);
        setQuickStartSuccess(`Successfully loaded "${resolvedTitle}" and staged as Lesson 1!`);
      }
    } catch (err: any) {
      setQuickStartError(
        err?.response?.data?.message ||
          err?.message ||
          (isPlaylist ? 'Could not fetch YouTube playlist' : 'Could not fetch YouTube video details')
      );
    } finally {
      setQuickStartLoading(false);
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
            {stagedLessons.length > 0 && !course && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand/10 text-brand font-semibold">
                {stagedLessons.length}
              </span>
            )}
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
            {/* Quick Start from YouTube Video or Playlist */}
            {!course && (
              <div className="surface-raised border border-brand/20 bg-brand-soft/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                  <ListVideo className="w-4 h-4" />
                  <span>Quick Start from YouTube Video or Playlist (Optional)</span>
                </div>
                <p className="text-[11px] text-ink-muted">
                  Paste a YouTube video or playlist link to auto-fill course details and automatically stage lessons.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickStartUrl}
                    onChange={(e) => {
                      setQuickStartUrl(e.target.value);
                      setQuickStartError(null);
                    }}
                    placeholder="e.g., https://youtube.com... or https://youtube.com..."
                    className="input text-xs flex-1"
                    disabled={quickStartLoading}
                  />
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={quickStartLoading || !quickStartUrl.trim()}
                    className="btn btn-secondary text-xs px-3 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {quickStartLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-brand" />}
                    {quickStartLoading ? 'Loading...' : 'Auto-Fill'}
                  </button>
                </div>
                {quickStartSuccess && (
                  <p className="text-xs text-status-approved flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" /> {quickStartSuccess}
                  </p>
                )}
                {quickStartError && (
                  <p className="text-xs text-status-rejected flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {quickStartError}
                  </p>
                )}
              </div>
            )}
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
            {stagedLessons.length > 0 && !course && (
              <div className="surface-sunken border border-brand/20 bg-brand-soft/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Staged Curriculum Lessons ({stagedLessons.length})</span>
                  </div>
                  <span className="text-[10px] text-ink-muted">Auto-created on course save</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {stagedLessons.map((lesson, idx) => (
                    <div
                      key={`${lesson.videoId}-${idx}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface border border-edge text-xs gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        {lesson.thumbnailUrl && (
                          <img
                            src={lesson.thumbnailUrl}
                            alt=""
                            className="w-10 h-7 object-cover rounded border border-edge shrink-0"
                            onError={() => {}}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{lesson.title}</p>
                          <p className="text-[10px] text-ink-muted flex items-center gap-1.5">
                            <span className="font-mono">YouTube: {lesson.videoId}</span>
                            {lesson.durationText && <span>• {lesson.durationText}</span>}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStagedLessons((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-ink-muted hover:text-status-rejected text-[11px] px-1.5 py-0.5 rounded transition-colors shrink-0"
                        title="Remove staged lesson"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                ✨ {stagedLessons.length} {stagedLessons.length === 1 ? 'lesson' : 'lessons'} will be auto-created
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

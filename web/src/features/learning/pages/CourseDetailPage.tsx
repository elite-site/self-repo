import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  Play,
  CheckCircle2,
  FileText,
  HelpCircle,
  ExternalLink,
  Calendar,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { useCourseDetailQuery, useEnrollCourseMutation } from '../hooks';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { LessonType } from '../types';

const TYPE_ICONS: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  YOUTUBE: Play,
  NOTES: FileText,
  QUIZ: HelpCircle,
  LINK: ExternalLink,
};

export const CourseDetailPage: React.FC = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { data, isLoading, error, refetch } = useCourseDetailQuery(slugOrId || '');
  const enrollMutation = useEnrollCourseMutation(slugOrId);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="surface border border-edge rounded-2xl p-8 text-center space-y-3 max-w-md mx-auto" role="alert">
          <AlertTriangle className="size-8 text-status-rejected mx-auto" />
          <h2 className="text-base font-bold text-ink">Course unavailable</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            {(error as any)?.message || 'We were unable to load this course. Please try again.'}
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Link to="/learning/courses">
              <Button variant="secondary" size="sm">Browse Courses</Button>
            </Link>
            <Button variant="primary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  const { course, enrollment } = data;
  const firstUnfinishedLesson = course.lessons.find((l) => !l.completed) || course.lessons[0];

  const now = new Date();
  const dueDate = course.dueAt ? new Date(course.dueAt) : null;
  const isOverdue = dueDate ? dueDate < now : false;
  const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8 page-enter text-left">
      {/* 1. ASYMMETRIC COURSE HERO */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div className="rounded-2xl border border-edge bg-surface-raised p-6 shadow-xs sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {course.category && <Badge label={course.category} variant="neutral" dot={false} />}
              {course.level && <Badge label={course.level} variant="info" />}
              {course.instructor && (
                <span className="text-xs font-medium text-ink-muted flex items-center gap-1">
                  <UserCheck className="size-3.5 text-brand" /> {course.instructor}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl font-heading">{course.title}</h1>
            <p className="text-sm leading-relaxed text-ink-secondary">{course.description}</p>

            {dueDate && (
              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                  isOverdue
                    ? 'bg-status-rejected/10 border-status-rejected/30 text-status-rejected'
                    : daysRemaining !== null && daysRemaining <= 3
                    ? 'bg-warning/10 border-warning/30 text-warning'
                    : 'bg-surface-sunken border-edge text-ink-secondary'
                }`}
              >
                {isOverdue ? (
                  <AlertTriangle className="size-4 shrink-0 text-status-rejected" />
                ) : (
                  <Calendar className="size-4 shrink-0 text-brand" />
                )}
                <span>
                  <strong>Deadline:</strong> {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                  {dueDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  {isOverdue
                    ? ' • Course completion is overdue'
                    : daysRemaining !== null
                    ? ` • ${daysRemaining === 0 ? 'Due today' : `${daysRemaining} days remaining`}`
                    : ''}
                </span>
              </div>
            )}

            {course.skills && course.skills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {course.skills.map((skill) => (
                  <span key={skill} className="rounded-md border border-edge bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted border-t border-edge pt-3">
              {course.estimatedHours !== null && course.estimatedHours !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" /> {course.estimatedHours}h total
                </span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="size-3.5" /> {course.lessons.length} lessons
              </span>
            </div>

            <div className="pt-2">
              {enrollment.enrolled ? (
                <div className="space-y-3">
                  <ProgressBar label="Your Course Progress" value={enrollment.progressPercent} showValue />
                  {firstUnfinishedLesson && (
                    <Link to={`/learning/lessons/${firstUnfinishedLesson.id}`}>
                      <Button variant="primary" size="md" className="gap-2 min-h-[44px]">
                        <Play className="size-4 fill-current" />
                        <span>{enrollment.progressPercent > 0 ? 'Continue Learning' : 'Start Course'}</span>
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  disabled={enrollMutation.isPending}
                  onClick={() => enrollMutation.mutate(course.id)}
                  className="min-h-[44px]"
                >
                  {enrollMutation.isPending ? 'Enrolling...' : 'Enroll in Course'}
                </Button>
              )}
            </div>
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                Course Enrolment Status
              </span>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                {enrollment.enrolled
                  ? `You are currently enrolled. Progress: ${enrollment.progressPercent}% completed.`
                  : 'Enroll in this course to start watching lessons, track completion, and take quizzes.'}
              </p>
              <div className="space-y-1 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Enrolment: <span className="font-bold text-ink">{course.enrolment}</span></div>
                <div>Status: <span className="text-ink">{course.status}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
              <Link to="/learning/courses" className="text-label-xs font-semibold text-brand hover:underline">
                Back to Catalog
              </Link>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY DETAILS & SYLLABUS */}
      <MasonryGrid cols={2}>
        {(course.outcomes || course.prerequisites) && (
          <MasonryItem>
            <div className="space-y-4">
              {course.outcomes && (
                <div className="rounded-2xl border border-edge bg-surface p-6 space-y-2 card-lift">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-status-approved" /> What You'll Learn
                  </h3>
                  <p className="text-xs text-ink-secondary whitespace-pre-line leading-relaxed">{course.outcomes}</p>
                </div>
              )}
              {course.prerequisites && (
                <div className="rounded-2xl border border-edge bg-surface p-6 space-y-2 card-lift">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <BookOpen className="size-4 text-brand" /> Prerequisites
                  </h3>
                  <p className="text-xs text-ink-secondary whitespace-pre-line leading-relaxed">{course.prerequisites}</p>
                </div>
              )}
            </div>
          </MasonryItem>
        )}

        <MasonryItem>
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-ink font-heading">Course Syllabus</h2>
            {course.lessons.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No lessons published yet"
                description="The syllabus for this course is being prepared by faculty."
              />
            ) : (
              <div className="divide-y divide-edge rounded-2xl border border-edge bg-surface overflow-hidden shadow-xs">
                {course.lessons.map((lesson) => {
                  const Icon = TYPE_ICONS[lesson.type] || FileText;
                  return (
                    <Link
                      key={lesson.id}
                      to={`/learning/lessons/${lesson.id}`}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-surface-sunken"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-ink-muted w-5">{lesson.order}.</span>
                        <Icon className="size-4 text-ink-muted" />
                        <span className="text-sm font-medium text-ink">{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {lesson.durationSec && (
                          <span className="text-xs text-ink-muted">{Math.round(lesson.durationSec / 60)} min</span>
                        )}
                        {lesson.completed ? (
                          <CheckCircle2 className="size-4 text-status-approved" aria-label="Completed" />
                        ) : (
                          <span className="text-xs text-ink-muted font-medium">Not started</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </MasonryItem>
      </MasonryGrid>
    </div>
  );
};

export default CourseDetailPage;

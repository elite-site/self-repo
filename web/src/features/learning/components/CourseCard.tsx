import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, BookOpen, Calendar, GraduationCap } from 'lucide-react';
import { CourseCardSummary, CourseLevel } from '../types';
import { Badge, BadgeVariant } from '@/shared/ui/Badge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { cn } from '@/shared/lib/cn';

export interface CourseCardProps {
  course: CourseCardSummary;
  className?: string;
  onClick?: () => void;
}

const LEVEL_VARIANT: Record<CourseLevel, BadgeVariant> = {
  BEGINNER: 'info',
  INTERMEDIATE: 'warning',
  ADVANCED: 'danger',
};

export const CourseCard: React.FC<CourseCardProps> = ({ course, className, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const coursePath = `/learning/courses/${course.slug || course.id}`;

  const formattedDueDate = course.dueAt
    ? new Date(course.dueAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-edge bg-surface shadow-xs transition-all duration-quick ease-out hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-card-hover focus-within:ring-2 focus-within:ring-focus motion-reduce:transform-none motion-reduce:transition-none',
        className,
      )}
      onClick={onClick}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-surface-sunken">
        {course.thumbnailUrl && !imageError ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-moderate group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-soft/20 text-brand">
            <GraduationCap className="size-12 opacity-60" aria-hidden="true" />
          </div>
        )}

        {course.isAssigned && formattedDueDate && (
          <div className="absolute right-2 top-2 rounded-md bg-surface/90 px-2 py-0.5 text-xs font-semibold text-danger shadow-xs backdrop-blur-xs">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" aria-hidden="true" />
              Due {formattedDueDate}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {course.category && (
            <Badge label={course.category} variant="neutral" dot={false} />
          )}
          {course.level && (
            <Badge
              label={course.level.charAt(0) + course.level.slice(1).toLowerCase()}
              variant={LEVEL_VARIANT[course.level] || 'neutral'}
            />
          )}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink">
          <Link to={coursePath} className="focus:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {course.title}
          </Link>
        </h3>

        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
          {course.description}
        </p>

        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <div className="flex items-center gap-3">
              {course.estimatedHours != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 text-ink-muted" aria-hidden="true" />
                  {course.estimatedHours}h
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3.5 text-ink-muted" aria-hidden="true" />
                {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>
          </div>

          {course.isEnrolled && course.progressPercent !== undefined && (
            <div className="mt-2.5">
              <ProgressBar
                label="Progress"
                value={course.progressPercent}
                showValue
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default CourseCard;

import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Sparkles, BookOpen, AlertCircle, ArrowRight, GraduationCap } from 'lucide-react';
import { useLearningHomeQuery } from '../hooks';
import { CourseRow, RowSkeleton } from '../components';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { CourseCardSummary } from '../types';

export const LearningHomePage: React.FC = () => {
  const { data, isLoading, error, refetch } = useLearningHomeQuery();

  if (isLoading) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8" aria-busy="true">
        <div className="skeleton aspect-[21/9] w-full max-h-72 rounded-2xl" />
        <RowSkeleton cardsCount={4} />
        <RowSkeleton cardsCount={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">LearningHub</h1>
          <p className="text-sm text-ink-muted">Springboard your skills with curated courses and interactive lessons.</p>
        </div>
        <div className="surface border border-edge rounded-2xl p-8 text-center space-y-3 max-w-md mx-auto" role="alert">
          <AlertCircle className="size-8 text-status-rejected mx-auto" />
          <h2 className="text-base font-bold text-ink">Failed to load courses</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            {(error as any)?.message || 'The database is temporarily busy or unreachable. Please try again.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const hero = data.hero;
  const historyCourses: CourseCardSummary[] = (data.rows.history || []).map((h) => ({
    id: h.courseId,
    title: h.courseTitle,
    slug: h.courseSlug,
    description: h.lastLessonTitle ? `Last lesson: ${h.lastLessonTitle}` : '',
    thumbnailUrl: h.thumbnailUrl,
    category: null,
    level: null,
    estimatedHours: null,
    status: 'PUBLISHED',
    enrolment: 'OPEN',
    featured: false,
    dueAt: null,
    lessonCount: 0,
    totalDurationSec: 0,
  }));

  const hasRows =
    (data.rows.continueLearning?.length ?? 0) > 0 ||
    (data.rows.assignedToYou?.length ?? 0) > 0 ||
    (data.rows.topCourses?.length ?? 0) > 0 ||
    (data.rows.newCourses?.length ?? 0) > 0 ||
    (data.rows.categories?.length ?? 0) > 0 ||
    historyCourses.length > 0;

  if (!hero && !hasRows) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">LearningHub</h1>
          <p className="text-sm text-ink-muted">Springboard your skills with curated courses and interactive lessons.</p>
        </div>
        <EmptyState
          icon={BookOpen}
          title="No courses available yet"
          description="Courses will appear here once published by faculty. Check back soon!"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 page-enter max-w-7xl mx-auto text-left">
      {/* 1. ASYMMETRICAL LEARNING PROGRESS HERO */}
      <AsymGrid>
        <AsymFeatured cols="8">
          {hero ? (
            <section
              aria-label="Featured Course"
              className="relative overflow-hidden rounded-2xl border border-edge bg-surface-raised p-6 shadow-sm sm:p-8 space-y-4"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft/30 px-3 py-1 text-xs font-semibold text-brand">
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>{hero.isEnrolled ? 'Continue Learning' : 'Featured Course'}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl font-heading">
                {hero.title}
              </h1>
              <p className="line-clamp-2 text-sm text-ink-secondary leading-relaxed max-w-2xl">
                {hero.description}
              </p>
              {hero.isEnrolled && hero.progressPercent !== undefined && (
                <ProgressBar label="Course Progress" value={hero.progressPercent} showValue className="max-w-md" />
              )}
              <div className="pt-2">
                <Link to={`/learning/courses/${hero.slug || hero.id}`}>
                  <Button variant="primary" size="lg" className="gap-2 min-h-[44px]">
                    <Play className="size-4 fill-current" aria-hidden="true" />
                    <span>{hero.isEnrolled ? 'Continue Learning' : 'Start Course'}</span>
                  </Button>
                </Link>
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-edge bg-surface-raised p-6 sm:p-8 space-y-3">
              <span className="badge badge-brand text-xs">Department Learning Hub</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-ink font-heading">Learning Hub</h1>
              <p className="text-sm text-ink-secondary max-w-xl">
                Springboard your engineering skills with curated courses, verified certificates, and interactive lessons.
              </p>
              <div className="pt-2">
                <Link to="/learning/courses" className="btn btn-primary inline-flex items-center gap-2 min-h-[44px]">
                  <span>Explore Catalog</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                  <GraduationCap size={16} aria-hidden="true" />
                  Learning Spotlight
                </span>
                <span className="badge badge-brand text-[11px]">Enrolled</span>
              </div>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Complete assignments, quizzes, and projects to earn badges and boost your placement readiness.
              </p>
              <div className="space-y-1 pt-1 text-label-xs font-mono text-ink-secondary">
                <div>Active: <span className="font-bold text-ink">{data.rows.continueLearning?.length || 0} courses</span></div>
                <div>Assigned: <span className="text-ink">{data.rows.assignedToYou?.length || 0} tasks</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brand/20 flex flex-wrap items-center gap-2">
              <Link to="/learning/my-learning" className="btn btn-primary text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1">
                <span>My Learning</span>
                <ArrowRight size={12} />
              </Link>
              <Link to="/learning/courses" className="btn btn-secondary text-xs px-3.5 py-1.5 rounded-full">
                All Courses
              </Link>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. COURSE ROWS */}
      {data.rows.continueLearning?.length > 0 && (
        <CourseRow title="Continue Learning" courses={data.rows.continueLearning} seeAllHref="/learning/my-learning" />
      )}
      {data.rows.assignedToYou?.length > 0 && (
        <CourseRow title="Assigned to You" courses={data.rows.assignedToYou} seeAllHref="/learning/courses?filter=assigned" />
      )}
      {data.rows.topCourses?.length > 0 && (
        <CourseRow title="Top Courses" courses={data.rows.topCourses} seeAllHref="/learning/courses?filter=top" />
      )}
      {data.rows.newCourses?.length > 0 && (
        <CourseRow title="New Courses" courses={data.rows.newCourses} seeAllHref="/learning/courses?filter=new" />
      )}
      {data.rows.categories?.map((cat) => (
        <CourseRow key={cat.category} title={cat.category} courses={cat.courses} seeAllHref={`/learning/courses?category=${encodeURIComponent(cat.category)}`} />
      ))}
      {historyCourses.length > 0 && (
        <CourseRow title="Learning History" courses={historyCourses} seeAllHref="/learning/my-learning" />
      )}
    </div>
  );
};

export default LearningHomePage;

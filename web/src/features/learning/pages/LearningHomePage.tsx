import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Sparkles } from 'lucide-react';
import { useLearningHomeQuery } from '../hooks';
import { CourseRow, RowSkeleton } from '../components';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Button } from '@/shared/ui/Button';
import { CourseCardSummary } from '../types';

export const LearningHomePage: React.FC = () => {
  const { data, isLoading } = useLearningHomeQuery();

  if (isLoading || !data) {
    return (
      <div className="space-y-8 p-4 sm:p-6 lg:p-8" aria-busy="true">
        <div className="skeleton aspect-[21/9] w-full max-h-72 rounded-2xl" />
        <RowSkeleton cardsCount={4} />
        <RowSkeleton cardsCount={4} />
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

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {hero && (
        <section aria-label="Featured Course" className="relative overflow-hidden rounded-2xl border border-edge bg-surface-raised p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft/20 px-3 py-1 text-xs font-semibold text-brand">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span>{hero.isEnrolled ? 'Continue Learning' : 'Featured Course'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">{hero.title}</h1>
            <p className="line-clamp-2 text-sm text-ink-secondary">{hero.description}</p>
            {hero.isEnrolled && hero.progressPercent !== undefined && (
              <ProgressBar label="Course Progress" value={hero.progressPercent} showValue className="max-w-md" />
            )}
            <div>
              <Link to={`/learning/courses/${hero.slug || hero.id}`}>
                <Button variant="primary" size="lg" className="gap-2">
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  <span>{hero.isEnrolled ? 'Continue Learning' : 'Start Course'}</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

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

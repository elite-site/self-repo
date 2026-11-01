import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { useMyLearningQuery } from '../hooks';
import { CourseCard } from '../components';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { MasonryGrid, MasonryItem } from '@/shared/layout/MasonryLayout';
import { cn } from '@/shared/lib/cn';

type TabKey = 'inProgress' | 'completed' | 'deadlines';

export const MyLearningPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('inProgress');
  const { data, isLoading, error, refetch } = useMyLearningQuery();

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'inProgress', label: 'In Progress', count: data?.inProgress?.length },
    { key: 'completed', label: 'Completed', count: data?.completed?.length },
    { key: 'deadlines', label: 'Deadlines', count: data?.deadlines?.length },
  ];

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 page-enter max-w-7xl mx-auto text-left">
      {/* 1. ASYMMETRICAL LEARNING TRACKER HEADER */}
      <AsymGrid>
        <AsymFeatured cols="8">
          <div>
            <span className="badge badge-brand text-xs font-semibold">Learning Progress</span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl font-heading">
              My Learning Dashboard
            </h1>
            <p className="mt-1 text-sm text-ink-muted max-w-xl">
              Track your enrolled courses, completions, assessment deadlines, and verified certificates.
            </p>
          </div>

          <div className="flex border-b border-edge pt-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors min-h-[44px]',
                  activeTab === tab.key ? 'border-brand text-brand' : 'border-transparent text-ink-secondary hover:text-ink',
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-normal text-ink-muted">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </AsymFeatured>

        <AsymSide cols="4">
          <AsymAccent className="flex flex-col justify-between h-full">
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                <Sparkles size={14} aria-hidden="true" />
                Completion Spotlight
              </span>
              <p className="text-body-xs text-ink-secondary leading-relaxed">
                Finished courses are automatically eligible for verified digital certificates on your student portfolio.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand/20 flex items-center justify-between">
              <Link
                to="/learning/courses"
                className="text-label-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                <span>Browse All Courses</span>
              </Link>
            </div>
          </AsymAccent>
        </AsymSide>
      </AsymGrid>

      {/* 2. MASONRY CONTENT AREA */}
      {isLoading ? (
        <MasonryGrid cols={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <MasonryItem key={i}>
              <Skeleton className="aspect-video w-full rounded-2xl" />
            </MasonryItem>
          ))}
        </MasonryGrid>
      ) : error ? (
        <div className="surface border border-edge rounded-2xl p-8 text-center space-y-3 max-w-md mx-auto" role="alert">
          <AlertCircle className="size-8 text-status-rejected mx-auto" />
          <h2 className="text-base font-bold text-ink">Failed to load learning progress</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            {(error as any)?.message || 'Database connection error. Please try again.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : activeTab === 'inProgress' ? (
        data?.inProgress?.length ? (
          <MasonryGrid cols={3}>
            {data.inProgress.map((course) => (
              <MasonryItem key={course.id}>
                <CourseCard course={course} className="card-lift" />
              </MasonryItem>
            ))}
          </MasonryGrid>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No courses in progress"
            description="You don't have any courses in progress right now. Explore the catalog to start learning."
            action={<Link to="/learning/courses"><Button variant="secondary" size="sm">Browse Courses</Button></Link>}
          />
        )
      ) : activeTab === 'completed' ? (
        data?.completed?.length ? (
          <MasonryGrid cols={3}>
            {data.completed.map((course) => (
              <MasonryItem key={course.id}>
                <CourseCard course={course} className="card-lift" />
              </MasonryItem>
            ))}
          </MasonryGrid>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="No completed courses yet"
            description="Complete all lessons in a course to record your achievements here."
            action={<Link to="/learning/courses"><Button variant="secondary" size="sm">Browse Courses</Button></Link>}
          />
        )
      ) : data?.deadlines?.length ? (
        <div className="space-y-3 max-w-3xl">
          {data.deadlines.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-xl border border-edge bg-surface p-4 card-lift">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-brand">{item.type}</span>
                  <span className="text-xs text-ink-muted">· {item.courseTitle}</span>
                </div>
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="size-3.5" />
                  Due {new Date(item.dueAt).toLocaleDateString()}
                </p>
              </div>
              <Link to={`/learning/courses/${item.courseSlug || item.courseId}`}>
                <Button variant="secondary" size="sm">Go to Course</Button>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title="No upcoming deadlines"
          description="Great job! You have no pending deadlines or upcoming quizzes."
        />
      )}
    </div>
  );
};

export default MyLearningPage;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { useMyLearningQuery } from '../hooks';
import { CourseCard } from '../components';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">My Learning</h1>
        <p className="text-sm text-ink-muted">Track your enrolled courses, completions, and upcoming deadlines.</p>
      </div>

      <div className="flex border-b border-edge">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-xl" />
          ))}
        </div>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.inProgress.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data.completed.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
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
            <div key={idx} className="flex items-center justify-between rounded-xl border border-edge bg-surface p-4">
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

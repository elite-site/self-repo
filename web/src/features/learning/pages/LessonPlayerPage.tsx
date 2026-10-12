import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';
import {
  useLessonQuery,
  useCourseDetailQuery,
  useLessonProgressMutation,
  useLessonTranscriptQuery,
  useQuizQuery,
  useSubmitQuizMutation,
} from '../hooks';
import {
  YouTubePlayer,
  YouTubePlayerHandle,
  TranscriptViewer,
  NotesView,
  QuizView,
  LessonSidebar,
} from '../components';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/Tabs';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { celebrate } from '@/shared/lib/celebrate';
import { cn } from '@/shared/lib/cn';

function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return '';
  const mins = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (mins === 0) return `${remainingSec}s`;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hours}h ${m}m`;
  }
  return `${mins}m`;
}

export const LessonPlayerPage: React.FC = () => {
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  const { data: lesson, isLoading } = useLessonQuery(lessonId);
  const { data: courseData } = useCourseDetailQuery(
    lesson?.courseSlug || lesson?.courseId || ''
  );
  const { data: transcriptData, isLoading: isTranscriptLoading } =
    useLessonTranscriptQuery(lessonId);
  const progressMutation = useLessonProgressMutation(
    lesson?.courseSlug || lesson?.courseId
  );
  const { data: quizData } = useQuizQuery(lesson?.quizId || '');
  const submitQuizMutation = useSubmitQuizMutation(lesson?.quizId || undefined);

  const [currentTime, setCurrentTime] = useState(0);
  const [isTheater, setIsTheater] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const playerRef = useRef<YouTubePlayerHandle | null>(null);

  // Sync initial watched time on lesson load
  useEffect(() => {
    if (lesson?.progress?.secondsWatched) {
      setCurrentTime(lesson.progress.secondsWatched);
    } else {
      setCurrentTime(0);
    }
  }, [lesson?.id, lesson?.progress?.secondsWatched]);

  // Adjust active tab if current lesson is not a video
  useEffect(() => {
    if (lesson && lesson.type !== 'YOUTUBE' && activeTab === 'transcript') {
      setActiveTab('syllabus');
    }
  }, [lesson, activeTab]);

  const handleProgress = useCallback(
    (seconds: number, completed: boolean) => {
      if (!lesson) return;
      if (completed && !lesson.progress.completed) {
        void celebrate('success');
      }
      progressMutation.mutate({
        lessonId: lesson.id,
        data: {
          secondsWatched: seconds,
          maxPositionSec: seconds,
          completed,
        },
      });
    },
    [lesson, progressMutation]
  );

  const handleMarkComplete = useCallback(() => {
    if (!lesson) return;
    void celebrate('success');
    handleProgress(lesson.durationSec || 60, true);
  }, [lesson, handleProgress]);

  const handleSeek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    playerRef.current?.seekTo(seconds);
  }, []);

  if (isLoading || !lesson) {
    return (
      <div
        className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-12 lg:p-8"
        aria-busy="true"
        aria-label="Loading lesson"
      >
        <Skeleton className="h-96 rounded-xl lg:col-span-8" />
        <Skeleton className="h-96 rounded-xl lg:col-span-4" />
      </div>
    );
  }

  const durationStr = formatDuration(lesson.durationSec);

  const renderHeaderAndControls = () => (
    <div className="space-y-4">
      {/* Course link & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={`/learning/courses/${lesson.courseSlug || lesson.courseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          <span>Back to {lesson.courseTitle}</span>
        </Link>

        {lesson.type === 'YOUTUBE' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTheater((prev) => !prev)}
            className="h-8 gap-1.5 text-xs text-ink-secondary hover:text-ink"
            aria-label={isTheater ? 'Exit theater mode' : 'Theater mode'}
            title={isTheater ? 'Exit theater mode' : 'Theater mode'}
          >
            {isTheater ? (
              <>
                <Minimize2 className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Exit Theater</span>
              </>
            ) : (
              <>
                <Maximize2 className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Theater Mode</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Lesson Title & Metadata */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {lesson.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          <span className="font-semibold text-brand">Lesson {lesson.order}</span>
          {durationStr && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {durationStr}
            </span>
          )}
          {lesson.progress.completed && (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4">
        <Button
          variant="secondary"
          size="sm"
          disabled={!lesson.prevLessonId}
          onClick={() =>
            lesson.prevLessonId &&
            navigate(`/learning/lessons/${lesson.prevLessonId}`)
          }
          className="gap-1.5 text-xs"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>Previous</span>
        </Button>

        {!lesson.progress.completed ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkComplete}
            className="text-xs"
          >
            Mark as Completed
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Completed
          </span>
        )}

        <Button
          variant="primary"
          size="sm"
          disabled={!lesson.nextLessonId}
          onClick={() =>
            lesson.nextLessonId &&
            navigate(`/learning/lessons/${lesson.nextLessonId}`)
          }
          className="gap-1.5 text-xs"
        >
          <span>Next Lesson</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );

  const renderTabs = (tabClassName?: string) => (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      defaultValue={lesson.type === 'YOUTUBE' ? 'transcript' : 'syllabus'}
    >
      <TabsList label="Lesson content tabs" variant="line" className="mb-3">
        {lesson.type === 'YOUTUBE' && (
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        )}
        <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      {lesson.type === 'YOUTUBE' && (
        <TabsContent value="transcript">
          <TranscriptViewer
            segments={transcriptData?.segments || []}
            currentTime={currentTime}
            onSeek={handleSeek}
            isLoading={isTranscriptLoading}
            available={transcriptData?.available}
            className={tabClassName}
          />
        </TabsContent>
      )}

      <TabsContent value="syllabus">
        <LessonSidebar
          lessons={courseData?.course?.lessons || []}
          currentLessonId={lessonId}
          onSelectLesson={(id) => navigate(`/learning/lessons/${id}`)}
          courseTitle={lesson.courseTitle}
          className={tabClassName}
        />
      </TabsContent>

      <TabsContent value="notes">
        <div
          className={cn(
            'overflow-y-auto rounded-xl border border-edge bg-surface p-4 shadow-xs',
            tabClassName
          )}
        >
          <NotesView notes={lesson.notes} className="border-0 p-0 shadow-none" />
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderPlayerOrContent = () => (
    <div className="overflow-hidden rounded-xl bg-surface">
      {lesson.type === 'YOUTUBE' && lesson.youtubeVideoId && (
        <YouTubePlayer
          videoId={lesson.youtubeVideoId}
          lessonId={lesson.id}
          initialSeconds={lesson.progress.secondsWatched}
          onProgress={handleProgress}
          onTimeUpdate={(sec) => setCurrentTime(sec)}
          onPlayerReady={(controller) => {
            playerRef.current = controller;
          }}
          isTheater={isTheater}
          onToggleTheater={() => setIsTheater((prev) => !prev)}
        />
      )}
      {lesson.type === 'NOTES' && <NotesView notes={lesson.notes} />}
      {lesson.type === 'QUIZ' && quizData && (
        <QuizView
          quiz={quizData}
          onSubmit={(answers) =>
            submitQuizMutation.mutateAsync({ attemptId: 'attempt-quiz', answers })
          }
        />
      )}
      {lesson.type === 'LINK' && lesson.url && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-edge p-12 text-center">
          <BookOpen className="mb-3 size-10 text-ink-muted" aria-hidden="true" />
          <p className="mb-4 text-sm text-ink-secondary">
            This lesson references an external resource.
          </p>
          <a href={lesson.url} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" className="gap-2">
              <span>Open External Resource</span>
              <ExternalLink className="size-4" aria-hidden="true" />
            </Button>
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {isTheater ? (
        /* Theater Mode: Full-width player, tabs arranged below */
        <div className="space-y-6">
          <div className="space-y-4">
            {renderPlayerOrContent()}
            {renderHeaderAndControls()}
          </div>
          <div className="w-full">{renderTabs('h-[450px]')}</div>
        </div>
      ) : (
        /* Normal Mode: 2-column studio layout */
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Main Left Studio Column */}
          <div className="space-y-4 lg:col-span-8">
            {renderPlayerOrContent()}
            {renderHeaderAndControls()}
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4">
            {renderTabs('h-[580px]')}
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlayerPage;

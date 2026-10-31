import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  useLessonQuery,
  useCourseDetailQuery,
  useLessonProgressMutation,
  useLessonTranscriptQuery,
  useQuizQuery,
  useSubmitQuizMutation,
} from '../hooks';
import { useLessonShortcuts } from '../hooks/useLessonShortcuts';
import { learningApi } from '../api';
import {
  YouTubePlayer,
  YouTubePlayerHandle,
  TranscriptViewer,
  NotesView,
  QuizView,
  LessonSidebar,
  LessonNavigator,
} from '../components';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/Tabs';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { celebrate } from '@/shared/lib/celebrate';
import { cn } from '@/shared/lib/cn';
// formatDuration lives in lib/timecode — the local duplicate has been removed (DRY-2).

export const LessonPlayerPage: React.FC = () => {
  const params = useParams<{ id?: string; lessonId?: string }>();
  const lessonId = params.lessonId || params.id || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: lesson,
    isLoading,
    isError,
    error,
    refetch,
  } = useLessonQuery(lessonId);
  const { data: courseData } = useCourseDetailQuery(
    lesson?.courseSlug || lesson?.courseId || '',
  );
  const { data: transcriptData, isLoading: isTranscriptLoading } =
    useLessonTranscriptQuery(lessonId);
  const progressMutation = useLessonProgressMutation(
    lesson?.courseSlug || lesson?.courseId,
  );
  const { data: quizData } = useQuizQuery(lesson?.quizId || '');
  const submitQuizMutation = useSubmitQuizMutation(lesson?.quizId || undefined);

  const [currentTime, setCurrentTime] = useState(0);
  const [isTheater, setIsTheater] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const playerRef = useRef<YouTubePlayerHandle | null>(null);

  // ── Navigation callbacks ─────────────────────────────────────────────────
  const handleGoNext = useCallback(() => {
    if (lesson?.nextLessonId) {
      navigate(`/learning/lessons/${lesson.nextLessonId}`);
    }
  }, [lesson?.nextLessonId, navigate]);

  const handleGoPrevious = useCallback(() => {
    if (lesson?.prevLessonId) {
      navigate(`/learning/lessons/${lesson.prevLessonId}`);
    }
  }, [lesson?.prevLessonId, navigate]);

  // Shift+N / Shift+P lesson shortcuts — ignored while typing in inputs.
  useLessonShortcuts({
    onNext: handleGoNext,
    onPrevious: handleGoPrevious,
    enabled: !!lesson,
  });

  // Sync initial watched time on lesson load
  useEffect(() => {
    if (lesson?.progress?.secondsWatched) {
      setCurrentTime(lesson.progress.secondsWatched);
    } else {
      setCurrentTime(0);
    }
  }, [lesson?.id, lesson?.progress?.secondsWatched]);

  // Prefetch adjacent lessons so next/prev transitions are instantaneous
  useEffect(() => {
    if (!lesson) return;
    if (lesson.nextLessonId) {
      void queryClient.prefetchQuery({
        queryKey: ['learning', 'lesson', lesson.nextLessonId],
        queryFn: () => learningApi.getLesson(lesson.nextLessonId!),
        staleTime: 5 * 60_000,
      });
      void queryClient.prefetchQuery({
        queryKey: ['learning', 'transcript', lesson.nextLessonId],
        queryFn: () => learningApi.getLessonTranscript(lesson.nextLessonId!),
        staleTime: 30 * 60_000,
      });
    }
    if (lesson.prevLessonId) {
      void queryClient.prefetchQuery({
        queryKey: ['learning', 'lesson', lesson.prevLessonId],
        queryFn: () => learningApi.getLesson(lesson.prevLessonId!),
        staleTime: 5 * 60_000,
      });
    }
  }, [lesson, queryClient]);

  // Adjust active tab if current lesson is not a video or transcript is unavailable
  useEffect(() => {
    if (lesson && lesson.type !== 'YOUTUBE' && activeTab === 'transcript') {
      setActiveTab('syllabus');
    } else if (
      !isTranscriptLoading &&
      transcriptData &&
      !transcriptData.available &&
      activeTab === 'transcript'
    ) {
      setActiveTab('syllabus');
    }
  }, [lesson, activeTab, isTranscriptLoading, transcriptData]);

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
    [lesson, progressMutation],
  );

  const handleMarkAsComplete = useCallback(() => {
    if (!lesson) return;
    void celebrate('success');
    handleProgress(lesson.durationSec || 60, true);
  }, [lesson, handleProgress]);

  const handleSeek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    playerRef.current?.seekTo(seconds);
  }, []);

  if (isLoading && !lesson) {
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

  if (isError || !lesson) {
    return (
      <div className="mx-auto max-w-4xl p-6 sm:p-12">
        <ErrorState
          title="Could not load lesson"
          message={
            error instanceof Error
              ? error.message
              : !lessonId
              ? 'No lesson ID was provided in the URL.'
              : 'The requested lesson could not be found or you do not have permission to view it.'
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const allLessons = courseData?.course?.lessons ?? [];
  const courseProgressPercent = courseData?.enrollment?.progressPercent ?? 0;

  // Find the next lesson title for the YouTubePlayer end screen.
  const nextLessonSummary = lesson.nextLessonId
    ? allLessons.find((l) => l.id === lesson.nextLessonId)
    : undefined;

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
            onViewSyllabus={() => setActiveTab('syllabus')}
            className={tabClassName}
          />
        </TabsContent>
      )}

      <TabsContent value="syllabus">
        <LessonSidebar
          lessons={allLessons}
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
            tabClassName,
          )}
        >
          <NotesView notes={lesson.notes} className="border-0 p-0 shadow-none" />
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderNavigator = () => (
    <LessonNavigator
      lesson={lesson}
      lessons={allLessons}
      courseProgressPercent={courseProgressPercent}
      onPrevious={handleGoPrevious}
      onNext={handleGoNext}
      onMarkAsCompleted={handleMarkAsComplete}
    />
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
          maxPositionSec={lesson.progress.maxPositionSec}
          transcriptSegments={transcriptData?.segments}
          nextLessonTitle={nextLessonSummary?.title}
          onNextLesson={lesson.nextLessonId ? handleGoNext : undefined}
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
          <p className="mb-4 text-body-sm text-ink-secondary">
            This lesson references an external resource.
          </p>
          <a href={lesson.url} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" className="gap-2">
              <span>Open External Resource</span>
            </Button>
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* ── Top breadcrumb / theater toggle ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
        <Link
          to={`/learning/courses/${lesson.courseSlug || lesson.courseId}`}
          className="inline-flex items-center gap-1.5 text-label-sm font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>Back to {lesson.courseTitle}</span>
        </Link>

        {lesson.type === 'YOUTUBE' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTheater((prev) => !prev)}
            className="h-8 gap-1.5 text-label-sm text-ink-secondary hover:text-ink"
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

      {isTheater ? (
        /* Theater Mode: full-width player, navigator, then tabs */
        <div className="space-y-6">
          <div className="space-y-4">
            {renderPlayerOrContent()}
            {renderNavigator()}
          </div>
          <div className="w-full">{renderTabs('h-[450px]')}</div>
        </div>
      ) : (
        /* Normal Mode: 2-column studio layout */
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left: player + navigator */}
          <div className="space-y-4 lg:col-span-8">
            {renderPlayerOrContent()}
            {renderNavigator()}
          </div>

          {/* Right: tabs (transcript / syllabus / notes) */}
          <div className="lg:col-span-4">{renderTabs('h-[580px]')}</div>
        </div>
      )}
    </div>
  );
};

export default LessonPlayerPage;

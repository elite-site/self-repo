import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useLessonQuery, useCourseDetailQuery, useLessonProgressMutation, useQuizQuery, useSubmitQuizMutation } from '../hooks';
import { YouTubePlayer, NotesView, QuizView, LessonSidebar } from '../components';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';

export const LessonPlayerPage: React.FC = () => {
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { data: lesson, isLoading } = useLessonQuery(lessonId);
  const { data: courseData } = useCourseDetailQuery(lesson?.courseSlug || lesson?.courseId || '');
  const progressMutation = useLessonProgressMutation(lesson?.courseSlug || lesson?.courseId);
  const { data: quizData } = useQuizQuery(lesson?.quizId || '');
  const submitQuizMutation = useSubmitQuizMutation(lesson?.quizId || undefined);

  if (isLoading || !lesson) {
    return (
      <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-4 lg:p-8" aria-busy="true">
        <Skeleton className="h-96 rounded-xl lg:col-span-1" />
        <Skeleton className="h-96 rounded-xl lg:col-span-3" />
      </div>
    );
  }

  const handleProgress = (seconds: number, completed: boolean) => {
    progressMutation.mutate({ lessonId: lesson.id, data: { secondsWatched: seconds, maxPositionSec: seconds, completed } });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
        <LessonSidebar
          lessons={courseData?.course?.lessons || []}
          currentLessonId={lessonId}
          onSelectLesson={(id) => navigate(`/learning/lessons/${id}`)}
          courseTitle={lesson.courseTitle}
          className="order-2 lg:order-1 lg:col-span-1"
        />

        <div className="order-1 space-y-4 lg:order-2 lg:col-span-3">
          <h1 className="text-xl font-bold text-ink sm:text-2xl">{lesson.title}</h1>

          <div className="overflow-hidden rounded-xl bg-surface">
            {lesson.type === 'YOUTUBE' && lesson.youtubeVideoId && (
              <YouTubePlayer videoId={lesson.youtubeVideoId} lessonId={lesson.id} initialSeconds={lesson.progress.secondsWatched} onProgress={handleProgress} />
            )}
            {lesson.type === 'NOTES' && <NotesView notes={lesson.notes} />}
            {lesson.type === 'QUIZ' && quizData && (
              <QuizView
                quiz={quizData}
                onSubmit={(answers) => submitQuizMutation.mutateAsync({ attemptId: 'attempt-quiz', answers })}
              />
            )}
            {lesson.type === 'LINK' && lesson.url && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-edge p-12 text-center">
                <p className="mb-4 text-sm text-ink-secondary">This lesson references an external resource.</p>
                <a href={lesson.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" className="gap-2">
                    Open External Resource <ExternalLink className="size-4" />
                  </Button>
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-edge pt-4">
            <Button
              variant="secondary"
              size="sm"
              disabled={!lesson.prevLessonId}
              onClick={() => lesson.prevLessonId && navigate(`/learning/lessons/${lesson.prevLessonId}`)}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            {!lesson.progress.completed && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleProgress(lesson.durationSec || 60, true)}
              >
                Mark as Completed
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={!lesson.nextLessonId}
              onClick={() => lesson.nextLessonId && navigate(`/learning/lessons/${lesson.nextLessonId}`)}
            >
              Next Lesson <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayerPage;

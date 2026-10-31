import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LessonNavigator } from '../components/LessonNavigator';
import type { LessonDetailResponse, LessonSummary } from '../types';

const mockLesson: LessonDetailResponse = {
  id: 'lesson-2',
  courseId: 'course-1',
  courseTitle: 'TypeScript Architecture',
  courseSlug: 'ts-arch',
  title: 'Repository Layer Implementation',
  order: 2,
  type: 'YOUTUBE',
  durationSec: 900,
  youtubeVideoId: 'abc123xyz',
  url: null,
  notes: null,
  quizId: null,
  prevLessonId: 'lesson-1',
  nextLessonId: 'lesson-3',
  progress: {
    completed: false,
    secondsWatched: 120,
    maxPositionSec: 300,
  },
};

const mockLessons: LessonSummary[] = [
  {
    id: 'lesson-1',
    courseId: 'course-1',
    title: 'Introduction to Architecture',
    order: 1,
    type: 'YOUTUBE',
    durationSec: 600,
    completed: true,
  },
  {
    id: 'lesson-2',
    courseId: 'course-1',
    title: 'Repository Layer Implementation',
    order: 2,
    type: 'YOUTUBE',
    durationSec: 900,
    completed: false,
  },
  {
    id: 'lesson-3',
    courseId: 'course-1',
    title: 'Domain Models & Entities',
    order: 3,
    type: 'NOTES',
    durationSec: 450,
    completed: false,
  },
];

describe('LessonNavigator component', () => {
  it('renders lesson metadata, order, duration and course progress', () => {
    render(
      <LessonNavigator
        lesson={mockLesson}
        lessons={mockLessons}
        courseProgressPercent={33}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onMarkAsCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('Lesson 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Repository Layer Implementation' })).toBeInTheDocument();
    expect(screen.getByText('15m')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText(/Course progress/i)).toBeInTheDocument();
  });

  it('renders completed badge when lesson progress is completed', () => {
    const completedLesson: LessonDetailResponse = {
      ...mockLesson,
      progress: { ...mockLesson.progress, completed: true },
    };

    render(
      <LessonNavigator
        lesson={completedLesson}
        lessons={mockLessons}
        courseProgressPercent={66}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onMarkAsCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders Previous and Next buttons with accessible names including lesson titles', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(
      <LessonNavigator
        lesson={mockLesson}
        lessons={mockLessons}
        courseProgressPercent={33}
        onPrevious={onPrev}
        onNext={onNext}
        onMarkAsCompleted={vi.fn()}
      />
    );

    const prevBtn = screen.getByRole('button', {
      name: 'Previous lesson: Introduction to Architecture',
    });
    const nextBtn = screen.getByRole('button', {
      name: 'Next lesson: Domain Models & Entities',
    });

    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeEnabled();

    fireEvent.click(prevBtn);
    expect(onPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables Previous button when there is no prevLessonId', () => {
    const firstLesson: LessonDetailResponse = {
      ...mockLesson,
      id: 'lesson-1',
      order: 1,
      prevLessonId: null,
    };

    render(
      <LessonNavigator
        lesson={firstLesson}
        lessons={mockLessons}
        courseProgressPercent={0}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onMarkAsCompleted={vi.fn()}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /previous lesson/i });
    expect(prevBtn).toBeDisabled();
  });

  it('disables Next button when there is no nextLessonId', () => {
    const lastLesson: LessonDetailResponse = {
      ...mockLesson,
      id: 'lesson-3',
      order: 3,
      nextLessonId: null,
    };

    render(
      <LessonNavigator
        lesson={lastLesson}
        lessons={mockLessons}
        courseProgressPercent={100}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onMarkAsCompleted={vi.fn()}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /next lesson/i });
    expect(nextBtn).toBeDisabled();
  });

  it('renders "Up next" hint with next lesson title', () => {
    render(
      <LessonNavigator
        lesson={mockLesson}
        lessons={mockLessons}
        courseProgressPercent={33}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onMarkAsCompleted={vi.fn()}
      />
    );

    expect(screen.getByText('Up next:')).toBeInTheDocument();
    expect(screen.getByText('Domain Models & Entities')).toBeInTheDocument();
  });

  it('does NOT render "Mark as Completed" button for YOUTUBE lesson type', () => {
    render(
      <LessonNavigator
        lesson={mockLesson} // type: 'YOUTUBE'
        lessons={mockLessons}
        courseProgressPercent={33}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onMarkAsCompleted={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /mark as completed/i })).not.toBeInTheDocument();
  });

  it('renders "Mark as Completed" button for non-video lesson when incomplete', () => {
    const nonVideoLesson: LessonDetailResponse = {
      ...mockLesson,
      id: 'lesson-3',
      type: 'NOTES',
      progress: { completed: false, secondsWatched: 0, maxPositionSec: 0 },
    };
    const onMark = vi.fn();

    render(
      <LessonNavigator
        lesson={nonVideoLesson}
        lessons={mockLessons}
        courseProgressPercent={33}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onMarkAsCompleted={onMark}
      />
    );

    const markBtn = screen.getByRole('button', { name: /mark as completed/i });
    expect(markBtn).toBeInTheDocument();

    fireEvent.click(markBtn);
    expect(onMark).toHaveBeenCalledTimes(1);
  });
});

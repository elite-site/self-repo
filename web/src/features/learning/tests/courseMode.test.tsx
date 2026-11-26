import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CourseDetailPage } from '../pages/CourseDetailPage';
import { requiresEnrollment, ENROLL_MIN_LESSONS } from '../lib/courseMode';
import { useLessonProgressMutation } from '../hooks/useLesson';
import { learningApi } from '../api';
import type { CourseDetailResponse, LessonDetailResponse } from '../types';

vi.mock('../api', () => ({
  learningApi: {
    getCourse: vi.fn(),
    enrollCourse: vi.fn(),
    saveProgress: vi.fn(),
  },
}));

function renderCourseDetail(slug: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/learning/courses/${slug}`]}>
        <Routes>
          <Route path="/learning/courses/:slugOrId" element={<CourseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LearningHub Enroll vs Direct Play & Video Mark Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requiresEnrollment returns false for short OPEN courses and true for long playlists or ASSIGNED_ONLY', () => {
    expect(requiresEnrollment({ enrolment: 'OPEN', lessonCount: 1 })).toBe(false);
    expect(requiresEnrollment({ enrolment: 'OPEN', lessonCount: ENROLL_MIN_LESSONS - 1 })).toBe(false);
    expect(requiresEnrollment({ enrolment: 'OPEN', lessonCount: ENROLL_MIN_LESSONS })).toBe(true);
    expect(requiresEnrollment({ enrolment: 'ASSIGNED_ONLY', lessonCount: 1 })).toBe(true);
  });

  it('shows Direct Play (Watch Now) without Enroll button for single-video OPEN courses', async () => {
    const directPlayCourse: CourseDetailResponse = {
      course: {
        id: 'c-direct',
        title: 'Claude Code Full Course',
        slug: 'claude-code-full-course',
        description: 'Single-video course',
        thumbnailUrl: null,
        category: 'AI Coding Tools',
        level: 'BEGINNER',
        estimatedHours: 1.5,
        status: 'PUBLISHED',
        enrolment: 'OPEN',
        featured: false,
        dueAt: null,
        lessonCount: 1,
        totalDurationSec: 4897,
        lessons: [
          {
            id: 'l-1',
            courseId: 'c-direct',
            title: 'Claude Code Full Course',
            order: 1,
            type: 'YOUTUBE',
            durationSec: 4897,
            completed: false,
            secondsWatched: 0,
          },
        ],
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      enrollment: {
        enrolled: false,
        progressPercent: 0,
      },
    };

    vi.mocked(learningApi.getCourse).mockResolvedValue(directPlayCourse);
    renderCourseDetail('claude-code-full-course');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Watch Now/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Enroll in Course/i })).not.toBeInTheDocument();
  });

  it('shows Enroll in Course button for long playlist courses when not enrolled', async () => {
    const playlistLessons = Array.from({ length: ENROLL_MIN_LESSONS + 2 }, (_, idx) => ({
      id: `l-${idx + 1}`,
      courseId: 'c-playlist',
      title: `Lesson ${idx + 1}`,
      order: idx + 1,
      type: 'YOUTUBE' as const,
      durationSec: 600,
      completed: false,
      secondsWatched: 0,
    }));

    const playlistCourse: CourseDetailResponse = {
      course: {
        id: 'c-playlist',
        title: 'Gemini CLI Tutorial Playlist',
        slug: 'gemini-cli-playlist',
        description: 'Long playlist course',
        thumbnailUrl: null,
        category: 'AI Coding Tools',
        level: 'BEGINNER',
        estimatedHours: 2,
        status: 'PUBLISHED',
        enrolment: 'OPEN',
        featured: false,
        dueAt: null,
        lessonCount: playlistLessons.length,
        totalDurationSec: playlistLessons.length * 600,
        lessons: playlistLessons,
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      enrollment: {
        enrolled: false,
        progressPercent: 0,
      },
    };

    vi.mocked(learningApi.getCourse).mockResolvedValue(playlistCourse);
    renderCourseDetail('gemini-cli-playlist');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll in Course/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Watch Now/i })).not.toBeInTheDocument();
  });

  it('marks lesson completed in React Query cache when backend auto-completes at 90%', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const initialLesson: LessonDetailResponse = {
      id: 'l-90',
      courseId: 'c-direct',
      courseTitle: 'Direct Course',
      courseSlug: 'direct-course',
      title: 'Video Lesson',
      order: 1,
      type: 'YOUTUBE',
      durationSec: 100,
      youtubeVideoId: '7l6bXLAKyEI',
      url: null,
      notes: null,
      quizId: null,
      nextLessonId: null,
      prevLessonId: null,
      progress: { completed: false, secondsWatched: 0, maxPositionSec: 0 },
    };

    queryClient.setQueryData(['learning', 'lesson', 'l-90'], initialLesson);
    vi.mocked(learningApi.saveProgress).mockResolvedValue({
      success: true,
      completed: true,
      courseProgressPercent: 100,
    });

    let triggerSave: (() => void) | undefined;
    const Harness: React.FC = () => {
      const mutation = useLessonProgressMutation('direct-course');
      triggerSave = () =>
        mutation.mutate({
          lessonId: 'l-90',
          data: { secondsWatched: 90, maxPositionSec: 90, completed: false },
        });
      return null;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );

    triggerSave?.();

    await waitFor(() => {
      const updated = queryClient.getQueryData<LessonDetailResponse>(['learning', 'lesson', 'l-90']);
      expect(updated?.progress.completed).toBe(true);
    });
  });
});

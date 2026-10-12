import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLearningCard } from '../DashboardLearningCard';
import * as useLearningHomeModule from '@/features/learning/hooks/useLearningHome';
import { HomeFeedResponse } from '@/features/learning/types';

vi.mock('@/features/learning/hooks/useLearningHome', () => ({
  useLearningHomeQuery: vi.fn(),
}));

function createEmptyRows(): HomeFeedResponse['rows'] {
  return {
    continueLearning: [],
    assignedToYou: [],
    topCourses: [],
    newCourses: [],
    categories: [],
    history: [],
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardLearningCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton when loading', () => {
    vi.spyOn(useLearningHomeModule, 'useLearningHomeQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    const { container } = renderWithProviders(<DashboardLearningCard />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders "Resume Learning" card when student has courses in progress', () => {
    const mockData: HomeFeedResponse = {
      hero: null,
      rows: {
        ...createEmptyRows(),
        continueLearning: [
          {
            id: 'c-1',
            title: 'React Fundamentals',
            slug: 'react-fundamentals',
            description: 'Learn modern React hooks and architecture.',
            thumbnailUrl: 'https://example.com/react.jpg',
            category: 'Frontend',
            level: 'BEGINNER',
            estimatedHours: 8,
            status: 'PUBLISHED',
            enrolment: 'OPEN',
            featured: true,
            dueAt: null,
            lessonCount: 10,
            totalDurationSec: 12000,
            isEnrolled: true,
            progressPercent: 45,
            isAssigned: false,
          },
        ],
        history: [
          {
            courseId: 'c-1',
            courseTitle: 'React Fundamentals',
            courseSlug: 'react-fundamentals',
            lastLessonId: 'l-3',
            lastLessonTitle: 'Custom Hooks Deep Dive',
            thumbnailUrl: 'https://example.com/react.jpg',
            completedAt: null,
            lastAccessedAt: '2026-10-12T10:00:00Z',
          },
        ],
      },
    };

    vi.spyOn(useLearningHomeModule, 'useLearningHomeQuery').mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<DashboardLearningCard />);

    expect(screen.getByText('Resume Learning')).toBeInTheDocument();
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Custom Hooks Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('Resume lesson')).toBeInTheDocument();
    expect(screen.getByText('Course syllabus')).toBeInTheDocument();
  });

  it('renders "Try this course" card when student has never watched any course', () => {
    const mockData: HomeFeedResponse = {
      hero: {
        id: 'c-hero',
        title: 'Mastering System Design',
        slug: 'system-design',
        description: 'Learn distributed architectures and scalable systems.',
        thumbnailUrl: 'https://example.com/sysdesign.jpg',
        category: 'Architecture',
        level: 'ADVANCED',
        estimatedHours: 12,
        status: 'PUBLISHED',
        enrolment: 'OPEN',
        featured: true,
        dueAt: null,
        lessonCount: 15,
        totalDurationSec: 25000,
        isEnrolled: false,
        progressPercent: 0,
        isAssigned: false,
        instructor: 'Dr. Jane Smith',
      },
      rows: createEmptyRows(),
    };

    vi.spyOn(useLearningHomeModule, 'useLearningHomeQuery').mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<DashboardLearningCard />);

    expect(screen.getByText('Explore LearningHub')).toBeInTheDocument();
    expect(screen.getByText('Mastering System Design')).toBeInTheDocument();
    expect(screen.getByText(/Learn distributed architectures/)).toBeInTheDocument();
    expect(screen.getByText('Try this course')).toBeInTheDocument();
    expect(screen.getByText('By Dr. Jane Smith')).toBeInTheDocument();
  });

  it('renders minimal explore prompt when no progress and no recommended course available', () => {
    const mockData: HomeFeedResponse = {
      hero: null,
      rows: createEmptyRows(),
    };

    vi.spyOn(useLearningHomeModule, 'useLearningHomeQuery').mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<DashboardLearningCard />);

    expect(screen.getByText('LearningHub')).toBeInTheDocument();
    expect(screen.getByText('Browse courses')).toBeInTheDocument();
  });

  it('returns null when query has error', () => {
    vi.spyOn(useLearningHomeModule, 'useLearningHomeQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    const { container } = renderWithProviders(<DashboardLearningCard />);
    expect(container.firstChild).toBeNull();
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CourseCard } from '../components/CourseCard';
import { CourseRow } from '../components/CourseRow';
import { LearningHomePage } from '../pages/LearningHomePage';
import { CourseCardSummary, HomeFeedResponse } from '../types';
import { learningApi } from '../api';

vi.mock('../api', () => ({
  learningApi: {
    getHomeFeed: vi.fn(),
  },
}));

const mockCourse: CourseCardSummary = {
  id: 'course-1',
  title: 'Fullstack TypeScript Mastery',
  slug: 'fullstack-typescript',
  description: 'Master fullstack development with Node.js and React.',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  category: 'Web Development',
  level: 'INTERMEDIATE',
  estimatedHours: 14,
  status: 'PUBLISHED',
  enrolment: 'OPEN',
  featured: true,
  dueAt: '2026-11-20T12:00:00Z',
  lessonCount: 20,
  totalDurationSec: 36000,
  isEnrolled: true,
  progressPercent: 65,
  isAssigned: true,
};

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

describe('LearningHub Web Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CourseCard component', () => {
    it('renders metadata, badges, progress bar, and assignment due chip', () => {
      renderWithProviders(<CourseCard course={mockCourse} />);

      expect(screen.getByText('Fullstack TypeScript Mastery')).toBeInTheDocument();
      expect(screen.getByText('Web Development')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText(/14h/)).toBeInTheDocument();
      expect(screen.getByText(/20 lessons/)).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText(/Due (Nov 20|20 Nov)/)).toBeInTheDocument();
    });
  });

  describe('CourseRow component', () => {
    it('renders row title, see all link, scroll buttons, and caps cards at 12', () => {
      const courses = Array.from({ length: 15 }, (_, i) => ({
        ...mockCourse,
        id: `course-${i}`,
        title: `Course Number ${i + 1}`,
      }));

      renderWithProviders(
        <CourseRow
          title="Recommended Courses"
          courses={courses}
          seeAllHref="/learning/courses"
        />,
      );

      expect(screen.getByText('Recommended Courses')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /See all/i })).toHaveAttribute(
        'href',
        '/learning/courses',
      );
      expect(screen.getByRole('button', { name: /Scroll left/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Scroll right/i })).toBeInTheDocument();

      // Should display at most 12 cards
      expect(screen.getByText('Course Number 1')).toBeInTheDocument();
      expect(screen.getByText('Course Number 12')).toBeInTheDocument();
      expect(screen.queryByText('Course Number 13')).not.toBeInTheDocument();
    });
  });

  describe('LearningHomePage page', () => {
    it('renders hero banner and course rows after query resolves', async () => {
      const mockFeed: HomeFeedResponse = {
        hero: mockCourse,
        rows: {
          continueLearning: [mockCourse],
          assignedToYou: [mockCourse],
          topCourses: [mockCourse],
          newCourses: [mockCourse],
          categories: [
            {
              category: 'Cloud Engineering',
              courses: [
                {
                  ...mockCourse,
                  id: 'course-cloud',
                  title: 'AWS Cloud Fundamentals',
                  category: 'Cloud Engineering',
                },
              ],
            },
          ],
          history: [],
        },
      };

      vi.mocked(learningApi.getHomeFeed).mockResolvedValue(mockFeed);

      renderWithProviders(<LearningHomePage />);

      // Hero banner
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Fullstack TypeScript Mastery' })).toBeInTheDocument();
      });

      // Rows
      expect(screen.getByRole('heading', { level: 2, name: 'Continue Learning' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Assigned to You' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Top Courses' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'New Courses' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Cloud Engineering' })).toBeInTheDocument();
    });

    it('renders empty state when LearningHub has no courses available', async () => {
      const emptyFeed: HomeFeedResponse = {
        hero: null,
        rows: {
          continueLearning: [],
          assignedToYou: [],
          topCourses: [],
          newCourses: [],
          categories: [],
          history: [],
        },
      };

      vi.mocked(learningApi.getHomeFeed).mockResolvedValue(emptyFeed);

      renderWithProviders(<LearningHomePage />);

      await waitFor(() => {
        expect(screen.getByText('No courses available yet')).toBeInTheDocument();
      });
      expect(screen.getByText(/Courses will appear here once published by faculty/i)).toBeInTheDocument();
    });
  });
});

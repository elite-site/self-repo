import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../pages/DashboardPage';
import * as useDashboardModule from '../hooks/useDashboard';
import * as useLearningHomeModule from '@/features/learning/hooks/useLearningHome';
import { RadialRing } from '@/shared/ui/RadialRing';

vi.mock('../hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
}));

vi.mock('@/features/learning/hooks/useLearningHome', () => ({
  useLearningHomeQuery: vi.fn(),
}));

function buildUseDashboardResult(overrides: Record<string, unknown> = {}) {
  return {
    dashboardData: {
      profile: {
        name: 'Aarav Sharma',
        rollNo: '24IT0001',
        year: 3,
        section: 'A',
        branch: 'IT',
        skills: ['TypeScript'],
      },
      counts: { projects: 1, achievements: 0, certificates: 0 },
      resume: { exists: false },
      events: [],
      registrations: [],
      votingCampaigns: [],
      notifications: [],
      unreadNotificationsCount: 0,
      github: { connected: true, reminderSnoozedUntil: null },
      codechef: null,
    },
    profile: {
      name: 'Aarav Sharma',
      rollNo: '24IT0001',
      year: 3,
      section: 'A',
      branch: 'IT',
      skills: ['TypeScript'],
    },
    upcomingEvents: [],
    registrations: [],
    votingCampaigns: [],
    notifications: [],
    isLoading: false,
    profileError: null,
    eventsError: null,
    votingError: null,
    notifError: null,
    showGithubBanner: false,
    tasks: [],
    completionPercentage: 83,
    courseProgress: {
      value: 3,
      suffix: ' Modules Active',
      subLabel: '3 in progress, 0 completed',
    },
    firstName: 'Aarav',
    contextLine: 'Thursday, November 26 · Year 3',
    quickActions: [],
    refetch: vi.fn(),
    handleNotificationClick: vi.fn(),
    handleClearAllNotifications: vi.fn(),
    clearingNotifs: false,
    handleSnoozeGithub: vi.fn(),
    ...overrides,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage layout and theme consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useLearningHomeModule, 'useLearningHomeQuery').mockReturnValue({
      data: { hero: null, rows: { continueLearning: [], assignedToYou: [], topCourses: [], newCourses: [], categories: [], history: [] } },
      isLoading: false,
      isError: false,
    } as never);
  });

  it('pairs hero spotlight and placement priority at equal height without metrics stacked in top-right', () => {
    vi.spyOn(useDashboardModule, 'useDashboard').mockReturnValue(
      buildUseDashboardResult() as never,
    );

    const { container } = renderWithProviders(<DashboardPage />);

    const asymGrid = container.querySelector('.asym-grid');
    expect(asymGrid).toBeInTheDocument();
    expect(asymGrid?.className).toContain('items-stretch');

    // Top-right side column holds only Placement Priority, not Course Progress
    const asymSide = container.querySelector('.asym-side');
    expect(asymSide).toHaveTextContent('Placement Priority');
    expect(asymSide).not.toHaveTextContent('Course Progress');

    // Greeting uses UI sans-serif rather than serif display font
    const heading = screen.getByRole('heading', { name: /Welcome back, Aarav/i });
    expect(heading.className).toContain('font-ui');
    expect(heading.className).not.toContain('text-headline-xl');
  });

  it('renders single-column metrics row when CodeChef is disconnected and 2-column grid when connected', () => {
    vi.spyOn(useDashboardModule, 'useDashboard').mockReturnValue(
      buildUseDashboardResult() as never,
    );
    const { container, rerender } = renderWithProviders(<DashboardPage />);

    const progressHeading = screen.getByText('Course Progress');
    const singleMetricsRow = progressHeading.closest('.grid');
    expect(singleMetricsRow?.className).toContain('grid-cols-1');
    expect(singleMetricsRow?.className).not.toContain('md:grid-cols-2');

    vi.spyOn(useDashboardModule, 'useDashboard').mockReturnValue(
      buildUseDashboardResult({
        dashboardData: {
          ...buildUseDashboardResult().dashboardData,
          codechef: {
            connected: true,
            verified: true,
            handle: 'synth_coder',
            currentRating: 1450,
            stars: 2,
            totalSolved: 75,
          },
        },
      }) as never,
    );

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const twoMetricsRow = screen.getByText('Course Progress').closest('.grid');
    expect(twoMetricsRow?.className).toContain('md:grid-cols-2');
    expect(screen.getByText('@synth_coder')).toBeInTheDocument();

    // No CSS masonry columns cramping Resume Learning / Your setup
    expect(container.querySelector('.masonry-grid')).not.toBeInTheDocument();
  });

  it('uses tokenized stroke-edge track on RadialRing', () => {
    const { container } = render(<RadialRing value={83} />);
    const trackCircle = container.querySelector('circle');
    expect(trackCircle?.getAttribute('class')).toContain('stroke-edge');
    expect(trackCircle?.getAttribute('class')).not.toContain('stroke-border');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatsDashboard } from '../StatsDashboard';
import { AdminStats } from '../../types';

const mockStats: AdminStats = {
  totalSubmissions: 50,
  totalVideos: 50,
  totalRated: 20,
  byYear: { '3': 50 },
  bySection: [
    { label: '3rd Year · IT-A', year: 3, branch: 'IT', section: 'A', submitted: 25 },
    { label: '3rd Year · IT-B', year: 3, branch: 'IT', section: 'B', submitted: 15 },
  ],
  byStatus: { SUBMITTED: 50 },
  byRating: {
    GOOD: 12,
    AVERAGE: 6,
    POOR: 2,
  },
  overTime: [],
  portal: {
    totalStudents: 120,
    totalProfiles: 33,
    totalProjects: 12,
    totalAchievements: 6,
    totalCertificates: 2,
    totalResumes: 10,
    totalEvents: 0,
    totalRegistrations: 0,
    totalCampaigns: 2,
    totalVotes: 85,
    pendingModeration: 22,
  },
};

describe('StatsDashboard Component', () => {
  it('renders KPI metrics cards and transforms active indicators into actionable link buttons', () => {
    const onNavigateTab = vi.fn();
    render(
      <MemoryRouter>
        <StatsDashboard stats={mockStats} loading={false} onNavigateTab={onNavigateTab} />
      </MemoryRouter>
    );

    // Enrolled students card
    expect(screen.getByText('Enrolled students')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();

    const activeProfilesBtn = screen.getByRole('button', { name: /33 active profiles/i });
    expect(activeProfilesBtn).toBeInTheDocument();
    fireEvent.click(activeProfilesBtn);
    expect(onNavigateTab).toHaveBeenCalledWith('/admin/students?filter=active');

    // Portfolio items card
    const portfolioBtn = screen.getByRole('button', { name: /12 builds · 6 awards/i });
    expect(portfolioBtn).toBeInTheDocument();
    fireEvent.click(portfolioBtn);
    expect(onNavigateTab).toHaveBeenCalledWith('/admin/moderation');
  });

  it('applies dim neutral gray styling for "0 State" cards', () => {
    render(
      <MemoryRouter>
        <StatsDashboard stats={mockStats} loading={false} />
      </MemoryRouter>
    );

    // Events card has totalEvents = 0
    const zeroRegistrationsText = screen.getByText('0 registrations');
    expect(zeroRegistrationsText).toBeInTheDocument();
    expect(zeroRegistrationsText.className).toContain('text-[#94a3b8]');
  });

  it('renders "Start Evaluation" CTA button next to "% complete" badge in Introduction Video campaign card', () => {
    const onNavigateTab = vi.fn();
    render(
      <MemoryRouter>
        <StatsDashboard stats={mockStats} loading={false} onNavigateTab={onNavigateTab} />
      </MemoryRouter>
    );

    expect(screen.getByText('40% complete')).toBeInTheDocument();
    const startEvalBtn = screen.getByRole('button', { name: /start evaluation/i });
    expect(startEvalBtn).toBeInTheDocument();

    fireEvent.click(startEvalBtn);
    expect(onNavigateTab).toHaveBeenCalledWith('/admin/submissions');
  });

  it('renders "Submissions by section" elements as clickable row shortcuts linking directly to section stream', () => {
    const onNavigateTab = vi.fn();
    render(
      <MemoryRouter>
        <StatsDashboard stats={mockStats} loading={false} onNavigateTab={onNavigateTab} />
      </MemoryRouter>
    );

    const sectionRowA = screen.getByRole('button', { name: /Section 3rd Year · IT-A/i });
    expect(sectionRowA).toBeInTheDocument();

    fireEvent.click(sectionRowA);
    expect(onNavigateTab).toHaveBeenCalledWith(
      expect.stringContaining('/admin/students?year=3&section=A&uploaded=yes')
    );
  });

  it('renders uniform Quick Actions grid and unified red badge for Moderation queue', () => {
    render(
      <MemoryRouter>
        <StatsDashboard stats={mockStats} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Jump to')).toBeInTheDocument();
    expect(screen.getByText('Moderation queue')).toBeInTheDocument();
    expect(screen.getByText('Video submissions')).toBeInTheDocument();
    expect(screen.getByText('Student roster')).toBeInTheDocument();
    expect(screen.getAllByText('Events').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Elections')).toBeInTheDocument();
    expect(screen.getByText('Study resources')).toBeInTheDocument();

    // Red badge matching #E11D48
    const badge22 = screen.getAllByText('22').find((el) => el.className.includes('bg-[#E11D48]'));
    expect(badge22).toBeDefined();
    expect(badge22?.className).toContain('text-white');
  });
});

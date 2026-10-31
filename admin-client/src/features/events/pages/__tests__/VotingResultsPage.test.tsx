import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { VotingResultsPage } from '../VotingResultsPage';
import { useVotingResults } from '../../hooks/useVotingResults';
import { eventsApi } from '../../api';
import { VotingCampaign, CampaignResult } from '../../types';

vi.mock('../../api', () => ({
  eventsApi: {
    getVotingCampaigns: vi.fn(),
    getVotingResults: vi.fn(),
    finalizeVotingResults: vi.fn(),
  },
}));

const mockCampaigns: VotingCampaign[] = [
  {
    id: 'camp-1',
    title: 'Presidential Election',
    status: 'CLOSED',
    votingStart: '2026-01-01T00:00:00Z',
    votingEnd: '2026-01-02T00:00:00Z',
    totalVotes: 100,
    candidateCount: 2,
  },
  {
    id: 'camp-2',
    title: 'Vice Presidential Election',
    status: 'ACTIVE',
    votingStart: '2026-01-02T00:00:00Z',
    votingEnd: '2026-01-03T00:00:00Z',
    totalVotes: 150,
    candidateCount: 2,
  },
];

const mockResult: CampaignResult = {
  id: 'camp-2',
  title: 'Vice Presidential Election',
  status: 'ACTIVE',
  totalVotes: 150,
  totalEligible: 200,
  participationRate: 75,
  candidates: [
    {
      id: 'cand-1',
      name: 'Alice Johnson',
      rollNo: '21IT001',
      year: 3,
      section: 'A',
      votes: 100,
      percentage: 66.7,
    },
    {
      id: 'cand-2',
      name: 'Bob Smith',
      rollNo: '21IT002',
      year: 3,
      section: 'B',
      votes: 50,
      percentage: 33.3,
    },
  ],
};

describe('VotingResultsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton loader and NOT the empty state card while isLoading is true', () => {
    // Mock getVotingCampaigns to return an unresolved promise simulating initial fetch in flight
    vi.mocked(eventsApi.getVotingCampaigns).mockReturnValue(new Promise(() => {}));

    render(<VotingResultsPage />);

    // Skeleton loader should be rendered with aria-busy="true"
    const skeletonContainer = screen.getByLabelText(/loading election results/i);
    expect(skeletonContainer).toBeInTheDocument();
    expect(skeletonContainer).toHaveAttribute('aria-busy', 'true');

    // The "No Election Results Available" card MUST NOT render
    expect(screen.queryByText('No Election Results Available')).not.toBeInTheDocument();
    expect(
      screen.queryByText('There are no voting campaigns currently open or finalized with tallied ballots.')
    ).not.toBeInTheDocument();
  });

  it('renders "No Election Results Available" empty state IF and only IF isLoading is false and returned campaigns is empty', async () => {
    vi.mocked(eventsApi.getVotingCampaigns).mockResolvedValue({ campaigns: [] });

    render(<VotingResultsPage />);

    // Initially while request is processing, empty state must not be visible
    expect(screen.queryByText('No Election Results Available')).not.toBeInTheDocument();

    // After resolution of empty campaigns, empty state card appears
    await waitFor(() => {
      expect(screen.getByText('No Election Results Available')).toBeInTheDocument();
    });
    expect(
      screen.getByText('There are no voting campaigns currently open or finalized with tallied ballots.')
    ).toBeInTheDocument();

    // Skeleton is gone
    expect(screen.queryByLabelText(/loading election results/i)).not.toBeInTheDocument();
  });

  it('renders voting results view without flashing empty state when campaigns and results load successfully', async () => {
    vi.mocked(eventsApi.getVotingCampaigns).mockResolvedValue({ campaigns: mockCampaigns });
    vi.mocked(eventsApi.getVotingResults).mockResolvedValue(mockResult);

    render(<VotingResultsPage />);

    // During loading, empty state must NOT flash
    expect(screen.queryByText('No Election Results Available')).not.toBeInTheDocument();

    // Once resolved, populated view appears
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Votes Cast')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.queryByText('No Election Results Available')).not.toBeInTheDocument();
  });
});

describe('useVotingResults Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes isLoading as true and keeps it true until campaigns and active profile are resolved', async () => {
    let resolveCampaigns: (val: { campaigns: VotingCampaign[] }) => void = () => {};
    let resolveResults: (val: CampaignResult) => void = () => {};

    vi.mocked(eventsApi.getVotingCampaigns).mockReturnValue(
      new Promise((resolve) => {
        resolveCampaigns = resolve;
      })
    );
    vi.mocked(eventsApi.getVotingResults).mockReturnValue(
      new Promise((resolve) => {
        resolveResults = resolve;
      })
    );

    const { result } = renderHook(() => useVotingResults());

    // Initially, isLoading is true
    expect(result.current.isLoading).toBe(true);
    expect(result.current.campaigns).toEqual([]);
    expect(result.current.result).toBeNull();

    // Resolve campaigns
    await act(async () => {
      resolveCampaigns({ campaigns: mockCampaigns });
    });

    // isLoading must STAY true while resolving the campaign result profile!
    expect(result.current.isLoading).toBe(true);
    // Verified that it automatically picked the last ACTIVE campaign ('camp-2')
    expect(result.current.selectedId).toBe('camp-2');

    // Resolve results for camp-2
    await act(async () => {
      resolveResults(mockResult);
    });

    // Now isLoading becomes false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.campaigns).toEqual(mockCampaigns);
    expect(result.current.result).toEqual(mockResult);
  });

  it('resolves isLoading to false and leaves campaigns empty when 0 campaigns returned', async () => {
    vi.mocked(eventsApi.getVotingCampaigns).mockResolvedValue({ campaigns: [] });

    const { result } = renderHook(() => useVotingResults());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaigns).toEqual([]);
    expect(result.current.result).toBeNull();
    expect(result.current.selectedId).toBe('');
  });
});

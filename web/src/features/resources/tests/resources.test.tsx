import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SemesterTabs } from '../components/SemesterTabs';
import { ResourceItem } from '../components/ResourceItem';
import { ResourcesPage } from '../pages/ResourcesPage';
import { getAllowedSemesters } from '../utils/resourceAccess';
import { resourcesApi } from '../api';
import type { StudyResource } from '@/shared/types';

vi.mock('../api', () => ({
  resourcesApi: {
    getResources: vi.fn(),
    getAllowedSemesters: vi.fn(),
  },
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({
    session: {
      student: {
        id: 'student-3rd-year',
        name: 'Third Year Student',
        year: 3,
        semester: 5,
        rollNo: '22IT045',
      },
    },
  }),
}));

const mockResource: StudyResource = {
  id: 'res-1',
  title: 'Operating Systems Handouts',
  year: 2,
  semester: 4,
  subject: 'Operating Systems',
  type: 'NOTES',
  driveLink: 'https://drive.google.com/file/d/sample-os/view',
  previewUrl: 'https://drive.google.com/file/d/sample-os/preview',
  downloadUrl: 'https://drive.google.com/uc?export=download&id=sample-os',
  uploadedBy: 'Prof. Rao',
  createdAt: new Date().toISOString(), // Recent (within 7 days)
  isNew: true,
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
    </QueryClientProvider>
  );
}

describe('Resources Feature — Frontend Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates allowed semesters correctly for 2nd, 3rd, and 4th year students', () => {
    expect(getAllowedSemesters({ year: 2 })).toEqual([1, 2, 3, 4]);
    expect(getAllowedSemesters({ year: 3 })).toEqual([1, 2, 3, 4, 5, 6]);
    expect(getAllowedSemesters({ year: 4 })).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('SemesterTabs renders ONLY allowed semesters and never future semesters', () => {
    const onSelect = vi.fn();
    // 3rd-year student allowed semesters: 1 to 6
    render(
      <SemesterTabs
        allowedSemesters={[1, 2, 3, 4, 5, 6]}
        selectedSemester={5}
        onSelectSemester={onSelect}
      />
    );

    // Should see Sem 1 through 6
    expect(screen.getByText('Semester 1')).toBeInTheDocument();
    expect(screen.getByText('Semester 6')).toBeInTheDocument();

    // Should NEVER see Sem 7 or Sem 8
    expect(screen.queryByText('Semester 7')).not.toBeInTheDocument();
    expect(screen.queryByText('Semester 8')).not.toBeInTheDocument();
  });

  it('ResourceItem renders title, badge, "New" badge, and action buttons', () => {
    window.open = vi.fn();
    render(<ResourceItem resource={mockResource} />);

    expect(screen.getByText('Operating Systems Handouts')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();

    const previewBtn = screen.getByRole('button', { name: /preview operating systems handouts/i });
    const downloadBtn = screen.getByRole('button', { name: /download operating systems handouts/i });

    expect(previewBtn).toBeInTheDocument();
    expect(downloadBtn).toBeInTheDocument();

    fireEvent.click(previewBtn);
    expect(window.open).toHaveBeenCalledWith(
      'https://drive.google.com/file/d/sample-os/preview',
      '_blank',
      'noopener,noreferrer'
    );

    fireEvent.click(downloadBtn);
    expect(window.open).toHaveBeenCalledWith(
      'https://drive.google.com/uc?export=download&id=sample-os',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('ResourcesPage renders grouped subject cards and handles empty states', async () => {
    vi.mocked(resourcesApi.getResources).mockResolvedValue({
      resources: [mockResource],
      allowedSemesters: [1, 2, 3, 4, 5, 6],
      currentSemester: 5,
      accessRule: 'CURRENT_YEAR_AND_EARLIER',
      totalCount: 1,
    });

    renderWithProviders(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('Study Resources')).toBeInTheDocument();
      expect(screen.getByText('Operating Systems')).toBeInTheDocument();
      expect(screen.getByText('Operating Systems Handouts')).toBeInTheDocument();
    });
  });

  it('renders honest empty state when no materials exist for the semester', async () => {
    vi.mocked(resourcesApi.getResources).mockResolvedValue({
      resources: [],
      allowedSemesters: [1, 2, 3, 4, 5, 6],
      currentSemester: 5,
      accessRule: 'CURRENT_YEAR_AND_EARLIER',
      totalCount: 0,
    });

    renderWithProviders(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('No materials uploaded yet for this semester')).toBeInTheDocument();
    });
  });
});

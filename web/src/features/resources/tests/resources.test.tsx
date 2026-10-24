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

  it('SemesterTabs includes Semester 7 and Semester 8 with YEAR 4 subtext following Semester 6', () => {
    const onSelect = vi.fn();
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

    // Should include Semester 7 and Semester 8 pills with YEAR 4 subtext
    expect(screen.getByText('Semester 7')).toBeInTheDocument();
    expect(screen.getByText('Semester 8')).toBeInTheDocument();
    const year4Badges = screen.getAllByText('YEAR 4');
    expect(year4Badges).toHaveLength(2);

    // Clicking Semester 7 triggers the onSelectSemester callback
    fireEvent.click(screen.getByText('Semester 7'));
    expect(onSelect).toHaveBeenCalledWith(7);

    // Clicking Semester 8 triggers the onSelectSemester callback
    fireEvent.click(screen.getByText('Semester 8'));
    expect(onSelect).toHaveBeenCalledWith(8);
  });

  it('SemesterTabs renders active and inactive states correctly for Semester 7 and 8', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <SemesterTabs
        allowedSemesters={[1, 2, 3, 4, 5, 6]}
        selectedSemester={7}
        onSelectSemester={onSelect}
      />
    );

    const sem7Button = screen.getByRole('tab', { name: /semester 7/i });
    expect(sem7Button).toHaveAttribute('aria-selected', 'true');
    expect(sem7Button.className).toContain('bg-brand');

    const sem8Button = screen.getByRole('tab', { name: /semester 8/i });
    expect(sem8Button).toHaveAttribute('aria-selected', 'false');
    expect(sem8Button.className).toContain('bg-surface');

    rerender(
      <SemesterTabs
        allowedSemesters={[1, 2, 3, 4, 5, 6]}
        selectedSemester={8}
        onSelectSemester={onSelect}
      />
    );

    expect(sem8Button).toHaveAttribute('aria-selected', 'true');
    expect(sem8Button.className).toContain('bg-brand');
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

  it('clicking Semester 7 or Semester 8 updates active state and filters study materials', async () => {
    const sem7Resource: StudyResource = {
      id: 'res-7',
      title: 'Cloud Computing Architecture Slides',
      year: 4,
      semester: 7,
      subject: 'Cloud Computing',
      type: 'PPT',
      driveLink: 'https://drive.google.com/file/d/sample-cloud/view',
      previewUrl: 'https://drive.google.com/file/d/sample-cloud/preview',
      downloadUrl: 'https://drive.google.com/uc?export=download&id=sample-cloud',
      uploadedBy: 'Admin',
      createdAt: new Date().toISOString(),
      isNew: true,
    };

    vi.mocked(resourcesApi.getResources).mockResolvedValue({
      resources: [sem7Resource],
      allowedSemesters: [1, 2, 3, 4, 5, 6, 7, 8],
      currentSemester: 5,
      accessRule: 'CURRENT_YEAR_AND_EARLIER',
      totalCount: 1,
    });

    renderWithProviders(<ResourcesPage />);

    // Semester 7 and 8 tabs are available
    await waitFor(() => {
      expect(screen.getByText('Semester 7')).toBeInTheDocument();
      expect(screen.getByText('Semester 8')).toBeInTheDocument();
    });

    // Clicking Semester 7 triggers resource query for semester 7
    fireEvent.click(screen.getByText('Semester 7'));

    await waitFor(() => {
      expect(resourcesApi.getResources).toHaveBeenCalledWith(
        expect.objectContaining({ semester: 7 })
      );
    });
  });
});

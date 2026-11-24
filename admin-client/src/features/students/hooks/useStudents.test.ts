import { createElement, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  getStudents: vi.fn(),
  getStudentsExportUrl: vi.fn(() => '/admin/api/students/export?eventId=synthetic-event'),
}));
vi.mock('../api/index', () => ({ studentsApi: apiMock }));

import { createQueryClient } from '@/shared/lib/queryClient';
import { useStudents } from './useStudents';

const roster = {
  eventId: 'synthetic-event',
  data: [
    {
      id: 'student-1',
      rollNo: 'S001',
      name: 'Synthetic Student',
      year: 3,
      section: 'A',
      branch: 'CSE',
      hasUploaded: true,
      submission: null,
    },
  ],
  pagination: { page: 1, limit: 25, total: 1, totalPages: 1, rosterTotal: 1 },
};

const withFreshClient = () => {
  const client = createQueryClient();
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
};

const params = {
  eventId: 'synthetic-event',
  page: 1,
  search: '  synthetic  ',
  year: '3',
  section: 'A',
  uploaded: 'yes',
};

beforeEach(() => {
  apiMock.getStudents.mockReset();
  apiMock.getStudentsExportUrl.mockClear();
});

describe('useStudents', () => {
  it('queries with normalized filters and exposes the roster', async () => {
    apiMock.getStudents.mockResolvedValue(roster);

    const { result } = renderHook(() => useStudents(params), { wrapper: withFreshClient() });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMock.getStudents).toHaveBeenCalledWith({
      eventId: 'synthetic-event',
      page: 1,
      limit: 25,
      search: 'synthetic',
      year: 3,
      section: 'A',
      uploaded: 'yes',
    });
    expect(result.current.data).toEqual(roster);
    expect(result.current.error).toBeNull();
    expect(result.current.exportUrl).toContain('synthetic-event');
  });

  it('surfaces a friendly error and no roster when the request fails', async () => {
    apiMock.getStudents.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(
      () => useStudents({ ...params, search: 'failure-case', uploaded: 'no' }),
      { wrapper: withFreshClient() }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Couldn’t reach the server. Please try again.');
  });
});

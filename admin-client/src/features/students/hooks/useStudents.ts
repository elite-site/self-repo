import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '../api/index';
import { StudentsResponse } from '../types';

export interface StudentsQueryParams {
  eventId: string;
  page: number;
  search: string;
  year: string;
  section: string;
  uploaded: string;
}

export const STUDENTS_QUERY_KEY = ['admin', 'students'] as const;

export const useStudents = (params: StudentsQueryParams) => {
  const query = useQuery<StudentsResponse>({
    queryKey: [
      ...STUDENTS_QUERY_KEY,
      params.eventId,
      params.page,
      params.search.trim() || undefined,
      params.year ? parseInt(params.year, 10) : undefined,
      params.section || undefined,
      params.uploaded || undefined,
    ],
    queryFn: () =>
      studentsApi.getStudents({
        eventId: params.eventId,
        page: params.page,
        limit: 25,
        search: params.search.trim() || undefined,
        year: params.year ? parseInt(params.year, 10) : undefined,
        section: params.section || undefined,
        uploaded: params.uploaded || undefined,
      }),
    retry: false,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending || query.isFetching,
    error: query.isError ? 'Couldn’t reach the server. Please try again.' : null,
    refetch: query.refetch,
    exportUrl: studentsApi.getStudentsExportUrl(params.eventId),
  };
};

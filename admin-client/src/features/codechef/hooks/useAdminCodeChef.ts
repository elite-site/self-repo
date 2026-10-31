import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCodeChefApi } from '../api';
import type { AdminCodeChefFilters } from '../types';

export function useAdminCodeChef() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AdminCodeChefFilters>({ page: 1, limit: 20 });
  const [leaderboardYear, setLeaderboardYear] = useState<number | undefined>(undefined);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['admin', 'codechef', 'students', filters],
    queryFn: () => adminCodeChefApi.getStudents(filters),
    staleTime: 30 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: ['admin', 'codechef', 'stats'],
    queryFn: () => adminCodeChefApi.getStats(),
    staleTime: 60 * 1000,
  });

  const leaderboardQuery = useQuery({
    queryKey: ['admin', 'codechef', 'leaderboard', leaderboardYear],
    queryFn: () => adminCodeChefApi.getLeaderboard({ year: leaderboardYear, limit: 10 }),
    staleTime: 60 * 1000,
  });

  const studentDetailsQuery = useQuery({
    queryKey: ['admin', 'codechef', 'student', selectedStudentId],
    queryFn: () => adminCodeChefApi.getStudentDetails(selectedStudentId!),
    enabled: Boolean(selectedStudentId),
  });

  const resyncMutation = useMutation({
    mutationFn: (studentId: string) => adminCodeChefApi.resyncStudent(studentId),
    onSuccess: () => {
      setMessage({ text: 'Sync initiated successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'codechef'] });
    },
    onError: (err: any) => {
      setMessage({ text: err.message || 'Failed to resync student', type: 'error' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (studentId: string) => adminCodeChefApi.verifyStudent(studentId),
    onSuccess: () => {
      setMessage({ text: 'Student verified successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'codechef'] });
    },
    onError: (err: any) => {
      setMessage({ text: err.message || 'Failed to verify student', type: 'error' });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (studentId: string) => adminCodeChefApi.unlinkStudent(studentId),
    onSuccess: () => {
      setMessage({ text: 'Account unlinked', type: 'success' });
      setSelectedStudentId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'codechef'] });
    },
    onError: (err: any) => {
      setMessage({ text: err.message || 'Failed to unlink student', type: 'error' });
    },
  });

  const handleExportCsv = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.year) params.set('year', String(filters.year));
    if (filters.section) params.set('section', filters.section);
    if (filters.minRating) params.set('minRating', String(filters.minRating));
    if (filters.stars) params.set('stars', String(filters.stars));
    if (filters.status) params.set('status', filters.status);
    if (filters.connected !== undefined) params.set('connected', String(filters.connected));
    window.open(`/admin/api/codechef/export?${params.toString()}`, '_blank');
  }, [filters]);

  return {
    students: studentsQuery.data?.students || [],
    total: studentsQuery.data?.total || 0,
    page: studentsQuery.data?.page || 1,
    limit: studentsQuery.data?.limit || 20,
    totalPages: studentsQuery.data?.totalPages || 1,
    loading: studentsQuery.isLoading,
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    leaderboard: leaderboardQuery.data?.leaderboard || [],
    leaderboardLoading: leaderboardQuery.isLoading,
    leaderboardYear,
    setLeaderboardYear,
    filters,
    setFilters,
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentDetails: studentDetailsQuery.data,
    detailsLoading: studentDetailsQuery.isLoading,
    message,
    setMessage,
    handleExportCsv,
    resyncStudent: (id: string) => resyncMutation.mutate(id),
    resyncing: resyncMutation.isPending,
    verifyStudent: (id: string) => verifyMutation.mutate(id),
    verifying: verifyMutation.isPending,
    unlinkStudent: (id: string) => unlinkMutation.mutate(id),
    unlinking: unlinkMutation.isPending,
  };
}

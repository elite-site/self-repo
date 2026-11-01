import { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSession } from '@/context/SessionContext';
import { resourcesApi } from '../api';
import { getAllowedSemesters, getCurrentSemester } from '../utils/resourceAccess';
import type { ResourceType, StudyResource } from '@/shared/types';

export function useResources() {
  const { session } = useSession();
  const student = session?.student;

  // Local fallback determination of allowed semesters
  const localAllowed = useMemo(() => {
    return getAllowedSemesters({
      year: student?.year,
      semester: student?.semester,
    });
  }, [student?.year, student?.semester]);

  const defaultSemester = useMemo(() => {
    const sem = getCurrentSemester({
      year: student?.year,
      semester: student?.semester,
    });
    return localAllowed.includes(sem) ? sem : (localAllowed[localAllowed.length - 1] || 1);
  }, [student?.year, student?.semester, localAllowed]);

  const [selectedSemester, setSelectedSemester] = useState<number>(defaultSemester);
  const [selectedType, setSelectedType] = useState<ResourceType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const queryParams = useMemo(() => {
    return {
      semester: selectedSemester,
      type: selectedType === 'ALL' ? undefined : selectedType,
      search: searchQuery.trim() || undefined,
    };
  }, [selectedSemester, selectedType, searchQuery]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['student-resources', queryParams],
    queryFn: () => resourcesApi.getResources(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // Ensure Semester 7 & 8 are available for filtering across all views
  const allowedSemesters = useMemo(() => {
    const base = data?.allowedSemesters || localAllowed;
    const list = [...base];
    if (!list.includes(7)) list.push(7);
    if (!list.includes(8)) list.push(8);
    return list.sort((a, b) => a - b);
  }, [data?.allowedSemesters, localAllowed]);

  // Keep selected semester in sync if default changes on initial load
  useEffect(() => {
    if (defaultSemester && !allowedSemesters.includes(selectedSemester)) {
      setSelectedSemester(defaultSemester);
    }
  }, [defaultSemester, allowedSemesters, selectedSemester]);
  const resources: StudyResource[] = data?.resources || [];

  // Group resources by subject
  const groupedBySubject = useMemo(() => {
    const map = new Map<string, StudyResource[]>();
    for (const item of resources) {
      const subject = item.subject || 'General';
      const existing = map.get(subject) || [];
      existing.push(item);
      map.set(subject, existing);
    }
    return Array.from(map.entries()).map(([subject, items]) => ({
      subject,
      items,
    }));
  }, [resources]);

  return {
    student,
    allowedSemesters,
    selectedSemester,
    setSelectedSemester,
    selectedType,
    setSelectedType,
    searchQuery,
    setSearchQuery,
    resources,
    groupedBySubject,
    isLoading: isLoading && !data,
    isFetching,
    isError,
    error: error ? (error as any).message || 'Failed to load study resources.' : null,
    refetch,
  };
}

import { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { directoryApi } from '../api';
import { DirectoryStudent, SkillItem, StatusFilter } from '../types';
import { useStudentIndex, searchAndFilterStudents } from './useStudentIndex';

export function useDirectory(limit = 24) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [search, setSearch] = useState(initialSearch);
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fallback states if index request fails
  const [fallbackStudents, setFallbackStudents] = useState<DirectoryStudent[]>([]);
  const [fallbackTotal, setFallbackTotal] = useState(0);
  const [fallbackTotalPages, setFallbackTotalPages] = useState(1);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Instant index hook (React Query, staleTime 5m, localStorage)
  const studentIndex = useStudentIndex();

  // Keep deep links (?search=) working on searchParams navigation
  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== search) {
      setSearch(q);
      setPage(1);
    }
  }, [searchParams]);

  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  useEffect(() => {
    const currentQ = searchParamsRef.current.get('search') || '';
    if (search !== currentQ) {
      const nextParams = new URLSearchParams(searchParamsRef.current);
      if (search.trim()) {
        nextParams.set('search', search.trim());
      } else {
        nextParams.delete('search');
      }
      setSearchParams(nextParams, { replace: true });
    }
  }, [search, setSearchParams]);

  // Load available skills for filter dropdown
  useEffect(() => {
    directoryApi
      .getPublicSkills()
      .then((skills) => {
        if (Array.isArray(skills)) setAvailableSkills(skills);
      })
      .catch((err) => {
        // Non-fatal: the skill filter just stays empty; directory results are unaffected.
        console.warn('Could not load directory skill filters:', err);
      });
  }, []);

  // Use deferred value for instant responsive keystroke rendering
  const deferredSearch = useDeferredValue(search);

  // INSTANT IN-MEMORY PATH
  const inMemoryFiltered = useMemo(() => {
    if (!studentIndex.isAvailable) return [];
    return searchAndFilterStudents(studentIndex.indexedStudents, {
      search: deferredSearch,
      year: yearFilter,
      section: sectionFilter,
      status: statusFilter,
      skillName: skillFilter,
    });
  }, [
    studentIndex.isAvailable,
    studentIndex.indexedStudents,
    deferredSearch,
    yearFilter,
    sectionFilter,
    statusFilter,
    skillFilter,
  ]);

  const inMemoryTotal = inMemoryFiltered.length;
  const inMemoryTotalPages = Math.max(1, Math.ceil(inMemoryTotal / limit));
  const inMemoryPaginated = useMemo(() => {
    const start = (page - 1) * limit;
    return inMemoryFiltered.slice(start, start + limit);
  }, [inMemoryFiltered, page, limit]);

  // FALLBACK SERVER SEARCH PATH (Requirement 2 & 3d: AbortController to cancel previous request)
  useEffect(() => {
    // Only run server fallback if index request failed and index data is not available
    if (studentIndex.isAvailable || (!studentIndex.isError && studentIndex.isLoading)) {
      return;
    }

    const abortController = new AbortController();
    setFallbackLoading(true);
    setFallbackFailed(false);

    directoryApi
      .getPublicStudents(
        {
          search: deferredSearch.trim() || undefined,
          year: yearFilter === 'ALL' ? undefined : yearFilter,
          section: sectionFilter === 'ALL' ? undefined : sectionFilter,
          skillName: skillFilter || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          page,
          limit,
        },
        abortController.signal
      )
      .then((data) => {
        if (data && Array.isArray(data.students)) {
          setFallbackStudents(data.students);
          setFallbackTotal(data.total ?? 0);
          setFallbackTotalPages(data.totalPages || Math.ceil((data.total ?? 0) / limit) || 1);
        } else if (Array.isArray(data)) {
          setFallbackStudents(data as any);
          setFallbackTotal(data.length);
          setFallbackTotalPages(1);
        }
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        setFallbackStudents([]);
        setFallbackTotal(0);
        setFallbackTotalPages(1);
        setFallbackFailed(true);
      })
      .finally(() => {
        setFallbackLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [
    studentIndex.isAvailable,
    studentIndex.isError,
    studentIndex.isLoading,
    deferredSearch,
    yearFilter,
    sectionFilter,
    skillFilter,
    statusFilter,
    page,
    reloadKey,
    limit,
  ]);

  const isUsingIndex = studentIndex.isAvailable;
  const students = isUsingIndex ? inMemoryPaginated : fallbackStudents;
  const total = isUsingIndex ? inMemoryTotal : fallbackTotal;
  const totalPages = isUsingIndex ? inMemoryTotalPages : fallbackTotalPages;
  const loading = isUsingIndex ? false : (studentIndex.isLoading || fallbackLoading);
  const failed = isUsingIndex ? false : (studentIndex.isError && fallbackFailed);

  const resetFilters = () => {
    setSearch('');
    setYearFilter('ALL');
    setSectionFilter('ALL');
    setSkillFilter('');
    setStatusFilter('ALL');
    setPage(1);
    if (searchParams.get('search')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('search');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const updateSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const updateYearFilter = (value: string) => {
    setYearFilter(value);
    setPage(1);
  };

  const updateSectionFilter = (value: string) => {
    setSectionFilter(value);
    setPage(1);
  };

  const updateSkillFilter = (value: string) => {
    setSkillFilter(value);
    setPage(1);
  };

  const updateStatusFilter = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const retry = () => {
    studentIndex.refetch();
    setReloadKey((k) => k + 1);
  };

  return {
    students,
    loading,
    failed,
    search,
    setSearch: updateSearch,
    yearFilter,
    updateYearFilter,
    sectionFilter,
    updateSectionFilter,
    skillFilter,
    updateSkillFilter,
    availableSkills,
    statusFilter,
    updateStatusFilter,
    page,
    setPage,
    total,
    totalPages,
    filtersOpen,
    setFiltersOpen,
    resetFilters,
    retry,
  };
}

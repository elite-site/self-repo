import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { directoryApi } from '../api';
import { DirectoryStudent, SkillItem, StatusFilter } from '../types';

export function useDirectory(limit = 24) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('');
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== search) {
      setSearch(q);
      setDebouncedSearch(q);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    directoryApi
      .getPublicSkills()
      .then((skills) => {
        if (Array.isArray(skills)) setAvailableSkills(skills);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    directoryApi
      .getPublicStudents({
        search: debouncedSearch.trim() || undefined,
        year: yearFilter === 'ALL' ? undefined : yearFilter,
        section: sectionFilter === 'ALL' ? undefined : sectionFilter,
        skillName: skillFilter || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit,
      })
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.students)) {
          setStudents(data.students);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages || Math.ceil((data.total ?? 0) / limit) || 1);
        } else if (Array.isArray(data)) {
          setStudents(data as any);
          setTotal(data.length);
          setTotalPages(1);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStudents([]);
        setTotal(0);
        setTotalPages(1);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, yearFilter, sectionFilter, skillFilter, statusFilter, page, reloadKey, limit]);

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
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

  const retry = () => setReloadKey((k) => k + 1);

  return {
    students,
    loading,
    failed,
    search,
    setSearch,
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

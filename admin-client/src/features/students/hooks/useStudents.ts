import { useState, useEffect, useCallback } from 'react';
import { studentsApi } from '../api';
import { StudentsResponse } from '../types';

export const useStudents = (activeEventId: string) => {
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [uploadedFilter, setUploadedFilter] = useState<string>('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentsApi.getStudents({
        eventId: activeEventId,
        page,
        limit: 25,
        search: search.trim() || undefined,
        year: yearFilter ? parseInt(yearFilter, 10) : undefined,
        section: sectionFilter || undefined,
        uploaded: uploadedFilter || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Error loading students', err);
    } finally {
      setLoading(false);
    }
  }, [activeEventId, page, search, yearFilter, sectionFilter, uploadedFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return {
    data,
    loading,
    page,
    setPage,
    search,
    setSearch,
    yearFilter,
    setYearFilter,
    sectionFilter,
    setSectionFilter,
    uploadedFilter,
    setUploadedFilter,
    loadStudents,
    exportUrl: studentsApi.getStudentsExportUrl(activeEventId),
  };
};

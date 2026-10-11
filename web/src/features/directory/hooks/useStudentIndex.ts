import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { directoryApi } from '../api';
import { DirectoryStudent, StatusFilter } from '../types';

export const STUDENT_INDEX_STORAGE_KEY = 'student_index_v1';
export const STUDENT_INDEX_QUERY_KEY = ['public', 'students', 'index'] as const;

interface CachedIndexPayload {
  version: number;
  timestamp: number;
  data: DirectoryStudent[];
}

export function readCachedIndex(): DirectoryStudent[] | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STUDENT_INDEX_STORAGE_KEY);
    if (!raw) return null;
    const parsed: CachedIndexPayload = JSON.parse(raw);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {
    // Empty storage must work (e.g. quota, private browsing, corrupted data)
  }
  return null;
}

export function writeCachedIndex(data: DirectoryStudent[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const payload: CachedIndexPayload = {
      version: 1,
      timestamp: Date.now(),
      data,
    };
    window.localStorage.setItem(STUDENT_INDEX_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Empty storage must work
  }
}

export interface IndexedStudent extends DirectoryStudent {
  _haystack: string;
}

export function buildStudentHaystack(student: DirectoryStudent): string {
  const roll = student.rollNo || '';
  const name = student.name || '';
  const skills = (student.skills || student.profile?.skills || [])
    .map((s: any) => (typeof s === 'string' ? s : (s.skill?.name || s.name || '')))
    .filter(Boolean);
  return `${roll} ${name} ${skills.join(' ')}`.toLowerCase();
}

/**
 * Rank match quality for instant search:
 * - Tier 1: rollNo ends-with or starts-with match
 * - Tier 2: name prefix match
 * - Tier 3: any other substring match (skill, middle of name/roll)
 */
export function rankStudent(student: DirectoryStudent, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 3;
  const roll = (student.rollNo || '').toLowerCase();
  const name = (student.name || '').toLowerCase();

  // Tier 1: rollNo ends-with/starts-with match first
  if (roll.startsWith(q) || roll.endsWith(q)) {
    return 1;
  }

  // Tier 2: name prefix match
  if (name.startsWith(q)) {
    return 2;
  }

  // Tier 3: the rest
  return 3;
}

export interface FilterParams {
  search: string;
  year: string;
  section: string;
  status: StatusFilter;
  skillName: string;
}

export function searchAndFilterStudents(
  students: IndexedStudent[],
  filters: FilterParams
): DirectoryStudent[] {
  const { search, year, section, status, skillName } = filters;
  const trimmed = search.trim().toLowerCase();
  const tokens = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

  const filtered = students.filter((s) => {
    // Status filter
    if (status !== 'ALL' && s.status !== status) {
      return false;
    }

    // Year filter
    if (year !== 'ALL') {
      const y = parseInt(year, 10);
      if (!isNaN(y) && s.year !== y) return false;
    }

    // Section filter
    if (section !== 'ALL' && s.section !== section) {
      return false;
    }

    // Skill filter
    if (skillName) {
      const targetSkill = skillName.toLowerCase();
      const hasSkill = (s.skills || s.profile?.skills || []).some((sk: any) => {
        const n = typeof sk === 'string' ? sk : (sk.skill?.name || sk.name);
        return n && n.toLowerCase() === targetSkill;
      });
      if (!hasSkill) return false;
    }

    // Every search token must be a substring of the haystack
    if (tokens.length > 0) {
      const matches = tokens.every((token) => s._haystack.includes(token));
      if (!matches) return false;
    }

    return true;
  });

  if (trimmed) {
    filtered.sort((a, b) => {
      const rankA = rankStudent(a, trimmed);
      const rankB = rankStudent(b, trimmed);
      if (rankA !== rankB) return rankA - rankB;

      // Tie breaker: year desc, section asc, rollNo asc
      if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
      if ((a.section || '') !== (b.section || '')) return (a.section || '').localeCompare(b.section || '');
      return (a.rollNo || '').localeCompare(b.rollNo || '');
    });
  }

  return filtered;
}

export function useStudentIndexQuery() {
  return useQuery<DirectoryStudent[]>({
    queryKey: STUDENT_INDEX_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const data = await directoryApi.getStudentIndex(signal);
      writeCachedIndex(data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    initialData: () => readCachedIndex() ?? undefined,
  });
}

export function useStudentIndex() {
  const query = useStudentIndexQuery();

  const indexedStudents = useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) return [];
    return query.data.map((s) => ({
      ...s,
      _haystack: buildStudentHaystack(s),
    }));
  }, [query.data]);

  return {
    ...query,
    indexedStudents,
    isAvailable: Boolean(query.data && query.data.length > 0),
  };
}

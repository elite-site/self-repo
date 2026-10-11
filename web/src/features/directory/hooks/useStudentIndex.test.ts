import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  rankStudent,
  buildStudentHaystack,
  searchAndFilterStudents,
  readCachedIndex,
  writeCachedIndex,
  STUDENT_INDEX_STORAGE_KEY,
  IndexedStudent,
} from './useStudentIndex';
import { DirectoryStudent } from '../types';

describe('useStudentIndex - Ranking & Search Core', () => {
  const mockStudents: DirectoryStudent[] = [
    {
      id: '1',
      rollNo: '23A91A1217',
      name: 'Alice Smith',
      year: 3,
      section: 'A',
      status: 'ACTIVE',
      skills: [{ skill: { name: 'React' } }, { skill: { name: 'TypeScript' } }],
    },
    {
      id: '2',
      rollNo: '23A91A1201',
      name: 'Bob 1217 Jones',
      year: 3,
      section: 'B',
      status: 'ACTIVE',
      skills: [{ skill: { name: 'Python' } }],
    },
    {
      id: '3',
      rollNo: '23A91A1250',
      name: '1217 Charlie',
      year: 2,
      section: 'A',
      status: 'ACTIVE',
      skills: [{ skill: { name: 'Java' } }],
    },
    {
      id: '4',
      rollNo: '23A91A1299',
      name: 'David Johnson',
      year: 4,
      section: 'A',
      status: 'GRADUATED',
      skills: [{ skill: { name: 'Node.js' } }],
    },
  ];

  const indexedStudents: IndexedStudent[] = mockStudents.map((s) => ({
    ...s,
    _haystack: buildStudentHaystack(s),
  }));

  describe('rankStudent', () => {
    it('ranks rollNo ends-with match as Tier 1', () => {
      const student = mockStudents[0]; // 23A91A1217
      expect(rankStudent(student, '1217')).toBe(1);
    });

    it('ranks rollNo starts-with match as Tier 1', () => {
      const student = mockStudents[0]; // 23A91A1217
      expect(rankStudent(student, '23A9')).toBe(1);
    });

    it('ranks name prefix match as Tier 2', () => {
      const student = mockStudents[0]; // Alice Smith
      expect(rankStudent(student, 'alice')).toBe(2);
      expect(rankStudent(student, 'ali')).toBe(2);
    });

    it('ranks matches that are not rollNo ends/starts or name prefix as Tier 3', () => {
      const student = mockStudents[0]; // Alice Smith with React
      // Skill match
      expect(rankStudent(student, 'react')).toBe(3);
      // Middle of rollNo match
      expect(rankStudent(student, '91A1')).toBe(3);
      // Middle of name match
      expect(rankStudent(student, 'smith')).toBe(3);
    });
  });

  describe('searchAndFilterStudents', () => {
    it('ranks rollNo match first, then name prefix, then other matches', () => {
      // Query "1217":
      // - Alice: rollNo ends with 1217 -> rank 1
      // - Charlie: name starts with 1217 -> rank 2
      // - Bob: name contains 1217 -> rank 3
      const results = searchAndFilterStudents(indexedStudents, {
        search: '1217',
        year: 'ALL',
        section: 'ALL',
        status: 'ALL',
        skillName: '',
      });

      expect(results).toHaveLength(3);
      expect(results[0].rollNo).toBe('23A91A1217'); // Tier 1 (rollNo ends with 1217)
      expect(results[1].name).toBe('1217 Charlie'); // Tier 2 (name prefix 1217)
      expect(results[2].name).toBe('Bob 1217 Jones'); // Tier 3 (contained in name)
    });

    it('splits multi-token query on spaces and matches all tokens against haystack', () => {
      const results = searchAndFilterStudents(indexedStudents, {
        search: 'alice react',
        year: 'ALL',
        section: 'ALL',
        status: 'ALL',
        skillName: '',
      });

      expect(results).toHaveLength(1);
      expect(results[0].rollNo).toBe('23A91A1217');
    });

    it('filters accurately by year, section, status, and skillName', () => {
      const year3Results = searchAndFilterStudents(indexedStudents, {
        search: '',
        year: '3',
        section: 'A',
        status: 'ACTIVE',
        skillName: 'React',
      });

      expect(year3Results).toHaveLength(1);
      expect(year3Results[0].rollNo).toBe('23A91A1217');

      const alumniResults = searchAndFilterStudents(indexedStudents, {
        search: '',
        year: 'ALL',
        section: 'ALL',
        status: 'GRADUATED',
        skillName: '',
      });

      expect(alumniResults).toHaveLength(1);
      expect(alumniResults[0].rollNo).toBe('23A91A1299');
    });
  });

  describe('localStorage resilience', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it('reads and writes cached index successfully', () => {
      writeCachedIndex(mockStudents);
      const cached = readCachedIndex();
      expect(cached).toHaveLength(4);
      expect(cached?.[0].rollNo).toBe('23A91A1217');
    });

    it('gracefully handles missing or empty localStorage without throwing', () => {
      localStorage.clear();
      expect(readCachedIndex()).toBeNull();
    });

    it('gracefully handles corrupted localStorage JSON without throwing', () => {
      localStorage.setItem(STUDENT_INDEX_STORAGE_KEY, 'invalid-json{{{');
      expect(readCachedIndex()).toBeNull();
    });

    it('gracefully handles localStorage throwing (e.g. quota exceeded or security restriction)', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => writeCachedIndex(mockStudents)).not.toThrow();
      expect(readCachedIndex()).toBeNull();
    });
  });
});

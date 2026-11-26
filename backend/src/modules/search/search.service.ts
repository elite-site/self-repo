import { env } from '../../config/env';
import { TtlCache } from '../../utils/ttlCache';
import { getAllowedSemesters } from '../resources';
import {
  searchRepository,
  SearchRepository,
  type CatalogIndexEntry,
  type SharedCatalogIndex,
  type StudentSearchContext,
} from './search.repository';
import {
  SEARCH_RESULT_TYPES,
  type SearchItem,
  type SearchParams,
  type SearchResponse,
  type SearchResultType,
} from './search.types';

const CATALOG_INDEX_TTL_MS = 60_000;
const sharedCatalogCache = new TtlCache<SharedCatalogIndex>(CATALOG_INDEX_TTL_MS, 4);

const CATALOG_TYPES = new Set<SearchResultType>([
  'course',
  'lesson',
  'event',
  'resource',
  'announcement',
  'student',
]);

type PersonalSearchType = 'project' | 'resume' | 'achievement' | 'certificate' | 'github';

const PERSONAL_TYPES: PersonalSearchType[] = [
  'project',
  'resume',
  'achievement',
  'certificate',
  'github',
];

function scoreItem(item: SearchItem, queryLower: string, currentStudentId: string): number {
  const titleLower = item.title.toLowerCase();
  let score = 0;

  if (titleLower === queryLower) score += 100;
  else if (titleLower.startsWith(queryLower)) score += 60;
  else if (titleLower.includes(queryLower)) score += 30;
  else score += 10;

  if (item.studentId === currentStudentId) score += 15;
  return score;
}

function isAnnouncementVisible(
  entry: CatalogIndexEntry,
  student: StudentSearchContext | null,
): boolean {
  if (entry.targetAll !== false) return true;
  if (!student) return false;
  if (entry.targetYear !== null && entry.targetYear !== undefined && entry.targetYear !== student.year) {
    return false;
  }
  if (
    entry.targetSection !== null &&
    entry.targetSection !== undefined &&
    entry.targetSection !== student.section
  ) {
    return false;
  }
  return true;
}

export class SearchService {
  constructor(private readonly repo: SearchRepository = searchRepository) {}

  invalidateIndexCache(): void {
    sharedCatalogCache.clear();
  }

  /**
   * Search across all student-accessible portal content using a two-tier strategy:
   * 1. Shared catalog items (courses, lessons, events, resources, announcements,
   *    directory students) come from a 60s single-flight `TtlCache` index, so
   *    repeated searches resolve in-memory with zero extra DB load.
   * 2. Student-owned & moderated items (projects, resumes, achievements,
   *    certificates, GitHub repos) query pg_trgm-indexed columns in parallel.
   */
  async search(studentId: string, params: SearchParams): Promise<SearchResponse> {
    const { q, limit = 15, type } = params;
    const queryLower = q.toLowerCase();
    const includeLearning = env.FEATURE_LEARNINGHUB;

    const requestedTypes: SearchResultType[] = type
      ? [type]
      : SEARCH_RESULT_TYPES.filter((t) => includeLearning || (t !== 'course' && t !== 'lesson'));

    const needsCatalog = requestedTypes.some((t) => CATALOG_TYPES.has(t));
    const personalTypes = requestedTypes.filter((t): t is PersonalSearchType =>
      PERSONAL_TYPES.includes(t as PersonalSearchType),
    );

    const cacheKey = includeLearning ? 'catalog:with-learning' : 'catalog:no-learning';

    const [studentCtx, catalogIndex, ...personalResults] = await Promise.all([
      needsCatalog ? this.repo.getStudentContext(studentId) : Promise.resolve(null),
      needsCatalog
        ? sharedCatalogCache.wrap(cacheKey, () => this.repo.loadSharedCatalogIndex(includeLearning))
        : Promise.resolve(null),
      ...personalTypes.map((t) => this.repo.findPersonalByType(t, studentId, q, limit)),
    ]);

    const candidates: SearchItem[] = [];

    if (catalogIndex) {
      const allowedSemesters = studentCtx ? new Set(getAllowedSemesters(studentCtx)) : null;

      const collectFrom = (entries: CatalogIndexEntry[], predicate?: (entry: CatalogIndexEntry) => boolean) => {
        for (const entry of entries) {
          if (predicate && !predicate(entry)) continue;
          if (entry.searchText.includes(queryLower)) {
            candidates.push(entry.item);
          }
        }
      };

      if (includeLearning && requestedTypes.includes('course')) {
        collectFrom(catalogIndex.courses);
      }
      if (includeLearning && requestedTypes.includes('lesson')) {
        collectFrom(catalogIndex.lessons);
      }
      if (requestedTypes.includes('event')) {
        collectFrom(catalogIndex.events);
      }
      if (requestedTypes.includes('resource') && allowedSemesters) {
        collectFrom(
          catalogIndex.resources,
          (entry) => entry.semester !== undefined && allowedSemesters.has(entry.semester),
        );
      }
      if (requestedTypes.includes('announcement')) {
        collectFrom(catalogIndex.announcements, (entry) => isAnnouncementVisible(entry, studentCtx));
      }
      if (requestedTypes.includes('student')) {
        collectFrom(catalogIndex.students);
      }
    }

    for (const items of personalResults) {
      candidates.push(...items);
    }

    const seen = new Set<string>();
    const deduped: SearchItem[] = [];
    for (const item of candidates) {
      const key = `${item.type}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    deduped.sort((a, b) => {
      const scoreDiff = scoreItem(b, queryLower, studentId) - scoreItem(a, queryLower, studentId);
      if (scoreDiff !== 0) return scoreDiff;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    const items = deduped.slice(0, limit);
    return { items, total: deduped.length, query: q };
  }
}

export const searchService = new SearchService();

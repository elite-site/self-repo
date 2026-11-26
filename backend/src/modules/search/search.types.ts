export const SEARCH_RESULT_TYPES = [
  'course',
  'lesson',
  'project',
  'resume',
  'resource',
  'event',
  'achievement',
  'certificate',
  'github',
  'student',
  'announcement',
] as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

/** One searchable record, shaped as a stable DTO for the client. */
export interface SearchItem {
  type: SearchResultType;
  id: string;
  title: string;
  description: string | null;
  url: string;
  studentId: string | null;
  updatedAt: Date;
}

export interface SearchResponse {
  items: SearchItem[];
  total: number;
  query: string;
}

export interface SearchParams {
  q: string;
  limit?: number;
  type?: SearchResultType;
}

export interface ResultUrlMeta {
  slug?: string;
  isOwn?: boolean;
  rollNo?: string | null;
}

/** Canonical app route a search result navigates to. */
export function buildResultUrl(
  type: SearchResultType,
  id: string,
  meta: ResultUrlMeta = {},
): string {
  switch (type) {
    case 'course':
      return `/learning/courses/${meta.slug || id}`;
    case 'lesson':
      return `/learning/lessons/${id}`;
    case 'project':
      if (!meta.isOwn && meta.rollNo) return `/students/${meta.rollNo}`;
      return '/portfolio/projects';
    case 'achievement':
      if (!meta.isOwn && meta.rollNo) return `/students/${meta.rollNo}`;
      return '/portfolio/achievements';
    case 'certificate':
      if (!meta.isOwn && meta.rollNo) return `/students/${meta.rollNo}`;
      return '/portfolio/certificates';
    case 'resume':
      if (!meta.isOwn && meta.rollNo) return `/students/${meta.rollNo}/resume`;
      return '/resume';
    case 'resource':
      return '/resources';
    case 'event':
      return `/events/${id}`;
    case 'github':
      return '/github';
    case 'student':
      return `/students/${meta.rollNo || id}`;
    case 'announcement':
      return `/announcements/${id}`;
  }
}

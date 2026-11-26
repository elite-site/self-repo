import { client } from '@/shared/api/client';

/**
 * Mirrors `SearchResultType` in `backend/src/modules/search/search.types.ts` (DRY-5).
 */
export type SearchResultType =
  | 'course'
  | 'lesson'
  | 'project'
  | 'resume'
  | 'resource'
  | 'event'
  | 'achievement'
  | 'certificate'
  | 'github'
  | 'student'
  | 'announcement';

export interface SearchItem {
  type: SearchResultType;
  id: string;
  title: string;
  description: string | null;
  url: string;
  studentId: string | null;
  updatedAt: string;
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

export const searchApi = {
  async search(params: SearchParams, signal?: AbortSignal): Promise<SearchResponse> {
    const res = await client.get<SearchResponse>('/student/search', { params, signal });
    return res.data;
  },
};

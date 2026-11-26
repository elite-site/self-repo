export { searchRouter } from './search.routes';
export { searchService, SearchService } from './search.service';
export { parseSearchQuery } from './search.schemas';
export type { ValidatedSearchQuery } from './search.schemas';
export { SEARCH_RESULT_TYPES, buildResultUrl } from './search.types';
export type {
  SearchResultType,
  SearchItem,
  SearchResponse,
  SearchParams,
  ResultUrlMeta,
} from './search.types';

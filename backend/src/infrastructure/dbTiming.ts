import { AsyncLocalStorage } from 'async_hooks';

export interface DbTimingContext {
  dbDuration: number;
}

export const dbTimingStorage = new AsyncLocalStorage<DbTimingContext>();

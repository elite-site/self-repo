import { describe, expect, it, vi } from 'vitest';
import { prefetchRoute, registerRoutePrefetchLoaders } from './prefetch';

describe('route prefetch registry', () => {
  it('loads a registered route once, ignoring query and hash', () => {
    const load = vi.fn().mockResolvedValue(undefined);
    registerRoutePrefetchLoaders({ '/synthetic-once': load });

    prefetchRoute('/synthetic-once?filter=a#top');
    prefetchRoute('/synthetic-once');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an unregistered or empty path', () => {
    const load = vi.fn().mockResolvedValue(undefined);
    registerRoutePrefetchLoaders({ '/synthetic-other': load });

    prefetchRoute('/synthetic-unknown');
    prefetchRoute('');

    expect(load).not.toHaveBeenCalled();
  });
});

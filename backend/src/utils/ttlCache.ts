/**
 * A tiny in-process TTL cache with single-flight loading.
 *
 * ## Why this exists alongside `Cache-Control`
 *
 * The `Cache-Control: public, max-age=60` headers on the public read endpoints
 * only help the *browser*. Two students hitting `GET /public/students` at the
 * same moment still produce two identical database queries, and two hundred
 * simultaneous page loads produce two hundred queries. This collapses that:
 * the first request loads, and every concurrent or subsequent request inside
 * the TTL is served from memory.
 *
 * The `Cache-Control` headers are deliberately left alone. They still do their
 * job for repeat visits from an individual browser, and removing them would
 * mean re-fetching on every page navigation instead of once per minute.
 *
 * ## Single-flight
 *
 * `wrap()` de-duplicates concurrent misses on the same key. Without it, a cold
 * key hit by 200 simultaneous requests runs 200 loaders, because none of them
 * can see the others' in-flight promise until the first one resolves and
 * populates the cache. With it, the first request starts the load and the
 * other 199 await that same promise. This is the part that actually matters
 * under a burst, and it is why this is not just a `Map` with timestamps.
 *
 * ## Bounded size
 *
 * `maxEntries` caps the number of live keys. On a 500 MB instance an unbounded
 * cache is just a second way to run out of memory: student roll numbers are
 * effectively unbounded input, so a public endpoint keyed per-student would
 * otherwise grow forever. The least-recently-used entry is evicted past the
 * cap, which is a crude but adequate policy for short-TTL data that is cheap
 * to recompute.
 *
 * ## Not a substitute for authorization
 *
 * Cached values are shared across requests, so only cache responses that are
 * already public and identical for every caller. Never put anything scoped to
 * one student through this.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<T>>();

  /**
   * @param ttlMs        how long a loaded value stays fresh
   * @param maxEntries   hard cap on live keys; oldest insertion is evicted first
   */
  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number = 200,
  ) {}

  /** Returns the cached value, or `undefined` when absent or expired. */
  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    // Re-inserting moves the key to the end of the Map's iteration order, which
    // is what makes the eviction below approximate LRU rather than FIFO.
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });

    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next();
      if (oldest.done) break;
      this.store.delete(oldest.value);
    }
  }

  /**
   * Returns the cached value for `key`, calling `load` only on a miss.
   *
   * Concurrent misses share one `load` call. A rejected load is not cached and
   * is not left behind in `inflight`, so the next request retries rather than
   * inheriting a stale failure.
   */
  async wrap(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await load();
        this.set(key, value);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /** Drops every entry. Used by tests and by any manual cache bust. */
  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }

  /** Number of live, unexpired keys. Exposed for the cache-hit log line. */
  get size(): number {
    return this.store.size;
  }
}

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Connection pool sizing.
//   connection_limit   – max simultaneous DB connections
//   pool_timeout       – seconds to wait for a free connection before throwing
//   connect_timeout    – seconds for initial socket connect (avoids silent hangs)
//   statement_cache_size – prepared-statement cache per connection (0 for PgBouncer/Supabase pooler)
//
// ## Why 5 and not the 15/20 this used to set
//
// The previous values were sized for a horizontally scaled deployment, where a
// large pool per instance is how you absorb concurrency. This is a single
// instance on a 0.1-core / 500 MB box, where that reasoning inverts:
//
//   - A connection is only ever used by one query at a time, and this process
//     runs on one core. Beyond roughly one connection per core, extra
//     connections buy no throughput, they only add context switching.
//   - Each connection costs memory in this process: a Prisma engine slot, a
//     socket, and a prepared-statement cache. The old direct-connection config
//     combined 20 connections with `statement_cache_size=100`, which is 2000
//     cached prepared statements held in a 500 MB heap. That combination is the
//     classic way a Prisma app gets OOM-killed on a small Render instance.
//   - On Supabase every connection is a separate Postgres backend, so an
//     oversized pool also risks exhausting the project's connection limit.
//
// `pool_timeout` stays at 15s so a brief queue still succeeds rather than
// throwing, which is what keeps a burst of 200 requests degrading into a short
// wait instead of errors. Both values are only defaults: an explicit
// `connection_limit` in DATABASE_URL still wins.
export function buildDatabaseUrl(base: string): string {
  try {
    const url = new URL(base);
    const isPooler =
      url.port === '6543' ||
      url.hostname.includes('pooler.supabase.com') ||
      url.searchParams.get('pgbouncer') === 'true';

    if (isPooler) {
      // Supabase transaction pooler (PgBouncer) does NOT support prepared statements across transactions.
      // Setting pgbouncer=true and statement_cache_size=0 prevents "prepared statement s0 already exists" crashes.
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('statement_cache_size', '0');
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '5');
      }
    } else {
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '5');
      }
      if (!url.searchParams.has('statement_cache_size')) {
        url.searchParams.set('statement_cache_size', '20');
      }
    }

    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '15');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10');
    }

    return url.toString();
  } catch {
    return base; // Not a valid URL (e.g. unit-test stub) — leave unchanged
  }
}

const DATABASE_URL = buildDatabaseUrl(process.env.DATABASE_URL || '');

export const prisma =
  global.__prisma ||
  new PrismaClient({
    datasources: DATABASE_URL
      ? { db: { url: DATABASE_URL } }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

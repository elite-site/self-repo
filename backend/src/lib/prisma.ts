import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// For 200+ concurrent students, tune the connection pool:
//   connection_limit   – max simultaneous DB connections (default 5 is far too low)
//   pool_timeout       – seconds to wait for a free connection before throwing
//   connect_timeout    – seconds for initial socket connect (avoids silent hangs)
//   statement_cache_size – prepared-statement cache per connection (0 for PgBouncer/Supabase pooler)
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
        url.searchParams.set('connection_limit', '15');
      }
    } else {
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '20');
      }
      if (!url.searchParams.has('statement_cache_size')) {
        url.searchParams.set('statement_cache_size', '100');
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

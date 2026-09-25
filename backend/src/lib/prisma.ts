import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// For 200+ concurrent students, tune the connection pool:
//   connection_limit   – max simultaneous DB connections (default 5 is far too low)
//   pool_timeout       – ms to wait for a free connection before throwing
//   connect_timeout    – seconds for initial socket connect (avoids silent hangs)
//   statement_cache_size – prepared-statement cache per connection
const DB_POOL_PARAMS = new URLSearchParams({
  connection_limit: '30',
  pool_timeout: '15',
  connect_timeout: '10',
  statement_cache_size: '100',
}).toString();

function buildDatabaseUrl(base: string): string {
  try {
    const url = new URL(base);
    DB_POOL_PARAMS.split('&').forEach((kv) => {
      const [k, v] = kv.split('=');
      if (k && !url.searchParams.has(k)) url.searchParams.set(k, v);
    });
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


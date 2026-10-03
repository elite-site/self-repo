/**
 * Applies pending Prisma migrations as part of the build, but only when a real
 * database is configured.
 *
 * Why this exists: nothing in the deploy pipeline ran `prisma migrate deploy`,
 * so a migration added in a commit (e.g. the IntroVideo public-visibility
 * columns) never reached the deployed database. The running code then queried
 * those columns, every request failed, and the portal treated the failure as an
 * invalid session — logging users out in a loop.
 *
 * Guarded on DATABASE_URL so a local `npm run build` with no database still
 * succeeds; it simply skips. A missing URL is never a reason to fail a build
 * that has nothing to deploy against.
 *
 * Why this retries and inspects instead of failing on any nonzero exit:
 * `prisma migrate deploy` connects through `directUrl`, which on Supabase is the
 * *session-mode* pooler capped at pool_size 15. During a Render build the
 * previously running instance still holds connections, so the pooler replies
 *
 *     FATAL: (EMAXCONNSESSION) max clients reached in session mode
 *
 * That is a connection-capacity error. It says nothing about whether migrations
 * are pending, and failing the entire deploy on it loses a good build for no
 * reason — this script previously exited nonzero here and took the deploy down
 * even with every migration already applied.
 *
 * So: retry with backoff, and only fail the build when the ledger proves
 * migrations are genuinely unapplied. That is the one case that actually breaks
 * the running site, which is what this script exists to prevent.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL?.trim();

// The committed dev fallback is not a real database; skip rather than attempt a
// connection that can only fail.
const DEV_FALLBACK = 'postgresql://postgres:postgres@localhost:5432/photoclub?schema=public';
if (!databaseUrl || databaseUrl === DEV_FALLBACK) {
  console.log('[migrate] DATABASE_URL not configured — skipping `prisma migrate deploy`.');
  process.exit(0);
}

// Pool/capacity/connectivity failures: "could not reach the database", never
// "migrations are missing".
const TRANSIENT =
  /EMAXCONNSESSION|max clients reached|too many clients|P1001|P1002|P1017|ETIMEDOUT|ECONNREFUSED|ECONNRESET|Connection reset|server closed the connection|Connection terminated|TLS connection/i;

const ATTEMPTS = 3;
const BACKOFF_MS = [5000, 15000];

const log = (msg) => console.log(`[migrate] ${msg}`);
const warn = (msg) => console.warn(`[migrate] ${msg}`);
const sleep = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

function prisma(args) {
  const result = spawnSync('npx', ['prisma', ...args], {
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
  });
  return {
    status: result.status ?? 1,
    output: `${result.stdout || ''}${result.stderr || ''}`,
    error: result.error,
  };
}

/** Migration directories on disk, oldest first. */
function localMigrations() {
  const dir = path.join(__dirname, '..', 'prisma', 'migrations');
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^\d{8,}_/.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function tuneProbeUrl(raw) {
  try {
    const url = new URL(raw);
    const isPooler =
      url.port === '6543' ||
      url.hostname.includes('pooler.supabase.com') ||
      url.searchParams.get('pgbouncer') === 'true';
    if (isPooler) {
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('statement_cache_size', '0');
    }
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('pool_timeout', '10');
    url.searchParams.set('connect_timeout', '10');
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Reads the applied-migration ledger over the transaction-mode pooler
 * (DATABASE_URL, port 6543), which is a separate connection budget from the
 * session-mode pooler that just saturated. Runs in a child process so the async
 * Prisma client can be awaited without fighting this script's synchronous flow.
 *
 * @returns {{ known: boolean, missing?: string[], reason?: string }}
 */
function unappliedMigrations() {
  const onDisk = localMigrations();
  if (onDisk.length === 0) {
    return { known: false, reason: 'no local migrations found' };
  }

  const probe = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: [] });
    prisma.$queryRawUnsafe(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'
    )
      .then((rows) => { process.stdout.write(JSON.stringify(rows.map((r) => r.migration_name))); })
      .catch((e) => { process.stderr.write(String(e.stack || e.message || e)); process.exit(1); })
      .finally(() => prisma.$disconnect().catch(() => {}));
  `;

  const probeUrl = tuneProbeUrl(databaseUrl);
  const result = spawnSync(process.execPath, ['-e', probe], {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: probeUrl },
    timeout: 60000,
  });

  if (result.status !== 0) {
    return { known: false, reason: String(result.stderr || '').split('\n')[0].trim() };
  }

  try {
    const applied = JSON.parse(result.stdout);
    return { known: true, missing: onDisk.filter((m) => !applied.includes(m)) };
  } catch {
    return { known: false, reason: 'could not parse migration ledger' };
  }
}

// --- Apply, with backoff ---------------------------------------------------

log('Applying pending migrations...');

let last = null;

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  last = prisma(['migrate', 'deploy']);

  if (last.status === 0) {
    log('Migrations applied.');
    process.exit(0);
  }

  // Tooling could not even be spawned; nothing about the schema was learned.
  if (last.error) {
    warn(`Could not run prisma migrate deploy: ${last.error.message}`);
    process.exit(0);
  }

  if (!TRANSIENT.test(last.output)) {
    // A real migration error (failed statement, drift, bad migration). The
    // database is reachable and genuinely unhappy — surface it.
    console.error(last.output.trim());
    console.error(
      '[migrate] `prisma migrate deploy` failed against a reachable database. ' +
        'Fix the migration or schema before deploying.',
    );
    process.exit(last.status ?? 1);
  }

  if (attempt < ATTEMPTS) {
    const wait = BACKOFF_MS[attempt - 1];
    warn(`Connection error on attempt ${attempt}/${ATTEMPTS}; retrying in ${wait / 1000}s.`);
    sleep(wait);
  }
}

// Every attempt hit a capacity/connectivity error. Fall back to the ledger: if
// nothing is actually pending, this build is fine and must not fail.
warn(`Could not run migrations after ${ATTEMPTS} attempts (connection pool saturated).`);

const verdict = unappliedMigrations();

if (!verdict.known) {
  warn(
    `Could not verify the migration ledger (${verdict.reason}). Proceeding without ` +
      'applying migrations — the application-level guards keep the site serving.',
  );
  process.exit(0);
}

if (verdict.missing.length === 0) {
  warn('Verified via the migration ledger: all migrations are already applied. Proceeding.');
  process.exit(0);
}

console.error(
  `[migrate] Migrations are not applied: ${verdict.missing.join(', ')}. ` +
    'The running code queries these columns. Apply them from the host shell before deploying.',
);
process.exit(1);
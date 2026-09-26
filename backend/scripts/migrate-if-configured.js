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
 */
const { spawnSync } = require('child_process');

const databaseUrl = process.env.DATABASE_URL?.trim();

// The committed dev fallback is not a real database; skip rather than attempt a
// connection that can only fail.
const DEV_FALLBACK = 'postgresql://postgres:postgres@localhost:5432/photoclub?schema=public';
if (!databaseUrl || databaseUrl === DEV_FALLBACK) {
  console.log('[migrate] DATABASE_URL not configured — skipping `prisma migrate deploy`.');
  process.exit(0);
}

console.log('[migrate] Applying pending migrations...');

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.error) {
  // Do not block a deploy on tooling problems — the application-level guards
  // (see the /api/student/me intro-video lookup) keep the site serving.
  console.warn(`[migrate] Could not run prisma migrate deploy: ${result.error.message}`);
  process.exit(0);
}

if (result.status !== 0) {
  console.error(
    '[migrate] `prisma migrate deploy` failed. The deployed database is out of ' +
      'date with the schema — run it manually from the host shell.',
  );
  process.exit(result.status ?? 1);
}

console.log('[migrate] Migrations applied.');

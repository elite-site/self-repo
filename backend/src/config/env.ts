import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env unless explicitly skipped (e.g. in test/verification scripts)
if (!process.env.SKIP_DOTENV) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../.env') });
}

const nodeEnv = process.env.NODE_ENV || 'development';

// Secrets that must be explicitly overridden (not missing, not the dev fallback) in production
const PROD_VALUE_CHECKS = [
  { name: 'DATABASE_URL', value: process.env.DATABASE_URL, fallback: 'postgresql://postgres:postgres@localhost:5432/photoclub?schema=public' },
  { name: 'JWT_SECRET', value: process.env.JWT_SECRET, fallback: 'dev_secret_photoclub_change_in_production' },
  { name: 'STUDENT_JWT_SECRET', value: process.env.STUDENT_JWT_SECRET, fallback: 'student_jwt_secret_change_in_production' },
  { name: 'ADMIN_DEFAULT_PASSWORD', value: process.env.ADMIN_DEFAULT_PASSWORD, fallback: 'AdminPassword123!' },
];

export const env = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: nodeEnv,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/photoclub?schema=public',
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/photoclub?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_photoclub_change_in_production',
  ADMIN_SESSION_COOKIE_NAME: process.env.ADMIN_SESSION_COOKIE_NAME || 'pc_admin_session',
  STUDENT_JWT_SECRET: process.env.STUDENT_JWT_SECRET || process.env.JWT_SECRET || 'student_jwt_secret_change_in_production',

  // Google Drive OAuth 2.0 (Primary)
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '',

  // Google Drive Service Account (Legacy/Fallback)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '',

  // Resend
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'Self Introduction <elite@sasi.ac.in>',

  // Google Workspace SSO (student login)
  GOOGLE_SSO_CLIENT_ID: process.env.GOOGLE_SSO_CLIENT_ID || '',
  GOOGLE_SSO_CLIENT_SECRET: process.env.GOOGLE_SSO_CLIENT_SECRET || '',
  GOOGLE_SSO_REDIRECT_URI: process.env.GOOGLE_SSO_REDIRECT_URI || 'http://localhost:5001/api/student/google/callback',
  GOOGLE_SSO_HD: process.env.GOOGLE_SSO_HD || 'sasi.ac.in',
  STUDENT_APP_LOGIN_URL: process.env.STUDENT_APP_LOGIN_URL || 'http://localhost:5173/login',

  // Size Limits (25 MB strictly for videos)
  MAX_IMAGE_SIZE_MB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10),
  MAX_AUDIO_SIZE_MB: parseInt(process.env.MAX_AUDIO_SIZE_MB || '10', 10),
  MAX_VIDEO_SIZE_MB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '25', 10),

  // CORS - parse comma-separated list of allowed origins or single origin safely
  ALLOWED_ORIGINS: (() => {
    const raw = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '';
    const defaults = [
      'https://self-repo.onrender.com',
      'https://self-e.netlify.app',
      'https://elitephotoit.netlify.app',
      'https://self-repo.vercel.app',
      'https://self-intro-portal.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ];

    const set = new Set<string>();
    for (const d of defaults) {
      set.add(d.trim().replace(/\/$/, ''));
    }
    if (raw) {
      for (const item of raw.split(',')) {
        const trimmed = item.trim().replace(/\/$/, '');
        if (trimmed) set.add(trimmed);
      }
    }
    return Array.from(set);
  })(),

  // Defaults
  EVENT_YEAR: parseInt(process.env.EVENT_YEAR || '2026', 10),
  ADMIN_DEFAULT_EMAIL: process.env.ADMIN_DEFAULT_EMAIL || 'admin@club.internal',
  ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD || 'AdminPassword123!',
};

// Every literal this codebase will fall back to. If a value used at runtime
// matches one of these, the secret is effectively public — it is committed to
// git and can be used to forge tokens.
const KNOWN_FALLBACK_SECRETS = new Set([
  'dev_secret_photoclub_change_in_production',
  'student_jwt_secret_change_in_production',
  'AdminPassword123!',
  'ADMIN123',
]);

// Production configuration sanity check
if (nodeEnv === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('Refusing to start in production: missing DATABASE_URL');
  }

  // Secrets the running server actually uses to sign and verify tokens. If these
  // are still the committed defaults, anyone can mint a valid session token and
  // read or replace any student's data, so the server must not start.
  //
  // STUDENT_JWT_SECRET falls back to JWT_SECRET (see above), so configuring
  // either one secures both — check the effective value, not the raw variable.
  const runtimeSecrets: Array<{ name: string; effective: string | undefined }> = [
    { name: 'JWT_SECRET', effective: process.env.JWT_SECRET },
    { name: 'STUDENT_JWT_SECRET', effective: process.env.STUDENT_JWT_SECRET || process.env.JWT_SECRET },
  ];

  const insecureRuntime = runtimeSecrets
    .filter(({ effective }) => !effective || KNOWN_FALLBACK_SECRETS.has(effective))
    .map(({ name }) => name);

  // Escape hatch for recovering access if the service is otherwise bricked. It
  // logs loudly and should only ever be a temporary measure.
  const bypass = process.env.ALLOW_INSECURE_DEFAULT_SECRETS === 'true';

  if (insecureRuntime.length > 0) {
    if (bypass) {
      console.warn(
        `🚨 [ENV] ALLOW_INSECURE_DEFAULT_SECRETS=true — starting with default ` +
          `secrets for: ${insecureRuntime.join(', ')}. This is NOT safe.`,
      );
    } else {
      throw new Error(
        `Refusing to start in production: ${insecureRuntime.join(', ')} ` +
          `${insecureRuntime.length === 1 ? 'is' : 'are'} still set to the ` +
          `default value committed to source control, so auth tokens can be ` +
          `forged by anyone.\n\n` +
          `Set the following in your host's environment (Render: Service -> Environment) ` +
          `and redeploy:\n` +
          runtimeSecrets
            .filter(({ name }) => insecureRuntime.includes(name))
            .map(({ name }) => `  ${name}=<generate a random value>`)
            .join('\n') +
          `\n\nGenerate a value with:\n` +
          `  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"\n\n` +
          `Note: rotating a JWT secret invalidates existing sessions, so everyone ` +
          `will need to sign in again.\n\n` +
          `To start anyway (not recommended, and only to recover access), set ` +
          `ALLOW_INSECURE_DEFAULT_SECRETS=true.`,
      );
    }
  }

  // Not fatal: these are only consumed by one-off scripts such as prisma/seed.ts,
  // never by the running server, so they must not block a deploy.
  const seedOnlyWarnings = PROD_VALUE_CHECKS
    .filter(({ name, value, fallback }) => name !== 'DATABASE_URL')
    .filter(({ name }) => !runtimeSecrets.some((s) => s.name === name))
    .filter(({ value, fallback }) => !value || value === fallback)
    .map(({ name }) => name);

  if (seedOnlyWarnings.length > 0) {
    console.warn(
      `⚠️ [ENV WARNING] Still using default values for: ${seedOnlyWarnings.join(', ')}. ` +
        `These are only used by seed/import scripts, not at runtime, but set them ` +
        `before re-seeding the database.`,
    );
  }
}

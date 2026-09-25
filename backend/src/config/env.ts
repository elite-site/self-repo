import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

// Production configuration sanity check
if (nodeEnv === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('Refusing to start in production: missing DATABASE_URL');
  }

  const defaultSecretWarnings = PROD_VALUE_CHECKS
    .filter(({ name, value, fallback }) => name !== 'DATABASE_URL' && (!value || value === fallback))
    .map(({ name }) => name);

  if (defaultSecretWarnings.length > 0) {
    console.warn(`⚠️ [ENV WARNING] Running in production with default/fallback secrets for: ${defaultSecretWarnings.join(', ')}. Please set these environment variables in your Render dashboard for maximum security.`);
  }
}

import { env } from '../../config/env';
import { AppError } from '../../utils/appError';

export function isAllowedRedirectUrl(candidateUrl: string): boolean {
  try {
    const parsed = new URL(candidateUrl);
    const origin = parsed.origin.trim().replace(/\/$/, '');
    if (
      env.ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/[a-z0-9_.-]+(\.netlify\.app|\.onrender\.com|\.vercel\.app)$/i.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    ) {
      return true;
    }
  } catch {
    // Malformed URL
  }
  return false;
}

export function validateCallbackQuery(code?: unknown, state?: unknown): { code: string; state: string } {
  if (!state || typeof state !== 'string') {
    throw new AppError('INVALID_STATE', 'State mismatch or expired. Try signing in again.', 400, 'auth.schema:validateCallbackQuery');
  }
  if (!code || typeof code !== 'string') {
    throw new AppError('MISSING_CODE', 'No authorization code returned.', 400, 'auth.schema:validateCallbackQuery');
  }
  return { code, state };
}

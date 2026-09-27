import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { STUDENT_SESSION_COOKIE_NAME, StudentJwtPayload } from './studentAuth';

/**
 * Identify client by authenticated student ID / user ID if present,
 * falling back to IP address. This prevents 200+ students on campus Wi-Fi
 * (sharing a single public NAT IP) from exhausting shared rate limits.
 */
export function getClientIdentity(req: any): string {
  // If request has already been authenticated by middleware
  if (req.student?.studentId) {
    return `student_${req.student.studentId}`;
  }
  if (req.user?.userId || req.user?.id) {
    return `user_${req.user.userId || req.user.id}`;
  }

  // Pre-auth inspection: peek at token from session cookie or Authorization header
  const token =
    req.cookies?.[STUDENT_SESSION_COOKIE_NAME] ||
    (req.headers?.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : null) ||
    (typeof req.query?.token === 'string' ? req.query.token.trim() : null);

  if (token) {
    try {
      const decoded = jwt.decode(token) as (StudentJwtPayload & { userId?: string }) | null;
      if (decoded?.studentId) {
        return `student_${decoded.studentId}`;
      }
      if (decoded?.userId) {
        return `user_${decoded.userId}`;
      }
    } catch {
      // Ignore parse failure and fall back to IP
    }
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : (req.ip || req.socket?.remoteAddress || 'unknown');
  return `ip_${ip}`;
}

/**
 * General API rate limiter — applied to /api routes.
 * Keyed per authenticated user/student (falling back to IP).
 * 1,000 requests per 5 min per client gives plenty of headroom for
 * active dashboard polling while protecting against runaway scripts.
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIdentity(req),
  skip: (req) =>
    req.path === '/health' ||
    req.path === '/ready' ||
    req.originalUrl?.includes('/health') ||
    req.originalUrl?.includes('/ready'),
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});

/**
 * Video / file upload submission limiter:
 * Keyed per student so that multiple students uploading from a single campus lab
 * or Wi-Fi IP do not collide with each other. 10 attempts per minute per student.
 */
export const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIdentity(req),
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many upload attempts. Please wait a minute before trying again.',
  },
});

// Admin login: strict brute-force guard
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
});

/**
 * Student SSO login: generous limit with skipSuccessfulRequests.
 * In a college auditorium, 200+ students on campus Wi-Fi all log in simultaneously.
 * Only failed attempts count toward throttling; successful auth is not penalized.
 */
export const studentLoginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts from this network. Please wait a few minutes before trying again.',
  },
});

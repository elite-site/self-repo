import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter — applied to all /api student routes.
 * 200 members × reasonable burst = 600 req / 5 min per IP is safe.
 * Adjust `max` higher if the app is behind a shared-IP NAT (campus).
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5-minute window
  max: 300,                  // 300 requests / 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/ready',
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});

// Video / file upload submission: 1 upload per minute per IP (upload is expensive)
export const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1-minute window
  max: 3,                // 3 attempts per minute (covers upload retries)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many upload attempts. Please wait a minute before trying again.',
  },
});

// Admin login: strict brute-force guard
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
});

// Student SSO login: generous — 200 students may all log in simultaneously
export const studentLoginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5-minute window
  max: 50,                   // 50 login-flow requests per IP in 5 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please wait a few minutes before trying again.',
  },
});

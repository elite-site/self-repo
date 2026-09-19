import rateLimit from 'express-rate-limit';

// Limit submissions: max 15 requests per 15 minutes per IP
export const submissionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many submission attempts from this IP. Please try again after a few minutes.',
  },
});

// Limit admin login attempts: max 5 attempts per 15 minutes per IP
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

// Limit student login attempts: max 10 attempts per 15 minutes per IP
export const studentLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
});

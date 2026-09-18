import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { adminLoginRateLimiter } from '../middleware/rateLimiter';
import { requireAdminAuth } from '../middleware/auth';

const router = Router();

// POST /admin/login
router.post('/login', adminLoginRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Both email and password are required.',
    });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: cleanEmail },
    });

    if (!adminUser) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: adminUser.id, email: adminUser.email },
      env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Set secure httpOnly cookie
    res.cookie(env.ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
      path: '/',
    });

    res.json({
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
      },
    });
  } catch (err: any) {
    console.error('Error during admin login:', err);
    res.status(500).json({
      error: 'LOGIN_FAILED',
      message: 'An error occurred during login. Please try again.',
    });
  }
});

// POST /admin/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(env.ADMIN_SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /admin/me
router.get('/me', requireAdminAuth, (req: Request, res: Response) => {
  res.json({
    authenticated: true,
    user: req.adminUser,
  });
});

export default router;

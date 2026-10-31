import { Request, Response } from 'express';
import { env } from '../../config/env';
import { STUDENT_SESSION_COOKIE_NAME } from '../../middleware/studentAuth';
import * as authService from './auth.service';
import { validateCallbackQuery } from './auth.schemas';
import { logger } from '../../utils/logger';

// --- Student Controllers ---

export function authorize(req: Request, res: Response): void {
  const rawReturnTo = (req.query.return_to || req.query.redirect_uri) as string | undefined;
  const redirectTarget = authService.getAuthorizeUrl(rawReturnTo);
  res.redirect(302, redirectTarget);
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const { code, state } = validateCallbackQuery(req.query.code, req.query.state);
  const { token, redirectUrl } = await authService.processGoogleCallback(code, state);

  const isProduction = env.NODE_ENV === 'production';
  res.cookie(STUDENT_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });

  res.redirect(302, redirectUrl);
}

export function studentLogout(_req: Request, res: Response): void {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(STUDENT_SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ success: true });
}

// --- Admin Controllers ---

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  const { token, user } = await authService.adminLogin(username, password);

  res.cookie(env.ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    path: '/',
  });

  res.json({
    success: true,
    user,
  });
}

export function adminLogout(_req: Request, res: Response): void {
  res.clearCookie(env.ADMIN_SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Logged out successfully.' });
}

export async function adminMe(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.adminUser?.userId) {
    try {
      const admin = await authService.getAdminMe(req.adminUser.userId);

      if (admin) {
        res.json({
          authenticated: true,
          user: {
            id: admin.id,
            userId: admin.id,
            email: admin.email,
            username: admin.username,
            role: admin.role,
            roleAssignments: admin.roleAssignments,
          },
        });
        return;
      }
    } catch (err) {
      // Non-fatal: fallback to basic adminUser payload if detail lookup fails
      logger.warn('Failed to load full admin details in auth check', { error: err });
    }
  }

  res.json({
    authenticated: true,
    user: req.adminUser,
  });
}

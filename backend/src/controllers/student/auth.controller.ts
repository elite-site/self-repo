import { Request, Response } from 'express';
import { env } from '../../config/env';
import { STUDENT_SESSION_COOKIE_NAME } from '../../middleware/studentAuth';
import { getAuthorizeUrl, processGoogleCallback } from '../../services/student/auth.service';
import { validateCallbackQuery } from '../../validators/student/auth.schema';

export function authorize(req: Request, res: Response): void {
  const rawReturnTo = (req.query.return_to || req.query.redirect_uri) as string | undefined;
  const redirectTarget = getAuthorizeUrl(rawReturnTo);
  res.redirect(302, redirectTarget);
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const { code, state } = validateCallbackQuery(req.query.code, req.query.state);
  const { token, redirectUrl } = await processGoogleCallback(code, state);

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

export function logout(_req: Request, res: Response): void {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(STUDENT_SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ success: true });
}

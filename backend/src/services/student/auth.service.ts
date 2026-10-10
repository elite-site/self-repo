import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { INTERNAL_EVENT_ID } from '../../config/constants';
import { prisma } from '../../lib/prisma';
import { ssoService } from '../sso.service';
import { ActivityService } from '../activity.service';
import { AppError } from '../../utils/appError';
import { isAllowedRedirectUrl } from '../../validators/student/auth.schema';

const EVENT_ID = INTERNAL_EVENT_ID;

export function signedState(returnTo?: string): string {
  return jwt.sign(
    { nonce: crypto.randomUUID(), ...(returnTo ? { returnTo } : {}) },
    env.STUDENT_JWT_SECRET,
    { expiresIn: '10m' }
  );
}

export function getAuthorizeUrl(rawReturnTo?: string): string {
  const url = ssoService.getAuthUrl();
  const sep = url.includes('?') ? '&' : '?';

  let returnTo: string | undefined;
  if (typeof rawReturnTo === 'string' && isAllowedRedirectUrl(rawReturnTo)) {
    returnTo = rawReturnTo.trim();
  }

  return `${url}${sep}state=${encodeURIComponent(signedState(returnTo))}`;
}

export async function processGoogleCallback(code: string, state: string): Promise<{ token: string; redirectUrl: string }> {
  let decodedState: any = null;
  try {
    decodedState = jwt.verify(state, env.STUDENT_JWT_SECRET);
  } catch {
    throw new AppError('INVALID_STATE', 'State mismatch or expired. Try signing in again.', 400, 'auth.service:processGoogleCallback');
  }

  let identity;
  try {
    identity = await ssoService.exchangeCode(code);
  } catch (err: any) {
    console.error('[auth.service:processGoogleCallback] SSO exchange code error:', err);
    throw new AppError('SSO_FAILED', 'Could not complete Google sign-in.', 500, 'auth.service:processGoogleCallback');
  }

  if (!ssoService.isAllowed(identity)) {
    throw new AppError('DOMAIN_FORBIDDEN', `Only ${env.GOOGLE_SSO_HD} college emails are allowed.`, 403, 'auth.service:processGoogleCallback');
  }

  const student = await prisma.student.findUnique({
    where: { email: identity.email },
    select: { id: true, rollNo: true, name: true, email: true },
  });

  if (!student) {
    throw new AppError('EMAIL_NOT_REGISTERED', 'This college email is not registered in the roster. Contact your coordinators.', 403, 'auth.service:processGoogleCallback');
  }

  const token = jwt.sign(
    { studentId: student.id, rollNo: student.rollNo, name: student.name, email: student.email },
    env.STUDENT_JWT_SECRET,
    { expiresIn: '12h' }
  );

  await ActivityService.log({
    eventId: EVENT_ID,
    category: 'APPLICATION',
    action: 'Student logged in via Google',
    details: `Email: ${identity.email}`,
    applicantName: student.name,
    userEmail: identity.email,
    status: 'SUCCESS',
  }).catch((err) => {
    console.error(`[auth.service:processGoogleCallback] Activity log failure for student ${student.id}:`, err);
  });

  let redirectBase = env.STUDENT_APP_LOGIN_URL;
  if (
    decodedState?.returnTo &&
    typeof decodedState.returnTo === 'string' &&
    isAllowedRedirectUrl(decodedState.returnTo)
  ) {
    redirectBase = decodedState.returnTo.trim();
  }
  const sep = redirectBase.includes('?') ? '&' : '?';
  const redirectUrl = `${redirectBase}${sep}token=${encodeURIComponent(token)}`;

  return { token, redirectUrl };
}

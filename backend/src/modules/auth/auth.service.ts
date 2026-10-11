import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { INTERNAL_EVENT_ID } from '../../config/constants';
import { ssoService, SSOService } from './sso.service';
import { ActivityService } from '../admin/services/activity.service';
export { ssoService, SSOService };
import { AppError } from '../../utils/appError';
import { isAllowedRedirectUrl } from './auth.schemas';
import * as authRepo from './auth.repository';

const EVENT_ID = INTERNAL_EVENT_ID;

// --- Student Google OAuth ---

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
  let decodedState: any;
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

  const student = await authRepo.findStudentByEmailForAuth(identity.email);

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

// --- Admin Auth ---

export async function adminLogin(username?: string, password?: string) {
  if (!username || !password) {
    throw new AppError('MISSING_FIELDS', 'Both username and password are required.', 400, 'auth.service:adminLogin');
  }

  const cleanUsername = String(username).trim();
  const lowerUsername = cleanUsername.toLowerCase();

  const adminUser = await authRepo.findAdminUserForLogin(cleanUsername, lowerUsername);
  if (!adminUser) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid username or password.', 401, 'auth.service:adminLogin');
  }

  const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
  if (!isMatch) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid username or password.', 401, 'auth.service:adminLogin');
  }

  const token = jwt.sign(
    {
      userId: adminUser.id,
      email: adminUser.email || undefined,
      username: adminUser.username || undefined,
    },
    env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  return {
    token,
    user: {
      id: adminUser.id,
      email: adminUser.email,
      username: adminUser.username,
    },
  };
}

export async function getAdminMe(userId: string) {
  return authRepo.findAdminUserWithRoles(userId);
}

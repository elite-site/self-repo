import { google } from 'googleapis';
import { env } from '../config/env';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  domain: string;
  sub: string;
}

type JwtPayloadShape = {
  email?: string;
  email_verified?: boolean;
  hd?: string;
  sub?: string;
};

/** Minimal shape of a google-auth-library ticket returned by verifyIdToken/getToken. */
export type IdTokenTicket = {
  getPayload(): JwtPayloadShape | null | undefined;
};

type VerifyFn = (code: string) => Promise<IdTokenTicket>;

/**
 * Google Workspace SSO for students.
 *
 * Security contract:
 *  - The id_token is verified server-side against a fixed client id + issuer (via googleapis).
 *  - `isAllowed` only trusts verified emails whose domain matches `GOOGLE_SSO_HD`.
 *  - The frontend never parses signed Google claims; it only receives our own JWT.
 */
export class SSOService {
  private client: OAuth2Client;
  private verifyFn: VerifyFn;

  /** `verifyFn` is injectable for tests; default performs a real code exchange + token verify. */
  constructor(verifyFn?: VerifyFn) {
    this.client = new google.auth.OAuth2(
      env.GOOGLE_SSO_CLIENT_ID,
      env.GOOGLE_SSO_CLIENT_SECRET,
      env.GOOGLE_SSO_REDIRECT_URI
    );
    this.verifyFn =
      verifyFn ||
      (async (code: string) => {
        const { tokens } = await this.client.getToken(code);
        if (!tokens.id_token) throw new Error('Google returned no id_token');
        return this.client.verifyIdToken({
          idToken: tokens.id_token,
          audience: env.GOOGLE_SSO_CLIENT_ID,
        });
      });
  }

  getAuthUrl(): string {
    const qs = new URLSearchParams({
      client_id: env.GOOGLE_SSO_CLIENT_ID,
      redirect_uri: env.GOOGLE_SSO_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      hd: env.GOOGLE_SSO_HD,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${qs.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleIdentity> {
    const ticket = await this.verifyFn(code);
    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error('Google id_token is missing the email claim');
    const email = payload.email.toLowerCase();
    return {
      email,
      emailVerified: Boolean(payload.email_verified),
      domain: (payload.hd && payload.hd.toLowerCase()) || email.split('@')[1] || '',
      sub: payload.sub || '',
    };
  }

  isAllowed(identity: GoogleIdentity): boolean {
    if (!identity.emailVerified) return false;
    if (!identity.email.endsWith(`@${env.GOOGLE_SSO_HD}`)) return false;
    return true;
  }
}

export const ssoService = new SSOService();
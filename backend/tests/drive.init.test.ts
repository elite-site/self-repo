import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DriveService } from '../src/services/drive.service';
import { env } from '../src/config/env';

describe('DriveService init fail-safe guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnvNodeEnv = env.NODE_ENV;
  const originalOauthClient = env.GOOGLE_OAUTH_CLIENT_ID;
  const originalServiceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  beforeEach(() => {
    // Clear Drive credentials
    (env as any).GOOGLE_OAUTH_CLIENT_ID = '';
    (env as any).GOOGLE_OAUTH_CLIENT_SECRET = '';
    (env as any).GOOGLE_OAUTH_REFRESH_TOKEN = '';
    (env as any).GOOGLE_SERVICE_ACCOUNT_EMAIL = '';
    (env as any).GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '';
    (env as any).GOOGLE_DRIVE_ROOT_FOLDER_ID = '';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    (env as any).NODE_ENV = originalEnvNodeEnv;
    (env as any).GOOGLE_OAUTH_CLIENT_ID = originalOauthClient;
    (env as any).GOOGLE_SERVICE_ACCOUNT_EMAIL = originalServiceAccountEmail;
    vi.restoreAllMocks();
  });

  it('throws a fatal error in production when credentials are missing', () => {
    process.env.NODE_ENV = 'production';
    (env as any).NODE_ENV = 'production';

    expect(() => new DriveService()).toThrowError(
      '[FATAL] Google Drive credentials must be configured in production (NODE_ENV=production). Mock storage is prohibited in production.'
    );
  });

  it('allows mock storage in development/test when credentials are absent', () => {
    process.env.NODE_ENV = 'development';
    (env as any).NODE_ENV = 'development';

    const service = new DriveService();
    expect(service.isUsingMock).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({ client: clientMock }));

import { codechefApi } from './index';
import type { CodeChefStatus } from '../types';

beforeEach(() => {
  clientMock.get.mockReset();
  clientMock.post.mockReset();
  clientMock.put.mockReset();
  clientMock.delete.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('codechefApi fixture gate', () => {
  it('reads status from the API in production even when VITE_CODECHEF_MOCK is true', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_CODECHEF_MOCK', 'true');
    const serverStatus: Partial<CodeChefStatus> = {
      connected: false,
      status: 'NOT_CONNECTED',
      handle: null,
    };
    clientMock.get.mockResolvedValueOnce({ data: serverStatus });

    const status = await codechefApi.getStatus();

    expect(clientMock.get).toHaveBeenCalledWith('/student/codechef/status');
    expect(status).toMatchObject(serverStatus);
  });

  it('surfaces a disabled-integration error instead of fixtures in production', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_CODECHEF_MOCK', 'true');
    clientMock.get.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'CodeChef integration is disabled' } },
    });

    await expect(codechefApi.getStatus()).rejects.toMatchObject({
      response: { status: 404 },
    });
    expect(clientMock.get).toHaveBeenCalledTimes(1);
  });

  it('still serves status fixtures in development when VITE_CODECHEF_MOCK is true', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_CODECHEF_MOCK', 'true');

    const status = await codechefApi.getStatus();

    expect(clientMock.get).not.toHaveBeenCalled();
    expect(status.handle).toBe('chef_candidate');
  });
});

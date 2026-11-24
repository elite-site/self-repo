import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/shared/api', () => ({ apiClient: client }));

import { adminCodeChefApi } from './index';

beforeEach(() => {
  client.get.mockReset();
  client.post.mockReset();
  client.delete.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('adminCodeChefApi fixture gate', () => {
  it('reads students from the API in production even when VITE_CODECHEF_MOCK is true', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_CODECHEF_MOCK', 'true');
    const response = { students: [], total: 0, page: 1, limit: 20, totalPages: 1 };
    client.get.mockResolvedValueOnce({ data: response });

    await expect(adminCodeChefApi.getStudents()).resolves.toEqual(response);
    expect(client.get).toHaveBeenCalledWith('/admin/api/codechef/students', {
      params: undefined,
    });
  });

  it('reads student details from the API in production even when VITE_CODECHEF_MOCK is true', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_CODECHEF_MOCK', 'true');
    const details = {
      handle: 'server_student',
      verified: false,
      status: 'UNVERIFIED',
      lastSyncedAt: null,
    };
    client.get.mockResolvedValueOnce({ data: details });

    await expect(adminCodeChefApi.getStudentDetails('stud_1')).resolves.toEqual(details);
    expect(client.get).toHaveBeenCalledWith('/admin/api/codechef/students/stud_1');
  });

  it('still serves fixtures in development when VITE_CODECHEF_MOCK is true', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_CODECHEF_MOCK', 'true');

    const result = await adminCodeChefApi.getStudents();

    expect(client.get).not.toHaveBeenCalled();
    expect(result.total).toBe(2);
  });
});

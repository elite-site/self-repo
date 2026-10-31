import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/server';

/**
 * Both Resources routers are mounted behind their own auth middleware. An
 * unauthenticated request must never reach the service, so a 401 (not a 200 or
 * a 500 from a missing mount) is the proof that the mount and the guard are
 * both wired.
 */
describe('resources route mounts', () => {
  it('guards the student resources mount with student auth', async () => {
    const response = await request(app).get('/api/student/resources');
    expect(response.status).toBe(401);
  });

  it('guards the admin resources mount with admin auth', async () => {
    const list = await request(app).get('/admin/api/resources');
    expect(list.status).toBe(401);

    const quota = await request(app).get('/admin/api/resources/quota');
    expect(quota.status).toBe(401);
  });
});

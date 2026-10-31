import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/server';

/**
 * The academic-year router lives at exactly one base. Keeping the removed
 * `/api/admin/academic-year` alias out of `server.ts` is the whole point: two
 * mounts meant two public URLs for one admin operation.
 */
describe('admin academic-year mount', () => {
  it('keeps the canonical /admin/api/academic-year mount', async () => {
    const response = await request(app).post('/admin/api/academic-year/promote');

    expect(response.status).toBe(401);
  });

  it('does not serve the removed /api/admin/academic-year alias', async () => {
    const response = await request(app).post('/api/admin/academic-year/promote');

    expect(response.status).toBe(404);
  });
});

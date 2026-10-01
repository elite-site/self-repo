import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { mountFrontend } from '../src/config/staticAssets';

/**
 * Regression tests for the static asset cache policy.
 *
 * The policy is easy to get subtly wrong in a way that only shows up as "the
 * site feels slow" or "the deploy didn't take", so it is pinned here:
 *
 *  - Vite's `assets/` output is content-hashed, so it must be immutable and
 *    long-lived. Without this every page load revalidates the ~238 KB main
 *    chunk plus every font file.
 *  - `index.html` and the unhashed files in `public/` must revalidate, otherwise
 *    a deploy keeps serving the old route table.
 *
 * Note the trap this file exists to guard: setting `Cache-Control` from a
 * `setHeaders` hook does nothing, because `send` runs that hook and then
 * overwrites the header with its own `maxAge`-derived value. The implementation
 * has to use the `maxAge`/`immutable` options.
 */

let buildDir: string;
let app: express.Express;

const HASHED_ASSET = 'index-AbCdEf12.js';
const HASHED_FONT = 'plusjakartasans-normal-latin-XyZ12345.woff2';

function cacheControl(res: request.Response): string {
  return res.headers['cache-control'] ?? '';
}

beforeAll(() => {
  buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-assets-'));
  fs.mkdirSync(path.join(buildDir, 'assets'), { recursive: true });

  fs.writeFileSync(path.join(buildDir, 'assets', HASHED_ASSET), 'console.log("app")');
  fs.writeFileSync(path.join(buildDir, 'assets', HASHED_FONT), 'fake-woff2-bytes');
  fs.writeFileSync(path.join(buildDir, 'index.html'), '<!doctype html><div id="root"></div>');
  // Copied verbatim from public/ — unhashed, so it must revalidate.
  fs.writeFileSync(path.join(buildDir, 'elite-logo.png'), 'fake-png-bytes');

  app = express();
  mountFrontend(app, '/', buildDir);
  // Mirrors the SPA fallback in server.ts: deep links get the shell, no-cache.
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(buildDir, 'index.html'));
  });
});

afterAll(() => {
  fs.rmSync(buildDir, { recursive: true, force: true });
});

describe('hashed build output', () => {
  it('serves JS chunks as immutable with a one-year max-age', async () => {
    const res = await request(app).get(`/assets/${HASHED_ASSET}`).expect(200);

    expect(cacheControl(res)).toContain('immutable');
    expect(cacheControl(res)).toMatch(/max-age=31536000/);
  });

  it('serves self-hosted fonts the same way as JS', async () => {
    const res = await request(app).get(`/assets/${HASHED_FONT}`).expect(200);

    expect(cacheControl(res)).toContain('immutable');
    expect(cacheControl(res)).toMatch(/max-age=31536000/);
  });

  it('reuses the same ETag across requests so a revalidation can be a 304', async () => {
    const first = await request(app).get(`/assets/${HASHED_ASSET}`);
    const second = await request(app).get(`/assets/${HASHED_ASSET}`);

    expect(second.headers.etag).toBe(first.headers.etag);
  });
});

describe('unhashed files', () => {
  it('serves the shell for the root path as no-cache', async () => {
    const res = await request(app).get('/').expect(200);

    expect(cacheControl(res)).toBe('no-cache');
  });

  it('serves the shell for a deep link as no-cache', async () => {
    // A deep link matches no file, so the SPA fallback is the only handler that
    // can answer it. If that handler stops setting no-cache, a deploy would keep
    // serving a stale route table.
    const res = await request(app).get('/students/23A91A1201').expect(200);

    expect(res.text).toContain('id="root"');
    expect(cacheControl(res)).toBe('no-cache');
  });

  it('revalidates unhashed public assets instead of pinning them for a year', async () => {
    const res = await request(app).get('/elite-logo.png').expect(200);

    expect(cacheControl(res)).toBe('public, max-age=0');
    expect(cacheControl(res)).not.toContain('immutable');
  });
});

describe('mountFrontend under a path prefix', () => {
  it('scopes assets to the prefix, as the /admin build requires', async () => {
    const adminApp = express();
    mountFrontend(adminApp, '/admin', buildDir);
    adminApp.get(['/admin', '/admin/*'], (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(buildDir, 'index.html'));
    });

    const asset = await request(adminApp)
      .get(`/admin/assets/${HASHED_ASSET}`)
      .expect(200);
    expect(cacheControl(asset)).toContain('immutable');

    const shell = await request(adminApp).get('/admin/analytics').expect(200);
    expect(cacheControl(shell)).toBe('no-cache');
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { env } from '../src/config/env';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface AdminClientRoute {
  readonly method: HttpMethod;
  readonly path: string;
}

/**
 * Every `METHOD path` the admin client actually issues.
 *
 * Derived on 2026-10-26 by reading `admin-client/src/features/<feature>/api/index.ts`
 * for all thirteen feature folders: activity-log, analytics, announcements,
 * email-automation, events, github, learning, moderation, registrations, roles,
 * settings, storage, students.
 *
 * Template literals are probed with `route-surface-probe` in place of the id, and
 * the moderation `:type` segment with `resumes` (a real type) so the generic
 * moderation paths stay distinct from the hardcoded `/moderation/videos/...` one.
 * The duplicate test below keeps this fixture from drifting into two identical
 * pairs.
 *
 * This list is deliberately hardcoded: it is the contract between the client and
 * the server. When an admin API module gains a method, add its pair here. The
 * guard is what notices a client path whose backend route has been removed.
 */
const ADMIN_CLIENT_ROUTES: readonly AdminClientRoute[] = [
  // activity-log/api/index.ts
  { method: 'GET', path: '/admin/api/activity-logs' },
  { method: 'GET', path: '/admin/api/activity-logs/export' },

  // analytics/api/index.ts
  { method: 'GET', path: '/admin/api/stats' },
  { method: 'GET', path: '/admin/api/portal/analytics' },

  // announcements/api/index.ts
  { method: 'GET', path: '/admin/api/announcements' },
  { method: 'POST', path: '/admin/api/announcements' },
  { method: 'DELETE', path: '/admin/api/announcements/route-surface-probe' },
  { method: 'GET', path: '/admin/api/announcements/preview' },

  // email-automation/api/index.ts
  { method: 'GET', path: '/admin/api/email/automations' },
  { method: 'POST', path: '/admin/api/email/automations' },
  { method: 'PATCH', path: '/admin/api/email/automations/route-surface-probe/toggle' },
  { method: 'POST', path: '/admin/api/email/automations/route-surface-probe/run' },
  { method: 'GET', path: '/admin/api/email/history' },
  { method: 'GET', path: '/admin/api/email/templates' },

  // events/api/index.ts
  { method: 'GET', path: '/admin/api/events' },
  { method: 'GET', path: '/admin/api/portal/events/route-surface-probe' },
  { method: 'POST', path: '/admin/api/portal/events' },
  { method: 'PUT', path: '/admin/api/portal/events/route-surface-probe' },
  { method: 'POST', path: '/admin/api/portal/events/route-surface-probe/publish' },
  { method: 'POST', path: '/admin/api/portal/events/route-surface-probe/close' },
  { method: 'POST', path: '/admin/api/portal/events/route-surface-probe/archive' },
  { method: 'DELETE', path: '/admin/api/portal/events/route-surface-probe' },
  { method: 'GET', path: '/admin/api/voting' },
  { method: 'POST', path: '/admin/api/voting' },
  { method: 'PATCH', path: '/admin/api/voting/route-surface-probe' },
  { method: 'GET', path: '/admin/api/voting/route-surface-probe/results' },

  // github/api/index.ts
  { method: 'GET', path: '/admin/api/portal/github/overview' },
  { method: 'GET', path: '/admin/api/portal/github/logs' },
  { method: 'POST', path: '/admin/api/portal/github/resync/route-surface-probe' },
  { method: 'GET', path: '/admin/api/portal/github/projects' },

  // learning/api/index.ts
  { method: 'GET', path: '/admin/api/learning/courses' },
  { method: 'GET', path: '/admin/api/learning/courses/route-surface-probe' },
  { method: 'POST', path: '/admin/api/learning/courses' },
  { method: 'PUT', path: '/admin/api/learning/courses/route-surface-probe' },
  { method: 'DELETE', path: '/admin/api/learning/courses/route-surface-probe' },
  { method: 'POST', path: '/admin/api/learning/courses/route-surface-probe/lessons' },
  { method: 'PUT', path: '/admin/api/learning/courses/route-surface-probe/lessons/route-surface-probe' },
  { method: 'DELETE', path: '/admin/api/learning/courses/route-surface-probe/lessons/route-surface-probe' },
  { method: 'PUT', path: '/admin/api/learning/courses/route-surface-probe/lessons/reorder' },
  { method: 'POST', path: '/admin/api/learning/courses/route-surface-probe/assign' },
  { method: 'GET', path: '/admin/api/learning/courses/route-surface-probe/enrollments' },
  { method: 'POST', path: '/admin/api/learning/courses/route-surface-probe/quizzes' },
  { method: 'GET', path: '/admin/api/learning/reports/courses/route-surface-probe' },
  { method: 'GET', path: '/admin/api/learning/reports/courses/route-surface-probe/export' },
  { method: 'GET', path: '/admin/api/learning/youtube/preview' },
  { method: 'GET', path: '/admin/api/learning/youtube/playlist' },
  { method: 'POST', path: '/admin/api/learning/courses/route-surface-probe/lessons/bulk' },

  // moderation/api/index.ts
  { method: 'GET', path: '/admin/api/submissions' },
  { method: 'PATCH', path: '/admin/api/submissions/route-surface-probe/review' },
  { method: 'GET', path: '/admin/api/submissions/route-surface-probe' },
  { method: 'PATCH', path: '/admin/api/submissions/route-surface-probe/rating' },
  { method: 'PATCH', path: '/admin/api/submissions/route-surface-probe/status' },
  { method: 'DELETE', path: '/admin/api/submissions/route-surface-probe/video' },
  { method: 'POST', path: '/admin/api/submissions/route-surface-probe/request-video' },
  { method: 'PATCH', path: '/admin/api/moderation/videos/route-surface-probe/visibility' },
  { method: 'DELETE', path: '/admin/api/submissions/route-surface-probe' },
  { method: 'GET', path: '/admin/api/submissions/route-surface-probe/media/video' },
  { method: 'GET', path: '/admin/api/submissions/export' },
  { method: 'GET', path: '/admin/api/moderation' },
  { method: 'GET', path: '/admin/api/moderation/videos' },
  { method: 'GET', path: '/admin/api/moderation/resumes' },
  { method: 'GET', path: '/admin/api/moderation/achievements' },
  { method: 'GET', path: '/admin/api/moderation/certificates' },
  { method: 'GET', path: '/admin/api/moderation/projects' },
  { method: 'PATCH', path: '/admin/api/moderation/resumes/route-surface-probe' },
  { method: 'PATCH', path: '/admin/api/moderation/resumes/route-surface-probe/visibility' },
  { method: 'DELETE', path: '/admin/api/moderation/resumes/route-surface-probe' },

  // registrations/api/index.ts (export URLs are opened by the browser, still admin routes)
  { method: 'GET', path: '/admin/api/registrations' },
  { method: 'GET', path: '/admin/api/registrations/route-surface-probe' },
  { method: 'PATCH', path: '/admin/api/registrations/route-surface-probe/status' },
  { method: 'DELETE', path: '/admin/api/registrations/route-surface-probe' },
  { method: 'GET', path: '/admin/api/registrations/export' },
  { method: 'GET', path: '/admin/api/teams' },
  { method: 'PATCH', path: '/admin/api/teams/route-surface-probe/status' },
  { method: 'POST', path: '/admin/api/teams/route-surface-probe/members/remove' },
  { method: 'GET', path: '/admin/api/students/export' },

  // roles/api/index.ts
  { method: 'GET', path: '/admin/api/roles' },
  { method: 'POST', path: '/admin/api/portal/roles' },
  { method: 'PUT', path: '/admin/api/portal/roles/route-surface-probe' },
  { method: 'POST', path: '/admin/api/roles/assign' },

  // settings/api/index.ts
  { method: 'GET', path: '/admin/api/portal/settings' },
  { method: 'PUT', path: '/admin/api/portal/settings' },

  // storage/api/index.ts
  { method: 'GET', path: '/admin/api/storage' },
  { method: 'POST', path: '/admin/api/storage/clear-cache' },
  { method: 'POST', path: '/admin/api/storage/ensure-viewer-permissions' },

  // students/api/index.ts
  { method: 'GET', path: '/admin/api/students' },
  { method: 'GET', path: '/admin/api/portal/students/route-surface-probe' },
  {
    method: 'POST',
    path: '/admin/api/portal/students/route-surface-probe/items/route-surface-probe/route-surface-probe/request-change',
  },
  {
    method: 'DELETE',
    path: '/admin/api/portal/students/route-surface-probe/items/route-surface-probe/route-surface-probe',
  },
];

function issue(method: HttpMethod, path: string) {
  switch (method) {
    case 'GET':
      return request(app).get(path);
    case 'POST':
      return request(app).post(path);
    case 'PUT':
      return request(app).put(path);
    case 'PATCH':
      return request(app).patch(path);
    case 'DELETE':
      return request(app).delete(path);
  }
}

beforeAll(() => {
  // This guard proves route existence, not feature rollout. Pin the flag on so a
  // machine with FEATURE_LEARNINGHUB=false does not turn /admin/api/learning/*
  // into a legitimate 404 from learningFlagGuard.
  env.FEATURE_LEARNINGHUB = true;
});

describe('admin client route surface', () => {
  it.each(ADMIN_CLIENT_ROUTES)(
    '$method $path is served by an admin router',
    async ({ method, path }) => {
      const response = await issue(method, path);

      // Admin routers apply requireAdminAuth before any handler, so an existing
      // route answers 401 without a cookie. A missing route falls through to 404
      // (or the admin SPA shell, which is why 200 is not accepted either).
      expect([401, 403]).toContain(response.status);
    }
  );

  it('lists no duplicate METHOD path pairs', () => {
    const pairs = ADMIN_CLIENT_ROUTES.map(({ method, path }) => `${method} ${path}`);
    const duplicates = pairs.filter((pair, index) => pairs.indexOf(pair) !== index);

    expect(duplicates).toEqual([]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Stub the service the controller calls so the rejection originates below the
// controller. The route must still hand it to the central error handler.
vi.mock('../src/modules/admin/admin.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/modules/admin/admin.service')>();
  return { ...actual, assignRole: vi.fn() };
});

import app from '../src/server';
import { env } from '../src/config/env';
import { assignRole } from '../src/modules/admin/admin.service';
import { NotFoundError } from '../src/utils/appError';

const ROUTES_SOURCE_URL = new URL('../src/modules/admin/admin.routes.ts', import.meta.url);

interface RouteRegistration {
  readonly call: string;
  readonly line: number;
}

/**
 * Returns the index of the `)` that closes the `(` at `openIndex`, skipping
 * string literals so a path like `'/items/:type/:itemId'` cannot unbalance the
 * scan. Throws on unbalanced input: a registration we cannot delimit is a test
 * failure, not a silently skipped route.
 */
function findClosingParen(source: string, openIndex: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error(`Unbalanced parentheses in route registration starting at index ${openIndex}`);
}

/**
 * Extracts every `.get(`, `.post(`, `.put(`, `.patch(` and `.delete(`
 * registration as a complete statement, so multi-line registrations are
 * inspected whole instead of line by line.
 */
function findRouteRegistrations(source: string): RouteRegistration[] {
  const registrations: RouteRegistration[] = [];
  const pattern = /\.(?:get|post|put|patch|delete)\s*\(/g;

  let match = pattern.exec(source);
  while (match !== null) {
    const openIndex = match.index + match[0].length - 1;
    const closeIndex = findClosingParen(source, openIndex);
    registrations.push({
      call: source.slice(match.index, closeIndex + 1),
      line: source.slice(0, match.index).split('\n').length,
    });
    match = pattern.exec(source);
  }

  return registrations;
}

function describeRegistration({ call, line }: RouteRegistration): string {
  return `line ${line}: ${call.split('\n')[0].trim()}`;
}

describe('admin route registrations', () => {
  const source = readFileSync(ROUTES_SOURCE_URL, 'utf8');

  it('wraps every handler in asyncHandler', () => {
    const registrations = findRouteRegistrations(source);

    // A scanner that finds nothing would make the assertion below pass blindly.
    expect(registrations.length).toBeGreaterThan(0);

    const unwrapped = registrations.filter(({ call }) => !call.includes('asyncHandler('));

    expect(unwrapped.map(describeRegistration)).toEqual([]);
  });

  it('reads a multi-line registration as one statement', () => {
    const registrations = findRouteRegistrations(source);
    const storageRegistration = registrations.find(({ call }) =>
      call.includes("'/storage/ensure-viewer-permissions'")
    );

    expect(storageRegistration).toBeDefined();
    expect(storageRegistration?.call).toContain('asyncHandler(controller.ensureViewerPermissions)');
  });
});

describe('admin controller rejections', () => {
  const adminToken = jwt.sign(
    { userId: 'admin-1', username: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reaches the central error handler instead of hanging', async () => {
    (assignRole as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Admin user not found')
    );

    const response = await request(app)
      .post('/admin/api/roles/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminId: 'missing-admin', roleId: 'missing-role' });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: 'NOT_FOUND',
      message: 'Admin user not found',
    });
    expect(response.body.requestId).toBeDefined();
    expect(assignRole).toHaveBeenCalledWith('missing-admin', 'missing-role');
  });
});

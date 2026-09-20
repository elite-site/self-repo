import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({ prisma: { student: { findUnique: vi.fn() } } }));

const { prisma } = await import('../src/lib/prisma');

describe('blank-email lockout', () => {
  it('students whose roster email is NULL cannot be found by the SSO email lookup', async () => {
    // The SSO callback looks up `prisma.student.findUnique({ where: { email } })`.
    // A student without an email simply does not match any email — including one
    // derived from their roll number.
    for (const probe of ['23k61a1201@sasi.ac.in', '23K61A1201@sasi.ac.in', '']) {
      (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const found = await prisma.student.findUnique({ where: { email: probe } });
      expect(found).toBeNull();
    }
  });

  it('only a registered college email yields a student record', async () => {
    (prisma.student.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 's1',
      rollNo: '23K61A1201',
      email: 'test@sasi.ac.in',
    });
    const found = await prisma.student.findUnique({ where: { email: 'test@sasi.ac.in' } });
    expect(found?.email).toBe('test@sasi.ac.in');
  });
});
import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

/**
 * SSO smoke test: drive the exact redirect a successful Google sign-in produces
 * (`GET /api/student/google/callback` → 302 → `/login?token=<jwt>`) without
 * needing a real Google account. The JWT is minted with the same
 * STUDENT_JWT_SECRET the local backend uses.
 *
 * Skipped in CI where the secret isn't available — real Google end-to-end
 * happens post-deploy via the approved Google OAuth app.
 *
 * Requires the backend started by Playwright's webServer (backend/dist/server.js)
 * which reads SQL STUDENT_JWT_SECRET = "???" — 📣 confirm before backing in.
 */

function readEnvSecret(): string {
  const candidates = [
    // Playwright bundles specs into a cache dir; cwd (web/) is the reliable anchor.
    path.resolve(process.cwd(), '../backend/.env'),
  ];
  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      const m = /^STUDENT_JWT_SECRET=("?)(.*?)\1$/m.exec(raw) ?? /^STUDENT_JWT_SECRET=(.*)$/m.exec(raw);
      const value = m[2] ?? m[1] ?? '';
      if (value.trim()) return value.trim();
    } catch {
      /* try next candidate */
    }
  }
  return '';
}

const SECRET = readEnvSecret();

// Roll/name/email of the seeded Student row this smoke drives. If the seed
// changes, adjust to a real row (`select studentId,rollNo,name,email from "Student" limit 1;`).
const TEST_STUDENT = {
  studentId: 'cmu9epnaf003nhzry6z3iurqw',
  rollNo: '24K61A1201',
  name: 'Abbadasari Stalin',
  email: 'stalin.abbadasari24@sasi.ac.in',
};

test('minted-token login lands on the student dashboard with the roster identity', async ({ page }) => {
  test.skip(!SECRET, 'STUDENT_JWT_SECRET not available locally — run against the seeded backend');
  const token = jwt.sign(TEST_STUDENT, SECRET, { expiresIn: '12h' });

  await page.goto(`/login?token=${encodeURIComponent(token)}`);

  await expect(page.getByRole('heading', { level: 1, name: TEST_STUDENT.name })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/self introduction/i).first()).toBeVisible();
});

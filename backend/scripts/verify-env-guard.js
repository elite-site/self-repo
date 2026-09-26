// Verifies the production secret guard in src/config/env.ts across the
// environment combinations that matter. Run against the compiled output.
const { spawnSync } = require('child_process');
const path = require('path');

const envModule = path.resolve(__dirname, '../dist/config/env.js');

const BASE = {
  PATH: process.env.PATH,
  DATABASE_URL: 'postgresql://user:pw@host:5432/db?schema=public',
  SKIP_DOTENV: 'true',
};

const SECRET = 'a'.repeat(64);

const cases = [
  {
    name: 'production, both secrets defaulted  -> must refuse',
    env: {},
    expectThrow: /Refusing to start in production/,
  },
  {
    name: 'production, secret literally set to the committed fallback -> must refuse',
    env: { STUDENT_JWT_SECRET: 'student_jwt_secret_change_in_production' },
    expectThrow: /Refusing to start in production/,
  },
  {
    name: 'production, only STUDENT_JWT_SECRET set -> must still refuse (admin secret unset)',
    env: { STUDENT_JWT_SECRET: SECRET },
    expectThrow: /JWT_SECRET/,
  },
  {
    name: 'production, only JWT_SECRET set (student falls back to it) -> must start',
    env: { JWT_SECRET: SECRET },
    expectOk: true,
  },
  {
    name: 'production, both set -> must start',
    env: { JWT_SECRET: SECRET, STUDENT_JWT_SECRET: 'b'.repeat(64) },
    expectOk: true,
  },
  {
    name: 'production, defaults + escape hatch -> must start (loudly)',
    env: { ALLOW_INSECURE_DEFAULT_SECRETS: 'true' },
    expectOk: true,
  },
  {
    name: 'production, no DATABASE_URL -> must refuse',
    env: { STUDENT_JWT_SECRET: SECRET },
    noDatabase: true,
    expectThrow: /missing DATABASE_URL/,
  },
  {
    name: 'production, secrets fine but ADMIN_DEFAULT_PASSWORD default -> must start',
    env: { JWT_SECRET: SECRET, STUDENT_JWT_SECRET: SECRET },
    expectOk: true,
    expectWarn: /seed\/import scripts/,
  },
  {
    name: 'production, both secrets + ADMIN_DEFAULT_PASSWORD set -> no warnings at all',
    env: { JWT_SECRET: SECRET, STUDENT_JWT_SECRET: SECRET, ADMIN_DEFAULT_PASSWORD: 'c'.repeat(24) },
    expectOk: true,
    expectNoWarn: /ENV WARNING|ALLOW_INSECURE/,
  },
  {
    name: 'development, secrets defaulted -> must start (never block dev)',
    env: { NODE_ENV: 'development' },
    noDatabase: true,
    expectOk: true,
  },
];

let failures = 0;

for (const testCase of cases) {
  const env = { ...BASE, NODE_ENV: 'production', ...testCase.env };
  if (testCase.noDatabase) delete env.DATABASE_URL;

  let stdout = '';
  let threw = false;
  let message = '';

  // console.warn writes to stderr, so both streams are needed to assert on
  // warnings that accompany an otherwise successful start.
  const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(envModule)})`], {
    env,
    encoding: 'utf8',
  });

  stdout = `${result.stdout || ''}${result.stderr || ''}`;
  threw = result.status !== 0;
  message = stdout;

  let ok = true;
  let detail = '';

  if (testCase.expectThrow) {
    ok = threw && testCase.expectThrow.test(`${stdout}${message}`);
    detail = ok ? 'refused as expected' : `threw=${threw}`;
  } else if (testCase.expectOk) {
    ok = !threw;
    detail = ok ? 'started' : `unexpectedly refused: ${message.slice(0, 120)}`;
  }

  if (ok && testCase.expectWarn && !testCase.expectWarn.test(stdout)) {
    ok = false;
    detail = 'started but expected a seed-time warning';
  }

  if (ok && testCase.expectNoWarn && testCase.expectNoWarn.test(stdout)) {
    ok = false;
    detail = 'started but emitted a warning it should not have';
  }

  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${testCase.name}${ok ? '' : ` — ${detail}`}`);
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);
process.exit(failures === 0 ? 0 : 1);

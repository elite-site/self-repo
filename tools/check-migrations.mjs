#!/usr/bin/env node
/**
 * Migration safety gate (runs on pull requests that touch backend/prisma/).
 *
 *   node tools/check-migrations.mjs origin/main
 *
 * Why it exists: Prisma wraps every migration in a transaction and this repo
 * applies migrations to the production database during the backend build. A
 * migration that fails there blocks every later deploy (this already happened
 * with CREATE INDEX CONCURRENTLY). Catch it in the PR instead.
 *
 * Rules
 *   1. An already-applied migration is immutable: modifying/deleting it fails.
 *   2. CONCURRENTLY is forbidden (cannot run inside Prisma's transaction).
 *   3. Destructive or locking statements need an explicit sign-off line in the
 *      same file:   -- migration-safety: reviewed (<why this is safe>)
 *        DROP TABLE/COLUMN/TYPE/SCHEMA, RENAME, ALTER COLUMN ... TYPE,
 *        SET NOT NULL, ADD COLUMN ... NOT NULL without DEFAULT,
 *        TRUNCATE, DELETE FROM.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.argv[2] || 'origin/main';
const DIR = 'backend/prisma/migrations/';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const changed = git('diff', '--name-status', '--no-renames', `${base}...HEAD`, '--', DIR)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [status, ...rest] = line.split('\t');
    return { status, file: rest.join('\t') };
  })
  .filter((c) => c.file.endsWith('migration.sql') || c.status !== 'A');

let errors = 0;
const fail = (file, msg) => {
  errors++;
  console.log(`::error file=${file}::${msg}`);
};
const note = (file, msg) => console.log(`::notice file=${file}::${msg}`);

if (changed.length === 0) {
  console.log('No migration changes in this PR.');
  process.exit(0);
}

const RISKY = [
  [/\bDROP\s+(TABLE|COLUMN|TYPE|SCHEMA)\b/i, 'drops data or schema objects'],
  [/\bRENAME\b/i, 'renames a column/table (old code still running will break)'],
  [/\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i, 'changes a column type (table rewrite + lock)'],
  [/\bALTER\s+COLUMN\b[^;]*\bSET\s+NOT\s+NULL\b/i, 'adds NOT NULL to an existing column'],
  [/\bTRUNCATE\b/i, 'truncates a table'],
  [/\bDELETE\s+FROM\b/i, 'deletes rows'],
];

for (const { status, file } of changed) {
  if (status !== 'A') {
    fail(file, `Applied migrations are immutable (status ${status}). Add a NEW migration instead.`);
    continue;
  }

  const raw = readFileSync(file, 'utf8');
  const sql = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  const reviewed = /--\s*migration-safety:\s*reviewed/i.test(raw);

  if (/\bCONCURRENTLY\b/i.test(sql)) {
    fail(file, 'CONCURRENTLY cannot run inside the transaction Prisma wraps migrations in. Remove it.');
  }

  const problems = [];
  for (const [re, why] of RISKY) if (re.test(sql)) problems.push(why);

  for (const stmt of sql.split(';')) {
    if (!/\bADD\s+COLUMN\b/i.test(stmt)) continue;
    for (const clause of stmt.split(/,\s*(?=ADD\s+COLUMN)/i)) {
      if (/\bADD\s+COLUMN\b/i.test(clause) && /\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)) {
        problems.push('adds a NOT NULL column without a DEFAULT (fails on non-empty tables)');
      }
    }
  }

  if (problems.length && !reviewed) {
    fail(
      file,
      `Risky migration: ${[...new Set(problems)].join('; ')}. ` +
        'If intended, add a line "-- migration-safety: reviewed (<reason>)" and use expand/contract (see docs/DELIVERY.md).',
    );
  } else if (problems.length) {
    note(file, `Risky statements signed off: ${[...new Set(problems)].join('; ')}`);
  } else {
    console.log(`ok  ${file}`);
  }
}

process.exit(errors ? 1 : 0);

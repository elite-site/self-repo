/**
 * Verify every token colour utility referenced by either app actually compiles.
 *
 * A semantic token Tailwind cannot resolve renders as *nothing*: no colour, no
 * border, no background. It fails silently, which is how 62 soft tints and
 * hairline borders came to render at full strength.
 *
 * This extracts colour utilities from the sources the same way Tailwind's own
 * scanner does (raw text, so classes assembled in template literals still
 * count), builds each app's stylesheet, and asserts each referenced selector is
 * present.
 *
 * Usage: node tools/check-utilities.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';

import { eliteTokens } from '../shared/tailwind-preset.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Colour groups, read from the shared preset rather than listed here, so a token
 * added to `shared/tailwind-preset.mjs` is covered the moment it lands. Longest
 * first: `status-solid` must be tried before `status` or the regex truncates it.
 */
const GROUPS = Object.keys(eliteTokens.colors).sort((a, b) => b.length - a.length);

/**
 * A full utility reference, variants included: `hover:bg-brand-soft/80`.
 * Captured from raw source text to match Tailwind's own scanner.
 */
const UTILITY = new RegExp(
  String.raw`(?:[a-z0-9-]+:)*` +
    String.raw`(?:bg|text|border|ring|fill|stroke|divide|outline|from|to|via|accent|decoration|caret)-` +
    `(${GROUPS.map((g) => g.replace(/-/g, '\\-')).join('|')})(?:-[a-z0-9]+)*(?:/\\d{1,3})?\\b`,
  'g',
);

/**
 * Match a generated rule for `cls`.
 *
 * Tailwind escapes the characters that are meaningful in a selector (`:`, `/`)
 * and emits the rule as `.name {`, `.name,\n.name:hover {` and so on. Requiring a
 * boundary character after the escaped name is what stops `bg-edge` from
 * matching the prefix of `bg-edge-strong`.
 */
const hasRule = (css, cls) => {
  // Tailwind escapes exactly two characters in a utility selector: `:` for the
  // variant separator and `/` for the opacity modifier. Add that backslash, then
  // double it so the regex engine reads it as a literal backslash rather than an
  // escape.
  const cssEscaped = cls.replace(/[:/]/g, (c) => `\\${c}`);
  const pattern = cssEscaped.replace(/\\/g, '\\\\');
  return new RegExp(`\\.${pattern}[\\s,{:]`).test(css);
};

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const APPS = ['web', 'admin-client'];
let failures = 0;

for (const app of APPS) {
  const out = join(tmpdir(), `check-utilities-${app}.css`);

  execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.js', '-i', 'src/index.css', '-o', out], {
    cwd: join(ROOT, app),
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  const css = readFileSync(out, 'utf8');

  /** selector -> first file that referenced it. */
  const referenced = new Map();
  for (const file of walk(join(ROOT, app, 'src'))) {
    const src = readFileSync(file, 'utf8');
    for (const [match] of src.matchAll(UTILITY)) {
      if (!referenced.has(match)) referenced.set(match, relative(ROOT, file));
    }
  }

  const missing = [...referenced]
    .filter(([cls]) => !hasRule(css, cls))
    .map(([cls, file]) => `${cls}  (first used in ${file})`);

  if (missing.length > 0) {
    failures += missing.length;
    console.error(`\n${app}: ${missing.length} colour utility(ies) referenced but not generated:`);
    for (const m of missing.sort()) console.error(`  ${m}`);
  } else {
    console.log(`${app}: all ${referenced.size} referenced colour utilities compile.`);
  }
}

if (failures > 0) {
  console.error(`\ncheck-utilities: ${failures} utility(ies) generate no CSS and render as nothing.`);
  process.exit(1);
}
console.log('check-utilities: no dead colour utilities.');

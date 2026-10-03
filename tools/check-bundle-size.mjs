#!/usr/bin/env node
/**
 * Bundle budget for the student web app.
 *
 *   node tools/check-bundle-size.mjs web/dist [--initial-kb 190] [--chunk-kb 100]
 *
 * "Initial" = the JS a visitor must download before first paint: the entry
 * script plus everything index.html modulepreloads. Lazy route chunks are
 * excluded from the initial total but each chunk is still capped.
 * Sizes are gzip, matching what the CDN sends.
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const dist = process.argv[2] || 'web/dist';
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
const INITIAL_KB = arg('--initial-kb', 190);
const CHUNK_KB = arg('--chunk-kb', 100);

const indexPath = path.join(dist, 'index.html');
if (!existsSync(indexPath)) {
  console.error(`::error::${indexPath} not found. Build the app first.`);
  process.exit(1);
}
const html = readFileSync(indexPath, 'utf8');

const refs = new Set();
for (const m of html.matchAll(/<script[^>]*\bsrc="([^"]+\.js)"/g)) refs.add(m[1]);
for (const tag of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*>/g)) {
  const href = tag[0].match(/href="([^"]+)"/);
  if (href) refs.add(href[1]);
}

const gz = (file) => gzipSync(readFileSync(file)).length / 1024;
const rows = [];
let initial = 0;
for (const ref of refs) {
  const file = path.join(dist, ref.replace(/^\//, ''));
  if (!existsSync(file)) continue;
  const kb = gz(file);
  initial += kb;
  rows.push([path.basename(file), kb, 'initial']);
}

import { readdirSync } from 'node:fs';
const assets = path.join(dist, 'assets');
let worst = 0;
for (const name of readdirSync(assets).filter((n) => n.endsWith('.js'))) {
  const kb = gz(path.join(assets, name));
  worst = Math.max(worst, kb);
  if (kb > CHUNK_KB) rows.push([name, kb, 'OVER CHUNK BUDGET']);
}

const lines = [
  `Initial JS (gzip): ${initial.toFixed(1)} KB  (budget ${INITIAL_KB} KB)`,
  `Largest chunk (gzip): ${worst.toFixed(1)} KB  (budget ${CHUNK_KB} KB)`,
  ...rows.map(([n, kb, tag]) => `  ${kb.toFixed(1).padStart(6)} KB  ${n}  ${tag}`),
];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Web bundle size\n```\n' + lines.join('\n') + '\n```\n');
}

let bad = false;
if (initial > INITIAL_KB) {
  console.log(`::error::Initial JS ${initial.toFixed(1)} KB exceeds budget ${INITIAL_KB} KB`);
  bad = true;
}
if (worst > CHUNK_KB) {
  console.log(`::error::A chunk is ${worst.toFixed(1)} KB gzip, over the ${CHUNK_KB} KB cap`);
  bad = true;
}
process.exit(bad ? 1 : 0);

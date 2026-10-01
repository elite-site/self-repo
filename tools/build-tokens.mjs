#!/usr/bin/env node
/**
 * Generates `shared/tokens.css` from `shared/tokens.mjs`.
 *
 * The CSS is generated, not hand-written, because the palette has exactly one
 * home. Editing a hex in `tokens.mjs` and forgetting the stylesheet is the bug
 * this removes. Run `npm run tokens` after any token change and commit the
 * result; `npm run tokens:check` fails if the committed file is stale.
 *
 * The output is plain CSS with no `@apply`, so it can be imported before or
 * after the Tailwind layers without depending on Tailwind's processing order.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { red, navy, neutral, font, radius, motion, layer, shadow, light, dark, brand } from '../shared/tokens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../shared/tokens.css');

/** kebab-case a camelCase token key: `surfaceRaised` -> `surface-raised`. */
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Collapse the three raw ramps into one namespaced map. They all use the same
 * numeric keys, so spreading them into a single object silently lets the last
 * one win -- which is how `--50` ended up being neutral grey while the
 * stylesheet claimed to expose a red ramp.
 */
const ramps = Object.fromEntries(
  [['red', red], ['navy', navy], ['neutral', neutral]].flatMap(([name, ramp]) =>
    Object.entries(ramp).map(([step, value]) => [`${name}-${step}`, value]),
  ),
);

function block(selector, map, indent = '  ') {
  const body = Object.entries(map)
    .map(([k, v]) => `${indent}--${kebab(k)}: ${v};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

const css = `/**
 * ELITE design tokens — GENERATED FILE, DO NOT EDIT.
 *
 * Source:    shared/tokens.mjs
 * Regenerate: npm run tokens
 * Verify:     npm run tokens:check
 *
 * ${brand.name} Student Portal · ${brand.institution} · ${brand.department}
 * Primary ${brand.primary} (SASI red) · Accent ${brand.accent} (ELITE navy)
 *
 * Both web/ and admin-client/ import this file. It contains:
 *   1. raw colour ramps, for the rare component that needs a specific step
 *   2. semantic theme tokens under :root and [data-theme='dark']
 *   3. non-colour scales: radius, motion, layer, elevation
 *   4. the component layer (btn / card / input / badge / surface)
 *   5. keyframes and the reduced-motion override
 *
 * Theming contract: components read SEMANTIC tokens (--surface, --text), never
 * raw ramps, and never write a \`dark:\` variant. That is what lets the admin
 * client drop its 200-line \`!important\` override wall.
 */

${block(':root', ramps)}
${block(':root', light)}
${block(`[data-theme='dark'],\n.dark`, dark)}
${block(':root', { ...radius, ...motion, ...layer, ...shadow })}
${block(':root', {
  'font-sans': font.sans,
  'font-heading': font.heading,
  'font-mono': font.mono,
})}

/* ── Base ──────────────────────────────────────────────────────────────── */
@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    scrollbar-gutter: stable;
  }

  body {
    background-color: var(--canvas);
    color: var(--text);
    font-family: var(--font-sans);
    font-synthesis-weight: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color var(--dur-base) var(--ease-standard),
                color var(--dur-base) var(--ease-standard);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    text-wrap: balance;
  }

  p, li {
    text-wrap: pretty;
  }

  input, select, textarea, button {
    font-family: inherit;
  }

  /* A single focus treatment for the whole app. Visible on every surface
     because the ring colour is a semantic token with a checked 5.3:1 against
     the canvas and 4.7:1 against --surface. */
  :focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: var(--sm);
  }

  /* Suppress the ring for pointer users on non-interactive surfaces, but keep
     it on every control. */
  :focus:not(:focus-visible) {
    outline: none;
  }
}

/* ── Component layer ────────────────────────────────────────────────────────
   The only place component classes are defined. Everything reads a semantic
   token, so a component written once works in both themes. */
@layer components {
  .surface {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--lg);
  }

  .surface-sunken {
    background-color: var(--surface-sunken);
    border: 1px solid var(--border);
    border-radius: var(--lg);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: var(--lg);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    transition: background-color var(--dur-fast) var(--ease-standard),
                border-color var(--dur-fast) var(--ease-standard),
                color var(--dur-fast) var(--ease-standard),
                opacity var(--dur-fast) var(--ease-standard),
                transform var(--dur-fast) var(--ease-press);
  }

  /* :active at 0ms, not transitioned-in: the press must feel like it happened
     the instant the finger landed, not one frame later. */
  .btn:active:not(:disabled) {
    transform: scale(0.98);
    transition-duration: 0ms;
  }

  .btn:disabled,
  .btn[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .btn-primary {
    background-color: var(--brand);
    color: var(--text-inverse);
    box-shadow: var(--shadow-card);
  }
  .btn-primary:hover:not(:disabled) { background-color: var(--brand-hover); }
  .btn-primary:active:not(:disabled) { background-color: var(--brand-active); }

  .btn-secondary {
    background-color: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--surface-sunken);
    border-color: var(--border-strong);
  }

  /* One ghost treatment, used for the same intent everywhere: a low-emphasis
     action next to a primary one. Previously the two apps each had their own. */
  .btn-ghost {
    background-color: transparent;
    color: var(--text-secondary);
  }
  .btn-ghost:hover:not(:disabled) {
    background-color: var(--surface-sunken);
    color: var(--text);
  }

  .btn-danger {
    background-color: var(--status-rejected);
    color: var(--on-primary);
  }

  .input,
  .select,
  .textarea {
    width: 100%;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--lg);
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--text);
    transition: border-color var(--dur-fast) var(--ease-standard),
                box-shadow var(--dur-fast) var(--ease-standard);
  }
  .input::placeholder,
  .textarea::placeholder {
    color: var(--text-muted);
  }
  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: none;
    border-color: var(--brand);
    box-shadow: var(--shadow-focus);
  }
  .input:disabled,
  .select:disabled,
  .textarea:disabled {
    background-color: var(--surface-sunken);
    color: var(--text-muted);
    cursor: not-allowed;
  }
  /* An invalid field keeps the 2px brand ring rather than swapping to a
     colour, so "wrong" never reads as "unfocused". */
  .input[aria-invalid='true'],
  .select[aria-invalid='true'],
  .textarea[aria-invalid='true'] {
    border-color: var(--status-rejected);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--status-rejected) 28%, transparent);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--full);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1rem;
    white-space: nowrap;
  }
  .badge-draft    { background: var(--status-draft-bg);    color: var(--status-draft); }
  .badge-pending  { background: var(--status-pending-bg);  color: var(--status-pending); }
  .badge-review   { background: var(--status-review-bg);   color: var(--status-review); }
  .badge-approved { background: var(--status-approved-bg); color: var(--status-approved); }
  .badge-rejected { background: var(--status-rejected-bg); color: var(--status-rejected); }
  .badge-changes  { background: var(--status-changes-bg);  color: var(--status-changes); }
  .badge-brand    { background: var(--brand-soft);         color: var(--brand-soft-text); }

  .label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.375rem;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .error-text {
    font-size: 0.75rem;
    color: var(--status-rejected);
    margin-top: 0.25rem;
  }

  /* Content that swaps in after a route change. Paired classes: the same
     animation on the outgoing node would double the perceived wait. */
  .page-enter {
    animation: page-enter var(--dur-slow) var(--ease-entrance) both;
  }

  /* Skeletons. Static, not a looping shimmer: the loading states here last
     150-400ms, and a shimmer that runs for that long reads as jank. */
  .skeleton {
    background-color: var(--surface-sunken);
    border-radius: var(--md);
    animation: skeleton-pulse 1.6s var(--ease-standard) infinite;
    pointer-events: none !important;
  }

  .loading,
  [data-loading='true'] {
    pointer-events: none !important;
  }
}

/* ── Keyframes ─────────────────────────────────────────────────────────── */
@keyframes page-enter {
  from { opacity: 0; transform: translate3d(0, 6px, 0); }
  to   { opacity: 1; transform: none; }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes slide-in-left {
  from { transform: translate3d(-100%, 0, 0); }
  to   { transform: none; }
}
@keyframes slide-in-up {
  from { transform: translate3d(0, 100%, 0); }
  to   { transform: none; }
}
@keyframes drawer-in {
  from { transform: translate3d(100%, 0, 0); }
  to   { transform: none; }
}
@keyframes indeterminate {
  0%   { transform: translate3d(-100%, 0, 0); }
  50%  { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(400%, 0, 0); }
}
@keyframes toast-in {
  from { opacity: 0; transform: translate3d(0, 12px, 0) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}

/* ── Reduced motion ────────────────────────────────────────────────────────
   The app's motion is hover, press and state feedback, all of which collapse
   to an instant state without losing information. One block, no per-component
   guards, because every duration in the system routes through a token. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ── Scrollbars ────────────────────────────────────────────────────────── */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: var(--border-strong);
  border-radius: 9999px;
  border: 3px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover { background-color: var(--text-muted); }
`;

if (process.argv.includes('--check')) {
  let current;
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    console.error('tokens:check — shared/tokens.css is missing. Run: npm run tokens');
    process.exit(1);
  }
  if (current !== css) {
    console.error('tokens:check — shared/tokens.css is stale. Run: npm run tokens');
    process.exit(1);
  }
  console.log('tokens:check — shared/tokens.css is up to date.');
} else {
  writeFileSync(OUT, css, 'utf8');
  const lines = css.split('\n').length;
  console.log(`tokens — wrote shared/tokens.css (${lines} lines).`);
}

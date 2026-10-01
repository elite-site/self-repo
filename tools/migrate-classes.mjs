/**
 * One-shot migration codemod: legacy Tailwind colour utilities -> semantic tokens.
 *
 * Docs: `docs/PORTAL_MIGRATION_SPEC.md` §2.1 (colours), §2.2 (magic numbers),
 * §2.3 (motion). This does only the mechanical half. Component classes
 * (`.surface`, `.btn-*`, `.badge-*`), loading/empty/error states and a11y are
 * hand work; this script does not guess them.
 *
 * It also deletes `dark:` variants outright rather than remapping them, because
 * the semantic tokens already re-theme (spec §1.5). A `dark:bg-neutral-900` that
 * survives next to a `bg-surface` is a rule 2 violation, not a migration.
 *
 * Idempotent: it only ever rewrites a token it recognises.
 *
 *   node tools/migrate-classes.mjs <file...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Legacy ramp step -> the token the spec pins it to, per utility.
 *
 * `neutral.400` is the awkward one: `shared/tokens.mjs` marks it hairlines and
 * disabled text (2.64:1), but the old pages used it as body copy, where it failed
 * AA outright. The spec resolves that in favour of legibility, so 400 text
 * becomes `text-ink-muted` (4.59:1) and only 400 *borders* keep the hairline
 * reading.
 */
const STEP = {
  50: { bg: 'surface-sunken', text: 'ink-muted', border: 'edge' },
  100: { bg: 'surface-sunken', text: 'ink-muted', border: 'edge' },
  200: { bg: 'surface-inset', text: 'ink-muted', border: 'edge' },
  300: { bg: 'surface-inset', text: 'ink-muted', border: 'edge-strong' },
  400: { bg: 'surface-inset', text: 'ink-muted', border: 'edge-strong' },
  500: { bg: 'surface-inset', text: 'ink-muted', border: 'edge-strong' },
  600: { bg: 'surface-inset', text: 'ink-secondary', border: 'edge-strong' },
  700: { bg: 'surface-inverse', text: 'ink-secondary', border: 'edge-strong' },
  800: { bg: 'surface-inverse', text: 'ink', border: 'edge-strong' },
  900: { bg: 'surface-inverse', text: 'ink', border: 'edge-strong' },
};

/**
 * Status hues. Tailwind's raw families encode the six workflow states the spec
 * §2.1 already has tokens for, so a hue+step resolves to a status token rather
 * than to a neutral. `red` is rejected, not brand: brand red is only ever
 * spelled `bg-brand` / `text-ink-brand` now.
 */
const STATUS_HUE = {
  emerald: 'approved',
  green: 'approved',
  teal: 'approved',
  amber: 'pending',
  yellow: 'pending',
  purple: 'review',
  violet: 'review',
  rose: 'rejected',
  red: 'rejected',
  orange: 'changes',
  blue: 'approved',
  sky: 'approved',
  cyan: 'approved',
};

/** How a (hue, step) pair resolves, by utility prefix. */
const statusFor = (hue, step, util) => {
  const state = STATUS_HUE[hue];
  if (!state) return null;
  const n = Number(step);

  // Red is the brand colour now, so a *fill* is brand, not a status. Only the
  // tints stay rejected. `rose` never had that ambiguity and stays rejected.
  if (hue === 'red' && util === 'bg') {
    if (n <= 100) return 'bg-status-bg-rejected';
    if (n >= 500) return 'bg-brand';
    return 'bg-brand-soft';
  }
  if (hue === 'red' && util === 'from') {
    if (n >= 600) return 'from-surface-inverse';
    return 'from-brand-soft';
  }

  if (util === 'bg') {
    if (n <= 100) return `bg-status-bg-${state}`;
    if (n >= 700) return 'bg-surface-inverse';
    if (n >= 500) return `bg-status-${state}`;
    return 'bg-surface-sunken';
  }
  if (util === 'text') {
    if (n <= 300) return 'text-ink-inverse';
    if (n >= 800) return 'text-ink';
    return `text-status-${state}`;
  }
  if (util === 'border' || util === 'divide' || util === 'ring') {
    const prefix = util === 'divide' ? 'divide' : util === 'ring' ? 'ring' : 'border';
    if (n <= 300) return `${prefix}-edge`;
    if (n >= 800) return `${prefix}-edge-strong`;
    if (n >= 400) return `${prefix}-status-${state}`;
    return `${prefix}-edge`;
  }
  if (util === 'from' || util === 'via' || util === 'to') {
    return n >= 600 ? `${util}-surface-inverse` : `${util}-brand-soft`;
  }
  return null;
};

/**
 * Arbitrary hex -> semantic token, keyed by the hex alone.
 *
 * Every value here is measured from what the file was already using, so this is
 * a rename, not a restyle. The 33 raw hexes the two apps carried are all listed;
 * a hex that is not in this table is reported, never silently passed through
 * (spec rule 1: if a token does not exist, say so).
 */
const HEX = new Map(Object.entries({
  // Old indigo brand
  '4f46e5': 'brand',
  '4338ca': 'brand-hover',
  '6366f1': 'brand',
  '3b82f6': 'accent',
  '818cf8': 'brand-soft-text',
  '312e81': 'surface-inverse',
  '3730a3': 'surface-inverse',
  '1e1b4b': 'surface-inverse',
  'e0e7ff': 'brand-soft',
  'c7d2fe': 'brand-soft',
  'eef2ff': 'brand-soft',

  // Old rose accent
  'e11d48': 'accent',
  'be123c': 'status-rejected',
  'f43f5e': 'status-rejected',
  'dc2626': 'status-rejected',

  // Old slate/navy neutrals
  '0f172a': 'ink',
  '0b192c': 'ink',
  '1e293b': 'surface-inverse',
  '11151c': 'surface-inverse',
  '0d1117': 'surface-inverse',
  '161b22': 'surface-inverse',
  '151a22': 'surface-inverse',
  '252b35': 'edge-strong',
  '475569': 'ink-secondary',
  '64748b': 'ink-muted',
  '94a3b8': 'ink-muted',
  '9ba3af': 'ink-muted',
  'f3f5f7': 'ink',
  'e4e7f2': 'edge',
  'e2e8f0': 'edge',
  'd1d5db': 'edge-strong',
  'f7f8fc': 'surface-canvas',
  'f8fafc': 'surface-canvas',
  'ffffff': 'surface',
  'fafafa': 'surface-sunken',
  'f1f5f9': 'surface-sunken',
  'f9fafb': 'surface-inset',
}));

/**
 * Slots that are edges being asked to do a non-edge job, and vice versa.
 *
 * The old code painted a hairline with `text-[#E4E7F2]` on a couple of pages and
 * set an icon fill with `border-[#0F172A]`. Re-theming through the wrong group
 * would silently drop the colour, so each cross-use gets an explicit landing
 * rather than a dropped class.
 */
const AS_EDGE = /^(edge|edge-strong|ink|ink-secondary|ink-muted|surface-inverse|brand|brand-hover)$/;
const AS_INK = /^(edge|edge-strong|surface|surface-raised|surface-canvas)$/;

/** How a resolved token slot maps back onto each utility prefix. */
const PREFIX = {
  bg: (slot) => {
    if (slot === 'ink' || slot === 'ink-secondary' || slot === 'ink-muted') return 'bg-surface-inverse';
    if (AS_EDGE.test(slot) && slot.startsWith('edge')) return 'bg-surface-sunken';
    return `bg-${slot}`;
  },
  text: (slot) => {
    if (AS_INK.test(slot)) return 'text-ink-muted';
    if (slot === 'surface-inverse') return 'text-ink-inverse';
    // Brand has a dedicated text slot so it re-themes; `text-brand` reads the
    // raw fill and would go invisible on the soft brand backgrounds.
    if (slot === 'brand' || slot === 'brand-hover') return 'text-ink-brand';
    if (slot === 'brand-soft') return 'text-brand-soft-text';
    return `text-${slot}`;
  },
  border: (slot) => (AS_EDGE.test(slot) ? `border-${slot.startsWith('edge') ? slot : 'edge-strong'}` : `border-${slot}`),
  divide: (slot) => (AS_EDGE.test(slot) ? `divide-${slot.startsWith('edge') ? slot : 'edge-strong'}` : `divide-${slot}`),
  ring: (slot) => (AS_EDGE.test(slot) ? 'ring-brand' : `ring-${slot}`),
  placeholder: (slot) => (AS_EDGE.test(slot) ? `placeholder-${slot.startsWith('edge') ? slot : 'edge-strong'}` : `placeholder-${slot}`),
  from: (slot) => `from-${slot}`,
  via: (slot) => `via-${slot}`,
  to: (slot) => `to-${slot}`,
};

/** Exact matches. Ordered: first hit wins, so put the specific ones first. */
const EXACT = [
  // Surfaces
  [/^bg-\[#f7f8fc\]$/i, 'bg-surface-canvas'],
  [/^bg-\[#f8fafc\]$/i, 'bg-surface-canvas'],
  [/^bg-\[#fafbfd\]$/i, 'bg-surface-canvas'],
  [/^bg-\[#ffffff\]$/i, 'bg-surface'],
  [/^bg-\[#f1f5f9\]$/i, 'bg-surface-sunken'],
  [/^bg-\[#f8fafc\]\/(\d+)$/i, 'bg-surface-sunken'],
  [/^bg-\[#f9fafb\]$/i, 'bg-surface-inset'],
  [/^bg-\[#0f172a\]$/i, 'bg-surface-inverse'],
  [/^bg-\[#1e293b\]$/i, 'bg-surface-inverse'],
  [/^bg-\[#0b192c\]$/i, 'bg-surface-inverse'],

  // Borders
  [/^border-\[#e4e7f2\]$/i, 'border-edge'],
  [/^border-\[#e2e8f0\]$/i, 'border-edge'],
  [/^border-\[#cbd5e1\]$/i, 'border-edge-strong'],

  // Text
  [/^text-\[#0f172a\]$/i, 'text-ink'],
  [/^text-\[#0b192c\]$/i, 'text-ink'],
  [/^text-\[#1e293b\]$/i, 'text-ink'],
  [/^text-\[#475569\]$/i, 'text-ink-secondary'],
  [/^text-\[#64748b\]$/i, 'text-ink-muted'],
  [/^text-\[#94a3b8\]$/i, 'text-ink-muted'],
  [/^text-\[#4f46e5\]$/i, 'text-ink-brand'],
  [/^text-\[#4338ca\]$/i, 'text-ink-brand'],
  [/^text-white\/(\d{1,3})$/, (_m, o) => `text-on-primary/${o}`],
  [/^text-white$/, 'text-on-primary'],

  // Brand + accent fills
  [/^bg-\[#4f46e5\]\/10$/, 'bg-brand-soft'],
  [/^bg-\[#4f46e5\]\/(\d{1,2})$/, (_m, o) => `bg-brand/${o}`],
  [/^bg-\[#4f46e5\]$/i, 'bg-brand'],
  [/^bg-\[#4338ca\]$/i, 'bg-brand-hover'],
  [/^bg-\[#e11d48\]$/i, 'bg-accent'],
  [/^bg-\[#3b82f6\]$/i, 'bg-accent'],
  [/^bg-\[#eef2ff\]$/i, 'bg-brand-soft'],
  [/^bg-\[#eef2ff\]\/(\d{1,2})$/, (_m, o) => `bg-brand/${o}`],

  // Indigo was the old primary
  [/^bg-indigo-50$/, 'bg-brand-soft'],
  [/^bg-indigo-100$/, 'bg-brand-soft'],
  [/^bg-indigo-600$/, 'bg-brand'],
  [/^bg-indigo-700$/, 'bg-brand-hover'],
  [/^text-indigo-600$/, 'text-ink-brand'],
  [/^text-indigo-700$/, 'text-ink-brand'],
  [/^text-indigo-500$/, 'text-ink-brand'],
  [/^border-indigo-200$/, 'border-edge'],
  [/^border-indigo-500$/, 'border-brand'],

  // Preset aliases that still ship
  [/^bg-primary-pale$/, 'bg-brand-soft'],
  [/^bg-surface-card$/, 'bg-surface'],
  [/^bg-elite-offwhite$/, 'bg-surface-canvas'],
  [/^text-primary$/, 'text-ink'],
  [/^text-secondary$/, 'text-ink-secondary'],
  [/^text-muted$/, 'text-ink-muted'],
  [/^border-subtle$/, 'border-edge'],
  [/^border-strong$/, 'border-edge-strong'],
];

/** `class` -> `class`, for the non-colour half of the spec (§2.2, §2.3). */
const SIMPLE = new Map(Object.entries({
  'bg-white': 'bg-surface',
  'bg-canvas': 'bg-surface-canvas',
  // A toggle knob on a brand track is the surface colour, not a raw white.
  'bg-black': 'bg-surface-inverse',
  'text-black': 'text-ink',
  'bg-gray-50': 'bg-surface-sunken',
  'bg-slate-50': 'bg-surface-canvas',
  'bg-neutral-50': 'bg-surface-sunken',
  'bg-slate-900': 'bg-surface-inverse',
  'bg-slate-800': 'bg-surface-inverse',
  'text-slate-600': 'text-ink-secondary',
  'min-h-screen': 'min-h-[100dvh]',
  'h-screen': 'h-[100dvh]',
  'max-w-[1400px]': 'max-w-canvas',
  'transition-all': 'transition-colors',
  'z-[9999]': 'z-toast',
  'z-[70]': 'z-modal',
  'z-[60]': 'z-modal',
  'z-[50]': 'z-modal',
  'z-[40]': 'z-overlay',
  'z-[30]': 'z-sticky',
  'z-[20]': 'z-raised',
}));

/** Duration + keyframe families, spec §2.3. */
const DURATION = [
  [/(^|:)duration-75$/, '$1duration-fast'],
  [/(^|:)duration-100$/, '$1duration-fast'],
  [/(^|:)duration-150$/, '$1duration-fast'],
  [/(^|:)duration-200$/, '$1duration-base'],
  [/(^|:)duration-300$/, '$1duration-slow'],
  [/(^|:)duration-500$/, '$1duration-slower'],
  [/(^|:)duration-700$/, '$1duration-slower'],
  [/(^|:)delay-75$/, '$1duration-fast'],
  [/(^|:)delay-150$/, '$1duration-fast'],
  [/(^|:)delay-200$/, '$1duration-base'],
  [/(^|:)delay-300$/, '$1duration-slow'],
  [/(^|:)delay-500$/, '$1duration-slower'],
  [/(^|:)delay-700$/, '$1duration-slower'],
];

/** `animate-in <family> <size>` was dead CSS: `tailwindcss-animate` was never
 *  installed, so 20 modals hard-cut open. Map to the shared keyframes. */
const ANIMATE_IN = [
  [/^animate-in$/, 'animate-fade-in'],
  [/^fade-in-(\d+)$/, (_m, d) => `animate-fade-in`],
  [/^zoom-in-(\d+)$/, (_m) => 'animate-scale-in'],
  [/^slide-in-from-bottom-(\d+)$/, (_m) => 'animate-slide-in-up'],
  [/^slide-in-from-right-(\d+)$/, (_m) => 'animate-drawer-in'],
  [/^slide-in-from-left-(\d+)$/, (_m) => 'animate-slide-in-left'],
];

/** Resolve the base utility (no variants). Returns a replacement or `null`. */
const resolveBase = (base) => {
  // `bg-[#F7F8FC]/50`, `border-[#E4E7F2]`, `fill="#ED1E26"`-style arbitrary
  // values resolve through the hex table, which is a rename of what shipped.
  const arbitrary = base.match(/^(bg|text|border|divide|ring|placeholder|from|via|to|fill|stroke)-\[#([0-9a-f]{6})\](?:\/(\d{1,3}))?$/i);
  if (arbitrary) {
    const [, util, hex, opacity] = arbitrary;
    const slot = HEX.get(hex.toLowerCase());
    if (!slot) {
      UNKNOWN_HEX.add(`#${hex.toLowerCase()}`);
      return null;
    }
    const build = PREFIX[util];
    if (!build) return null;
    const token = build(slot);
    return opacity ? `${token}/${opacity}` : token;
  }

  // A full-opacity white ring sits on an inverse surface (the avatar ring on the
  // navy profile banner), so it is `on-primary`, not an edge.
  if (base === 'border-white') return 'border-on-primary';

  // Translucent white over an inverse surface: an avatar ring on the navy banner,
// a play button over a video scrim. `on-primary` is the one token guaranteed to
// stay white in both themes, which is exactly what these need.
  const translucent = base.match(/^(bg|border|divide|ring|text)-(white|black)\/(\d{1,3})$/);
  if (translucent) {
    const [, util, , opacity] = translucent;
    return `${util}-on-primary/${opacity}`;
  }

  // A directional or accent variant keeps its modifier: `border-t-[#4F46E5]` is
  // `border-t-brand`, and `accent-[#DC2626]` is `accent-brand`. Matching only the
  // bare `border-`/`accent-` forms left these behind, which is how a raw hex
  // survived into a page that the rest of the file had already migrated.
  const directed = base.match(/^(border-t|border-b|border-l|border-r|border-x|border-y|border-s|border-e|accent)-\[(#?[0-9a-fA-F]{3,8})\](?:\/(\d{1,3}))?$/);
  if (directed) {
    const [, modifier, raw] = directed;
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    // 3-digit shorthand first, then the 6-digit table.
    const short = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.toLowerCase();
    const slot = HEX.get(short);
    if (!slot) {
      UNKNOWN_HEX.add(`#${short}`);
      return null;
    }
    if (modifier === 'accent') return `accent-${slot === 'ink' ? 'brand' : slot}`;
    const token = PREFIX.border(slot);
    return `${modifier}-${token.replace('border-', '')}`;
  }

  for (const [re, to] of EXACT) {
    const m = base.match(re);
    if (m) return m.length > 1 ? to.replace(/(\d+)/, (_, d, i) => d) : to;
  }
  if (SIMPLE.has(base)) return SIMPLE.get(base);

  const ramp = base.match(/^(bg|text|border|divide|ring|placeholder|from|via|to|shadow)-(neutral|slate|gray|stone|zinc|red|rose|orange|amber|yellow|emerald|green|teal|purple|violet|indigo|blue|sky|cyan)-(\d{2,3})(\/(\d{1,3}))?$/);
  if (ramp) {
    const [, util, family, stepRaw, , opacity] = ramp;

    // The spec bans bespoke shadows (rule 1.3). Name the token, drop the hue.
    if (util === 'shadow') return 'shadow-raised';

    const NEUTRAL = family === 'neutral' || family === 'slate' || family === 'gray' || family === 'zinc' || family === 'stone';

    // A hue ramp in the old code was almost always a workflow state in disguise,
    // so it resolves through `statusFor` rather than to a neutral.
    if (!NEUTRAL) {
      const viaStatus = statusFor(family, stepRaw, util === 'placeholder' ? 'text' : util);
      if (!viaStatus) return null;
      return opacity ? `${viaStatus}/${opacity}` : viaStatus;
    }

    const step = STEP[Number(stepRaw)];
    if (!step) return null;
    // `bg`/`from`/`via`/`to` read the fill slot; `text`/`placeholder` read text;
    // `border`/`divide`/`ring` read the edge slot.
    const slotName = util === 'text' || util === 'placeholder' ? 'text'
      : util === 'border' || util === 'divide' || util === 'ring' ? 'border'
        : 'bg';
    const slot = util === 'ring' ? 'edge-strong' : step[slotName];
    if (!slot) return null;
    const build = PREFIX[util];
    if (!build) return null;
    const token = build(slot);
    return opacity ? `${token}/${opacity}` : token;
  }

  for (const [re, to] of ANIMATE_IN) {
    if (re.test(base)) return to;
  }
  for (const [re, to] of DURATION) {
    if (re.test(base)) return base.replace(re, to);
  }
  return null;
};

/**
 * Migrate one whitespace-separated class list.
 *
 * `dark:` is dropped, not remapped: the token re-themes on its own, and keeping
 * the variant would be a rule 2 violation. `!` important and arbitrary opacity
 * are preserved.
 */
/**
 * Which fill a `text-white` in this list is sitting on.
 *
 * Both answers are white in light mode, so this cannot be detected by looking at
 * the rendered page. It matters in dark mode: `text-ink-inverse` flips to navy
 * when `surface-inverse` flips to white, while `text-on-primary` stays white
 * because a solid brand chip is a solid brand chip in both themes. Guessing
 * wrong makes the label disappear.
 */
const resolveTextWhite = (tokens) => {
  const variant = '(?:hover:|focus:|active:|focus-visible:|group-hover:|sm:|md:|lg:|xl:|dark:)*';
  // A solid brand/accent/status fill: white in both themes, never flips.
  if (tokens.some((t) => new RegExp(`^${variant}bg-(brand|accent|status)`).test(t))) return 'text-on-primary';
  // `surface-inverse` is the one fill that inverts, so its label has to invert
  // with it or it reads navy-on-navy in dark mode.
  if (tokens.some((t) => new RegExp(`^${variant}bg-surface-inverse`).test(t))) return 'text-ink-inverse';
  return 'text-on-primary';
};

/** Sentinel: this class is deleted outright rather than rewritten. */
const DROP = Symbol('drop');

/**
 * Migrate one whitespace-separated class list, preserving its exact layout.
 *
 * The separators are returned untouched rather than re-joined, because these
 * lists live inside multi-line template literals and JSX ternaries. Splitting on
 * `\s+` and joining with a single space silently reflowed whole statements onto
 * one line, which is unreadable at best and a parse error when a `//` comment
 * ends up mid-line.
 */
const migrateList = (input) => {
  const tokens = input.split(/\s+/).filter(Boolean);
  // `text-white` is the one legacy colour whose correct replacement depends on
  // its sibling, so it is resolved from the whole list rather than per token.
  const whiteText = tokens.some((t) => /^(?:[\w-]+:)*text-white(?:\/\d{1,3})?$/.test(t))
    ? resolveTextWhite(tokens)
    : null;

  const map = (raw) => {
    const important = raw.endsWith('!') ? '!' : '';
    const cls = important ? raw.slice(0, -1) : raw;

    const parts = cls.split(':');
    if (parts.includes('dark')) return DROP; // handled by the token
    const base = parts.pop();
    const prefix = parts.length ? `${parts.join(':')}:` : '';

    const replacement = whiteText !== null && /^text-white(?:\/\d{1,3})?$/.test(base)
      ? whiteText + base.slice('text-white'.length)
      : resolveBase(base);

    if (replacement === null) return raw; // unrecognised: leave it alone
    return `${prefix}${replacement}${important}`;
  };

  // Replace token by token in place, so newlines and indentation inside a
  // template literal survive untouched. Dropping a `dark:` variant leaves the
  // space that separated it from its neighbours, so runs of spaces are squeezed
  // back to one afterwards. Only horizontal whitespace is squeezed: a newline
  // inside a template literal is layout, not a separator to tidy up.
  const mapped = input.replace(/\S+/g, (tok) => {
    const next = map(tok);
    return next === DROP ? '' : next;
  });
  return mapped.replace(/[^\S\n]{2,}/g, ' ').replace(/[^\S\n]+$/, '');
};

/**
 * Rewrite the class lists a page actually has.
 *
 * Two shapes cover every case in this codebase:
 *   1. `className="..."` / `className='...'` — the direct form.
 *   2. `className={cond ? '...' : '...'}` — a ternary or template literal, which
 *      is where most of the surviving legacy classes hid. Handling only (1)
 *      silently left roughly 40% of the surface unmigrated.
 *
 * (2) rewrites any single- or backtick-quoted run. That is safe here because
 * every pattern this script recognises is class-only syntax (`bg-neutral-900`,
 * `dark:*`, `#[hex]`); none of it occurs in ordinary prose or in a URL.
 *
 * Both passes run one line at a time. An earlier version let the quoted regex
 * span newlines, and since a quote in one JSX attribute happily pairs with a
 * quote three hundred lines later, it swallowed whole functions and reflowed
 * them onto a single line. Bounding the match to a line makes that impossible:
 * the worst case now is one line's worth of over-matching, which is inert.
 */
const HUES = 'neutral|slate|gray|stone|zinc|red|rose|orange|amber|yellow|emerald|green|teal|purple|violet|indigo|blue|sky|cyan';
const SIGNAL = new RegExp(
  `(?:#[0-9A-Fa-f]{6}|dark:|\\b(?:bg|text|border|divide|ring|placeholder|from|via|to)-(?:${HUES})-\\d{2,3}`
  + `|\\b(?:bg|text|border)-(?:white|black)\\b`
  + `|\\b(?:border-t|border-b|border-l|border-r|border-x|border-y|accent)-\\[[#\\da-fA-F][^\\]]*\\])`,
);

const migrateJsx = (src) => src.split('\n').map((line) => {
  const direct = line.replace(/className=(["'])(.*?)\1/g, (m, q, inner) => {
    const next = migrateList(inner);
    return next === inner ? m : `className=${q}${next}${q}`;
  });
  const quoted = new RegExp(`(['\`])([^'\`]*?${SIGNAL.source}[^'\`]*)\\1`, 'g');
  return direct.replace(quoted, (m, q, inner) => {
    const next = migrateList(inner);
    return next === inner ? m : `${q}${next}${q}`;
  });
}).join('\n');

/** Hexes the codemod met and has no token for. Reported, never invented. */
const UNKNOWN_HEX = new Set();

const files = process.argv.slice(2);
let changed = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const after = migrateJsx(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
    console.log(`rewrote ${file}`);
  }
}
console.log(`\n${files.length} file(s) scanned, ${changed} rewritten.`);
if (UNKNOWN_HEX.size) {
  console.log(`\nno token for: ${[...UNKNOWN_HEX].sort().join(', ')}`);
  console.log('Add each to shared/tokens.mjs or map it in tools/migrate-classes.mjs. Do not');
  console.log('hand it a new hex in the page (spec rule 1).');
}

/**
 * The Tailwind theme both frontends share.
 *
 * `web/tailwind.config.js` and `admin-client/tailwind.config.js` are now three
 * lines each: they import this. They used to be ~140-line verbatim duplicates
 * that had already drifted, which is how the two apps ended up with different
 * dark palettes for the same brand.
 *
 * Colours are emitted twice on purpose:
 *   - `brand`, `surface`, `text`, `border`, `status` are CSS-variable backed
 *     (`bg-surface`, `text-text-secondary`), so they re-theme from
 *     `shared/tokens.css` without a `dark:` variant on every element.
 *   - `red`, `navy`, `neutral` are raw fixed ramps for the rare case that needs
 *     a specific step (a chart series, a brand asset).
 *
 * If you find yourself wanting a `dark:` variant, you almost certainly want a
 * semantic token instead.
 */
import { red, navy, neutral, font, radius, motion, layer, brand } from './tokens.mjs';

/**
 * Emit a Tailwind colour as `var(--x)`, so utilities work even if the token
 * stylesheet has not loaded (e.g. inside a test DOM).
 *
 * The function form is what makes opacity modifiers work. Tailwind can only
 * apply `/NN` to a colour it can read channels out of; a bare `var(--x)` is an
 * opaque box to it, so `text-ink-inverse/70` and `bg-brand-soft/50` compiled to
 * *nothing* and silently rendered at full strength. 62 classes across the two
 * apps were affected, including every soft brand tint and every hairline border
 * meant to be partly transparent.
 *
 * `color-mix` is used rather than an `rgb(var(--x-rgb) / <alpha-value>)` triplet
 * because several tokens are already translucent (`brand-soft` is an `rgba`).
 * Triplets would have to drop that alpha to work, changing their meaning;
 * mixing toward `transparent` scales whatever alpha a token already has.
 *
 * Plain usage must still emit the bare `var(--x)`. Tailwind calls this with an
 * opacity argument even when no modifier is present, so the `alpha === 1` guard
 * is what keeps `text-ink-inverse` from becoming `color-mix(... NaN% ...)`.
 */
const token = (name) => ({ opacityValue }) => {
  const alpha = Number.parseFloat(opacityValue);
  if (!Number.isFinite(alpha) || alpha === 1) return `var(--${name})`;
  return `color-mix(in srgb, var(--${name}) ${alpha * 100}%, transparent)`;
};

export const eliteTokens = {
  colors: {
    // ── Semantic, themeable ──────────────────────────────────────────────
    brand: {
      DEFAULT: token('brand'),
      hover: token('brand-hover'),
      active: token('brand-active'),
      soft: token('brand-soft'),
      'soft-text': token('brand-soft-text'),
      ring: token('brand-ring'),
    },
    accent: {
      DEFAULT: token('accent'),
      hover: token('accent-hover'),
    },
    surface: {
      DEFAULT: token('surface'),
      canvas: token('canvas'),
      raised: token('surface-raised'),
      sunken: token('surface-sunken'),
      inset: token('surface-inset'),
      inverse: token('surface-inverse'),
    },
    edge: {
      DEFAULT: token('border'),
      strong: token('border-strong'),
      inverse: token('border-inverse'),
    },
    ink: {
      DEFAULT: token('text'),
      secondary: token('text-secondary'),
      muted: token('text-muted'),
      inverse: token('text-inverse'),
      brand: token('text-brand'),
    },
    focus: token('focus'),
    // The scrim behind a modal or drawer. A raw `bg-black/50` was wrong in two
    // ways: pure black is not a token, and a fixed 50% reads heavier in dark mode
    // where the surface underneath is already dark. This is theme-aware.
    scrim: token('overlay-scrim'),
    // Text colour for a solid brand/accent fill. Always white, in both themes,
    // because a brand chip is a brand chip.
    'on-primary': '#FFFFFF',

    // ── Status ──────────────────────────────────────────────────────────
    status: {
      draft: token('status-draft'),
      pending: token('status-pending'),
      review: token('status-review'),
      approved: token('status-approved'),
      rejected: token('status-rejected'),
      changes: token('status-changes'),
    },
    'status-bg': {
      draft: token('status-draft-bg'),
      pending: token('status-pending-bg'),
      review: token('status-review-bg'),
      approved: token('status-approved-bg'),
      rejected: token('status-rejected-bg'),
      changes: token('status-changes-bg'),
    },
    // A status colour used as a *fill* under `text-on-primary`. The badge hues
    // above brighten in the dark theme to stay legible as text on a near-black
    // surface, which would leave a solid button at 1.67:1 against white. These
    // are theme-invariant. See `statusSolid` in `shared/tokens.mjs`.
    'status-solid': {
      draft: token('status-draft-solid'),
      pending: token('status-pending-solid'),
      review: token('status-review-solid'),
      approved: token('status-approved-solid'),
      rejected: token('status-rejected-solid'),
      changes: token('status-changes-solid'),
    },

    // A ranking medal. Gold and bronze, theme-invariant like `on-primary`.
    // See `award` in `shared/tokens.mjs`.
    award: {
      gold: token('award-gold'),
      bronze: token('award-bronze'),
    },

    // ── Raw ramps ───────────────────────────────────────────────────────
    // For the rare case that needs a fixed step: a chart series, a brand asset.
    red: red,
    navy: navy,
    neutral: neutral,
  },
};

/**
 * The named type scale. Carried over unchanged from the two original configs
 * so the ~200 files already using `text-body-md` / `text-headline-lg` keep
 * compiling. Sizes are px with an explicit line-height, matching what both apps
 * shipped.
 */
const fontSize = {
  'headline-xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.025em', fontWeight: '700' }],
  'headline-xl-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '700' }],
  'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
  'headline-lg-mobile': ['22px', { lineHeight: '30px', letterSpacing: '-0.015em', fontWeight: '600' }],
  'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
  'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'body-lg': ['16px', { lineHeight: '26px', fontWeight: '400' }],
  'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
  'body-sm': ['13px', { lineHeight: '20px', fontWeight: '400' }],
  'label-lg': ['14px', { lineHeight: '20px', fontWeight: '500' }],
  'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
  'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600' }],
  'data-mono': ['13px', { lineHeight: '18px', fontWeight: '400' }],
};

/**
 * Layout spacing. `header` replaces the literal `65px` / `calc(100vh - 65px)`
 * that was copy-pasted into three places and broke whenever the header changed
 * height; `rail`, `content` and `gutter` do the same job for the paddings that
 * had been written as arbitrary values.
 */
const spacing = {
  header: '4rem',
  rail: '1.25rem',
  content: '2rem',
  'space-xs': '0.25rem',
  'space-sm': '0.5rem',
  'space-md': '1rem',
  'space-lg': '1.5rem',
  'space-xl': '2rem',
  gutter: '1.5rem',
  'gutter-mobile': '1rem',
  margin: '2rem',
  'margin-mobile': '1rem',
};

export const eliteTheme = {
  extend: {
    ...eliteTokens,
    fontFamily: {
      sans: font.sans.split(', '),
      heading: font.heading.split(', '),
      display: font.heading.split(', '),
      mono: font.mono.split(', '),
      // Per-role families, preserved from the original configs. Heading
      // weights come from Sora; body and data from Plus Jakarta Sans.
      'headline-xl': ['Sora', 'system-ui', 'sans-serif'],
      'headline-lg': ['Sora', 'system-ui', 'sans-serif'],
      'headline-md': ['Sora', 'system-ui', 'sans-serif'],
      'headline-sm': ['Sora', 'system-ui', 'sans-serif'],
      'body-lg': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      'body-md': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      'body-sm': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      'label-lg': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      'label-md': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      'label-sm': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
    },
    fontSize,
    borderRadius: radius,
    boxShadow: {
      card: 'var(--shadow-card)',
      'card-hover': 'var(--shadow-card-hover)',
      raised: 'var(--shadow-raised)',
      drawer: 'var(--shadow-drawer)',
      modal: 'var(--shadow-modal)',
      focus: 'var(--shadow-focus)',
    },
    transitionDuration: {
      instant: motion['dur-instant'],
      fast: motion['dur-fast'],
      DEFAULT: motion['dur-base'],
      base: motion['dur-base'],
      slow: motion['dur-slow'],
      slower: motion['dur-slower'],
    },
    transitionTimingFunction: {
      standard: 'var(--ease-standard)',
      entrance: 'var(--ease-entrance)',
      exit: 'var(--ease-exit)',
      press: 'var(--ease-press)',
    },
    zIndex: layer,
    maxWidth: { canvas: '1440px', prose: '65ch' },
    spacing,
    opacity: {
      // Sits just above Tailwind's default so a 0.14 fade still reads.
      subtle: '0.14',
      muted: '0.4',
      disabled: '0.5',
      scrim: '0.72',
    },
    keyframes: {
      // Content arriving after a route change. 6px of travel, not a slide:
      // the user is already looking at the new page, so a large entrance reads
      // as lag rather than as continuity.
      'page-enter': {
        from: { opacity: '0', transform: 'translate3d(0, 6px, 0)' },
        to: { opacity: '1', transform: 'none' },
      },
      'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      'scale-in': {
        from: { opacity: '0', transform: 'scale(0.97)' },
        to: { opacity: '1', transform: 'scale(1)' },
      },
      'slide-in-left': {
        from: { transform: 'translate3d(-100%, 0, 0)' },
        to: { transform: 'none' },
      },
      'slide-in-up': {
        from: { transform: 'translate3d(0, 100%, 0)' },
        to: { transform: 'none' },
      },
      'drawer-in': {
        from: { transform: 'translate3d(100%, 0, 0)' },
        to: { transform: 'none' },
      },
      'indeterminate': {
        '0%': { transform: 'translate3d(-100%, 0, 0)' },
        '50%': { transform: 'translate3d(0, 0, 0)' },
        '100%': { transform: 'translate3d(400%, 0, 0)' },
      },
      'toast-in': {
        from: { opacity: '0', transform: 'translate3d(0, 12px, 0) scale(0.98)' },
        to: { opacity: '1', transform: 'none' },
      },
    },
    animation: {
      'page-enter': `page-enter var(--dur-slow) var(--ease-entrance) both`,
      'fade-in': `fade-in var(--dur-base) var(--ease-entrance) both`,
      'scale-in': `scale-in var(--dur-base) var(--ease-entrance) both`,
      'slide-in-left': `slide-in-left var(--dur-slow) var(--ease-entrance) both`,
      'slide-in-up': `slide-in-up var(--dur-slow) var(--ease-entrance) both`,
      'drawer-in': `drawer-in var(--dur-slow) var(--ease-entrance) both`,
      indeterminate: 'indeterminate 1.4s var(--ease-standard) infinite',
      'toast-in': `toast-in var(--dur-base) var(--ease-entrance) both`,
    },
  },
};

/** Handy for docs and tests: the light theme's resolved values. */
export { brand, light as lightTheme, red, navy, neutral } from './tokens.mjs';

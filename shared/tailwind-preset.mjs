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
 *   - `red` and `slate` are raw fixed ramps for the rare case that needs
 *     a specific step (a chart series, a brand asset). The previous
 *     `navy`/`neutral` ramps are gone: the neutral is `slate` now.
 *
 * Every scale here is a pointer at a value in `shared/tokens.mjs` — the plan's
 * type scale (§4.2), radius (§4.4), elevation (§4.5) and motion (§4.7) plus the
 * pre-plan names both apps already use, aliased onto the plan's steps there.
 * Nothing in this file re-states a number.
 *
 * If you find yourself wanting a `dark:` variant, you almost certainly want a
 * semantic token instead.
 */
import { red, slate, font, radius, motion, layer, brand, typeScale, namedType } from './tokens.mjs';

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

    // ── Semantic utility colours ───────────────────────────────────────
    // The four status hues the plan defines outright (REDESIGN_PLAN §4.1),
    // separate from the six-state `status` map above: approved IS success,
    // rejected IS danger, pending IS warning, review IS info. Use these when a
    // colour is not a submission state (a validation message, a chart legend).
    success: { DEFAULT: token('success'), subtle: token('success-subtle') },
    warning: { DEFAULT: token('warning'), subtle: token('warning-subtle') },
    danger: { DEFAULT: token('danger'), subtle: token('danger-subtle') },
    info: { DEFAULT: token('info'), subtle: token('info-subtle') },

    // ── The plan's own names ───────────────────────────────────────────
    // `on-brand` is the plan's name for the text on a solid brand fill: the
    // same white as `on-primary` above, and kept because the components use it.
    'on-brand': '#FFFFFF',

    // This block used to carry the rest of the plan's colour names — `bg-base`,
    // `bg-surface`, `bg-elevated`, `bg-subtle`, `bg-inset`, `border-base`,
    // `border-strong`, `text-primary`, `text-secondary`, `text-muted`,
    // `text-disabled` and `border-brand` — each mapping the same `--color-*`
    // custom property as the `surface` / `edge` / `ink` group above. It was
    // removed because it never worked: Tailwind prepends the utility prefix
    // itself, so a colour key `bg-base` generates `bg-bg-base` and a key
    // `text-primary` generates `text-text-primary`. Every component that wrote
    // the readable spelling got a class that compiled to nothing and so styled
    // nothing at all, with no error anywhere.
    //
    // The rule: a colour key must not begin with the utility prefix it is meant
    // to be used behind. The `--color-*` properties those keys pointed at still
    // exist in `shared/tokens.css`; read them through `surface.*`, `edge.*` and
    // `ink.*`, which are the same values under names that resolve.

    // ── Raw ramps ───────────────────────────────────────────────────────
    // For the rare case that needs a fixed step: a chart series, a brand asset.
    red: red,
    slate: slate,
  },
};

/**
 * The type scale, in the two shapes the app needs.
 *
 * Both tables live in `shared/tokens.mjs` and are documented there:
 * `typeScale` is the plan's own `text-xs`…`text-9xl` (§4.2) and `namedType` is
 * the pre-existing `text-headline-*` / `text-body-*` scale mapped onto it.
 * Sizes, line-heights, letter-spacings and weights all come from there; nothing
 * below re-states a number.
 *
 * The `family` on each step cannot be emitted from here: Tailwind's `fontSize`
 * extension only writes `font-size`, `line-height`, `letter-spacing` and
 * `font-weight`, and drops a `fontFamily` key on the floor. So the family is
 * generated as a `text-*` utility in `shared/tokens.css` instead, and
 * `fontFamily` below keeps exposing both the four roles and one entry per named
 * step, so `font-headline-md` still means DM Sans.
 */
const toFontSize = (step) => {
  const options = {};
  if (step.lineHeight !== undefined) options.lineHeight = step.lineHeight;
  if (step.letterSpacing !== undefined) options.letterSpacing = step.letterSpacing;
  if (step.fontWeight !== undefined) options.fontWeight = step.fontWeight;
  return [step.size, options];
};

const fontSize = {
  ...Object.fromEntries(
    Object.entries(typeScale).map(([name, step]) => [name, toFontSize(step)]),
  ),
  ...Object.fromEntries(
    Object.entries(namedType).map(([name, step]) => [name, toFontSize(step)]),
  ),
};

/** The four roles plus a `font-<named step>` alias for every named step. */
const typeFamily = {
  display: font.display.split(', '), // Playfair Display — text-3xl and up
  body: font.body.split(', '), // Inter — running text
  ui: font.ui.split(', '), // DM Sans — labels, buttons, nav
  // `sans` and `heading` are the pre-redesign names for body and display and are
  // kept so the existing `font-sans` / `font-heading` utilities keep compiling.
  sans: font.sans.split(', '),
  heading: font.heading.split(', '),
  mono: font.mono.split(', '), // JetBrains Mono — roll numbers, code, ids
  ...Object.fromEntries(
    Object.entries(namedType).map(([name, step]) => [name, font[step.family].split(', ')]),
  ),
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
  30: '7.5rem',
};

export const eliteTheme = {
  extend: {
    ...eliteTokens,
    fontFamily: typeFamily,
    fontSize,
    borderRadius: radius,
    boxShadow: {
      // The plan's scale (REDESIGN_PLAN §4.5, Appendix B), read through the
      // custom properties so the dark theme can re-elevation without a `dark:`
      // variant on every element.
      xs: 'var(--shadow-xs)',
      sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
      xl: 'var(--shadow-xl)',
      '2xl': 'var(--shadow-2xl)',
      brand: 'var(--shadow-brand)', // brand button glow on hover
      inner: 'var(--shadow-inner)',
      // Pre-plan names, aliased onto the steps above inside `tokens.mjs` so they
      // follow the theme switch as well. See `shadowAliases` there.
      card: 'var(--shadow-card)',
      'card-hover': 'var(--shadow-card-hover)',
      raised: 'var(--shadow-raised)',
      drawer: 'var(--shadow-drawer)',
      modal: 'var(--shadow-modal)',
      focus: 'var(--shadow-focus)',
    },
    transitionDuration: {
      // REDESIGN_PLAN Appendix B / §4.7.
      instant: motion['dur-instant'],
      fast: motion['dur-fast'],
      quick: motion['dur-quick'],
      normal: motion['dur-normal'],
      moderate: motion['dur-moderate'],
      slow: motion['dur-slow'],
      deliberate: motion['dur-deliberate'],
      lazy: motion['dur-lazy'],
      story: motion['dur-story'],
      // Pre-plan names, aliased onto the steps above inside `tokens.mjs`.
      DEFAULT: motion['dur-normal'],
      base: motion['dur-normal'],
      slower: motion['dur-slow'],
    },
    transitionTimingFunction: {
      // REDESIGN_PLAN Appendix B / §4.7. The key is the easing's *bare* name:
      // Tailwind supplies the `ease-` prefix, so `gentle` is what makes
      // `ease-gentle` resolve. The `--ease-*` names are the *values* below.
      // Keys written `ease-gentle` generated `ease-ease-gentle` and matched
      // nothing, while the bare names below always worked — which is why
      // `ease-standard` compiled and `ease-gentle` did not.
      linear: 'var(--ease-linear)',
      out: 'var(--ease-out)',
      in: 'var(--ease-in)',
      'in-out': 'var(--ease-in-out)',
      gentle: 'var(--ease-gentle)',
      // Pre-plan names, aliased onto the easings above inside `tokens.mjs`.
      standard: 'var(--ease-standard)',
      entrance: 'var(--ease-entrance)',
      exit: 'var(--ease-exit)',
      press: 'var(--ease-press)',
    },
    zIndex: layer,
    maxWidth: { canvas: '1440px', prose: '65ch' },
    // §4.3 base grid: Tailwind's default spacing scale is already 4pt
    // (space-1 = 4px, space-2 = 8px, …) so it needs no override. The only
    // screens the plan adds are these two, per Appendix B — they are additive,
    // so no existing `sm:`/`md:`/… utility moves.
    screens: {
      xs: '480px',
      '3xl': '1536px',
    },
    spacing,
    backdropBlur: {
      xs: '2px',
    },
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
export { brand, light as lightTheme, red, slate } from './tokens.mjs';

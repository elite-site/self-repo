/**
 * ELITE Student Portal — single source of truth for the design system.
 *
 * Both `web` and `admin-client` read this file:
 *   - `shared/tailwind-preset.mjs` spreads it into their Tailwind `theme.extend`
 *   - `tools/build-tokens.mjs` generates `shared/tokens.css` from it
 *
 * Nothing else in the repo may invent a colour. If a value is not here, it does
 * not belong in the UI. Run `npm run tokens` after editing and commit the
 * regenerated `shared/tokens.css` alongside it.
 *
 * ── Where the palette comes from ────────────────────────────────────────────
 * ELITE red (`#C41230`, the college's brand colour) is the single hue. The
 * 11-step `red` ramp below is derived from it, and a cool `slate` neutral ramp
 * balances it. Four semantic utility colours (success / warning / danger /
 * info) complete the palette. See `REDESIGN_PLAN.md` §4.1 and Appendix A.
 *
 * The previous palette — SASI red `#ED1E26` with an ELITE navy `#041030`
 * neutral — is gone, and so are the `navy` and `neutral` ramps that carried it.
 * The neutral ramp is `slate`; nothing in the system emits `--navy-*` or
 * `--neutral-*` any more.
 *
 * Three values in this file deliberately depart from the plan's §4.1 tables.
 * Each one is commented at its definition with the plan value, the value chosen
 * instead, and the measured ratio, because §3.4 ("Accessibility is
 * Non-Negotiable") outranks a value table when the two conflict:
 *   - light `--text-muted`: slate-400 (2.56:1) -> slate-500 (4.76:1)
 *   - dark  `--text-muted`: slate-600 (2.36:1) -> slate-400 (6.96:1)
 *   - dark  `--color-brand`: red-500  (3.67:1) -> red-600 (4.70:1) with white
 * Every one of them was a floor that had been lowered in the `contrast` table
 * instead of a colour being fixed. If you are tempted to restore the plan
 * values, do not also lower the floors back.
 *
 * `red-600` (#E11D48) is the interactive brand colour in BOTH themes: 4.70:1
 * against white, so it clears the 4.5:1 body-text floor as a solid button fill
 * with a white label, as body-size brand text, and as a focus ring. `red-500`
 * (#F43F5E) survives only where it is a non-text indicator — the dark
 * `border-brand`, `focus` and `brand-ring` — where WCAG 1.4.11 asks for 3:1 and
 * the brighter red reads better on a near-black surface.
 */

/* ── Raw ramps ─────────────────────────────────────────────────────────── */

/**
 * ELITE red. Anchored on the brand colour #C41230, hand-tuned for perceptual
 * uniformity in LAB rather than even HSL lightness steps.
 */
export const red = {
  50: '#FFF1F2', // lightest tint — hover backgrounds in light mode
  100: '#FFE4E6', // badge / alert background
  200: '#FECDD3', // subtle border in light mode
  300: '#FDA4AF', // disabled brand elements
  400: '#FB7185', // secondary brand accents, brand text on dark
  500: '#F43F5E', // primary brand in dark mode, border-brand in dark
  600: '#E11D48', // brand — light mode interactive, hover in dark
  700: '#BE123C', // brand hover in light, brand-soft-text in light
  800: '#9F1239', // brand active / pressed in light
  900: '#881337',
  950: '#4C0519', // brand-subtle in dark, text on red backgrounds
};

/**
 * The cool neutral ramp. Pairs with the warm red without competing with it.
 * Steps 50–100 are light-mode surfaces, 200–300 borders and disabled text,
 * 400–600 text, 800–950 dark-mode surfaces.
 */
export const slate = {
  50: '#F8FAFC', // page background, light
  100: '#F1F5F9', // subtle surface, light
  200: '#E2E8F0', // default border, light; input inset, light
  300: '#CBD5E1', // muted border, disabled text
  400: '#94A3B8', // placeholder / muted text, light; body text, dark
  500: '#64748B', // draft status, light
  600: '#475569', // body text, light; muted text, dark
  700: '#334155', // strong body text; input inset / strong border, dark
  800: '#1E293B', // elevated surface, dark
  900: '#0F172A', // page surface, dark; primary text, light
  950: '#020617', // page background, dark
};

/**
 * The four semantic utility colours, per theme (REDESIGN_PLAN §4.1). These are
 * the canonical values: the `status-*` tokens below are expressed in terms of
 * them wherever the plan defines an equivalent, so approved/rejected/pending/
 * review can never drift away from success/danger/warning/info.
 */
export const semantic = {
  light: {
    success: '#16A34A',
    'success-subtle': '#DCFCE7',
    warning: '#D97706',
    'warning-subtle': '#FEF3C7',
    danger: '#DC2626',
    'danger-subtle': '#FEE2E2',
    info: '#2563EB',
    'info-subtle': '#DBEAFE',
  },
  dark: {
    success: '#4ADE80',
    'success-subtle': '#14532D',
    warning: '#FCD34D',
    'warning-subtle': '#451A03',
    danger: '#F87171',
    'danger-subtle': '#450A0A',
    info: '#60A5FA',
    'info-subtle': '#1E3A5F',
  },
};

/**
 * Status hues, per theme. The plan defines four semantic colours and the
 * moderation flow has six states, so four of them map straight across and two
 * are filled in from the neutral/rose scales:
 *
 *   approved -> success      rejected -> danger
 *   pending  -> warning      review   -> info
 *   draft    -> slate-500 (light) / slate-400 (dark). Deliberately neutral: an
 *               unsubmitted profile is not a state worth colouring.
 *   changes  -> orange, unchanged from the previous system. "Changes requested"
 *               sits between `review` and `rejected`, so it needs a hue distinct
 *               from both, and the plan's four-colour set has no room for one.
 */
export const status = {
  light: {
    draft: slate[500],
    pending: semantic.light.warning,
    review: semantic.light.info,
    approved: semantic.light.success,
    rejected: semantic.light.danger,
    changes: '#C2410C', // orange-700
  },
  dark: {
    draft: slate[400],
    pending: semantic.dark.warning,
    review: semantic.dark.info,
    approved: semantic.dark.success,
    rejected: semantic.dark.danger,
    changes: '#FB923C', // orange-400
  },
};

/** Status chip backgrounds, per theme. */
export const statusBg = {
  light: {
    draft: slate[100],
    pending: semantic.light['warning-subtle'],
    review: semantic.light['info-subtle'],
    approved: semantic.light['success-subtle'],
    rejected: semantic.light['danger-subtle'],
    changes: '#FFEDD5', // orange-50
  },
  dark: {
    // The plan gives dark chips an opaque fill, which cannot carry a hue that
    // also has to work as text. A 14% tint of the chip hue reads identically on
    // both dark surfaces and keeps the hue legible.
    draft: 'rgba(148, 163, 184, 0.14)', // slate-400
    pending: semantic.dark['warning-subtle'],
    review: semantic.dark['info-subtle'],
    approved: semantic.dark['success-subtle'],
    rejected: semantic.dark['danger-subtle'],
    changes: 'rgba(251, 146, 60, 0.14)', // orange-400
  },
};

/**
 * Ranking medal fills, for a circle carrying the place number in `on-primary`.
 *
 * Theme-invariant, like `on-primary`, because a medal is a medal in both themes.
 * The plan does not define medal colours; the previous AA-validated pair is kept
 * because a medal has to be dark enough for the number on it to be readable,
 * which is the same constraint that produced `statusSolid`. Gold and bronze sit
 * two steps apart rather than one, and second place stays on
 * `surface-inset`/`ink`, which was already silver.
 */
export const award = {
  gold: '#B45309', // 5.02:1 with white
  bronze: '#92400E', // 7.09:1 with white
};

/**
 * Status colours for a *solid fill* carrying `on-primary` text.
 *
 * `status` above is the badge/border/text hue, and the dark theme brightens it
 * so it reads on a near-black surface. That is correct for `.badge-approved` and
 * wrong for `bg-status-approved text-on-primary`: the dark palette's brighter
 * values clear only ~1.7–2.8:1 against white, so a solid button would go
 * effectively invisible.
 *
 * These values are theme-invariant, for the same reason `on-primary` is: a
 * solid chip stays a solid chip. Each clears 4.5:1 with white in both themes,
 * which the `contrast` table at the bottom asserts so the pair cannot rot.
 *
 * Use `status-*` for text, borders and soft backgrounds. Use `status-solid-*`
 * only where the status colour is itself a fill.
 */
export const statusSolid = {
  draft: slate[600], // 7.58:1 — the light-theme `draft` is too pale
  pending: '#B45309', // amber-700, 5.02:1 — the plan's warning-500 is 3.9:1
  review: semantic.light.info, // 5.17:1
  approved: '#047857', // emerald-700, 5.48:1 — the plan's success-600 is 3.13:1
  rejected: red[700], // 6.28:1
  changes: '#C2410C', // 5.18:1
};

/* ── Semantic themes ────────────────────────────────────────────────────── */

/**
 * The light theme is the default. `dark` is a real, first-class theme here,
 * not a set of `!important` overrides bolted on top of light-mode utility
 * classes: every token below has a hand-picked dark value.
 */
const lightTheme = {
  canvas: slate[50],
  surface: '#FFFFFF',
  'surface-raised': '#FFFFFF', // --color-bg-elevated
  'surface-sunken': slate[100], // --color-bg-subtle
  'surface-inset': slate[200], // --color-bg-inset
  'surface-inverse': slate[900],

  border: slate[200],
  'border-strong': slate[300],
  'border-brand': red[600],
  'border-inverse': slate[700],

  text: slate[900], // 17.28:1 on canvas
  'text-secondary': slate[600], // 7.58:1
  // ── AA deviation from the plan's §4.1 light table ─────────────────────────
  // Plan value: slate-400 #94A3B8, 2.56:1 on white. Chosen: slate-500 #64748B,
  // 4.76:1 on `--surface`. The plan's role for this token is "captions,
  // timestamps", which is body-sized text, so WCAG 1.4.3 applies and 4.5:1 is
  // the floor — the 1.4.11 non-text exemption that lets a hairline border sit
  // at 1.4:1 does not cover it. §3.4 makes AA non-negotiable, so where §3.4
  // and the §4.1 value table disagree, the table yields.
  'text-muted': slate[500], // 4.76:1 — captions, timestamps, meta
  'text-disabled': slate[300], // WCAG 1.4.3 exempts disabled controls
  'text-inverse': '#FFFFFF',
  'text-brand': red[600], // 4.70:1 — never red-500 for body-size text

  brand: red[600], // solid fill
  'brand-hover': red[700],
  'brand-active': red[800],
  'brand-soft': red[100], // tinted background
  'brand-soft-text': red[700],
  'brand-ring': red[500],

  // The plan has no accent. It inherits the old role — the dark, high-contrast
  // anchor that used to be ELITE navy — which is now the primary text colour.
  accent: slate[900],
  'accent-hover': slate[800],

  // Text on a solid brand/accent/status fill. White in BOTH themes: a solid
  // chip stays a solid chip, only `surface-inverse` flips.
  'on-primary': '#FFFFFF',

  focus: red[600], // 4.49:1 against canvas — non-text contrast needs 3:1
  'overlay-scrim': 'rgba(15, 23, 42, 0.44)',

  success: semantic.light.success,
  'success-subtle': semantic.light['success-subtle'],
  warning: semantic.light.warning,
  'warning-subtle': semantic.light['warning-subtle'],
  danger: semantic.light.danger,
  'danger-subtle': semantic.light['danger-subtle'],
  info: semantic.light.info,
  'info-subtle': semantic.light['info-subtle'],

  statusDraft: status.light.draft,
  statusPending: status.light.pending,
  statusReview: status.light.review,
  statusApproved: status.light.approved,
  statusRejected: status.light.rejected,
  statusChanges: status.light.changes,
  statusDraftBg: statusBg.light.draft,
  statusPendingBg: statusBg.light.pending,
  statusReviewBg: statusBg.light.review,
  statusApprovedBg: statusBg.light.approved,
  statusRejectedBg: statusBg.light.rejected,
  statusChangesBg: statusBg.light.changes,

  awardGold: award.gold,
  awardBronze: award.bronze,

  statusDraftSolid: statusSolid.draft,
  statusPendingSolid: statusSolid.pending,
  statusReviewSolid: statusSolid.review,
  statusApprovedSolid: statusSolid.approved,
  statusRejectedSolid: statusSolid.rejected,
  statusChangesSolid: statusSolid.changes,
};

const darkTheme = {
  canvas: slate[950],
  surface: slate[900],
  'surface-raised': slate[800], // --color-bg-elevated
  'surface-sunken': slate[950], // --color-bg-subtle; darker than `surface`
  'surface-inset': slate[700], // --color-bg-inset
  'surface-inverse': '#FFFFFF',

  border: slate[800],
  'border-strong': slate[700],
  'border-brand': red[500],
  'border-inverse': slate[300],

  text: slate[50], // 19.48:1 on canvas
  'text-secondary': slate[400], // 6.96:1
  // ── AA deviation from the plan's §4.1 dark table ──────────────────────────
  // Plan value: slate-600 #475569, 2.36:1 on `--surface` and 1.93:1 on
  // `--surface-raised` — effectively invisible on a card. Chosen: slate-400
  // #94A3B8, 6.96:1 on `--surface` and 5.71:1 on `--surface-raised`. Same
  // reason as the light theme: captions and timestamps are real text, so
  // §3.4's 4.5:1 floor governs and the §4.1 value yields.
  //
  // This lands on the same step as `text-secondary`, and that is the honest
  // consequence: once a token has to clear 4.5:1 on `--surface-raised`
  // (slate-800) there is no quieter slate step left between it and slate-900
  // body text. In dark mode the muted/secondary hierarchy is carried by size and
  // weight, not by a lighter grey. Fixing that properly means a new hue in the
  // ramp, which is a later batch, not something to fake here.
  'text-muted': slate[400], // 6.96:1 on surface, 5.71:1 on surface-raised
  'text-disabled': slate[700],
  'text-inverse': slate[900],
  'text-brand': red[400], // 6.4:1 on the dark canvas

  // ── AA deviation from the plan's §4.1 dark table ──────────────────────────
  // Plan value: red-500 #F43F5E. White on it is 3.67:1, which fails the 4.5:1
  // body-text floor — and a solid brand button is exactly a white label on
  // this fill, so it is a text pair, not a decorative one. Chosen: red-600
  // #E11D48, which puts white at 4.70:1 and matches the light theme's brand.
  // `border-brand`, `focus` and `brand-ring` stay red-500 below: they are
  // non-text indicators under WCAG 1.4.11, they need only 3:1, and the plan
  // names red-500 for the dark `border-brand` precisely because the brighter
  // red reads best on a near-black surface.
  brand: red[600], // solid fill — white on it is 4.70:1
  'brand-hover': red[400], // lighter, per the plan's dark hover direction
  // The plan's dark `brand-active` is red-600, which is now the resting brand
  // fill itself, so keeping it would make the press state invisible. Same
  // direction the plan uses (darken on press, from a fill lighter than the
  // hover step), one step further along: red-700.
  'brand-active': red[700],
  'brand-soft': red[950], // tinted background
  'brand-soft-text': red[300],
  'brand-ring': red[500],

  accent: slate[50],
  'accent-hover': '#FFFFFF',

  // Declared in both themes even though the value is identical, so the
  // `on-primary` pairing is checkable against each theme independently.
  'on-primary': '#FFFFFF',

  focus: red[500], // 5.48:1 against canvas — non-text contrast needs 3:1
  'overlay-scrim': 'rgba(2, 6, 23, 0.66)',

  success: semantic.dark.success,
  'success-subtle': semantic.dark['success-subtle'],
  warning: semantic.dark.warning,
  'warning-subtle': semantic.dark['warning-subtle'],
  danger: semantic.dark.danger,
  'danger-subtle': semantic.dark['danger-subtle'],
  info: semantic.dark.info,
  'info-subtle': semantic.dark['info-subtle'],

  statusDraft: status.dark.draft,
  statusPending: status.dark.pending,
  statusReview: status.dark.review,
  statusApproved: status.dark.approved,
  statusRejected: status.dark.rejected,
  statusChanges: status.dark.changes,
  awardGold: award.gold,
  awardBronze: award.bronze,

  // The solid fills do NOT brighten with the badge hues, for the same reason
  // `on-primary` does not: they carry white text in both themes.
  statusDraftSolid: statusSolid.draft,
  statusPendingSolid: statusSolid.pending,
  statusReviewSolid: statusSolid.review,
  statusApprovedSolid: statusSolid.approved,
  statusRejectedSolid: statusSolid.rejected,
  statusChangesSolid: statusSolid.changes,
  statusDraftBg: statusBg.dark.draft,
  statusPendingBg: statusBg.dark.pending,
  statusReviewBg: statusBg.dark.review,
  statusApprovedBg: statusBg.dark.approved,
  statusRejectedBg: statusBg.dark.rejected,
  statusChangesBg: statusBg.dark.changes,
};

/**
 * The plan's own spelling of the semantic tokens (REDESIGN_PLAN §4.1, §7.1 and
 * Appendix A): `--color-bg-base`, `--color-text-primary`, `--color-brand`, and
 * so on. Every one of them is emitted alongside the app-facing name above and
 * resolves to the SAME value, so the two vocabularies cannot drift.
 *
 * `tokens.mjs` -> `kebab()` in `tools/build-tokens.mjs` leaves an already-kebab
 * key untouched, so these strings are written as the final variable name.
 */
const planNames = {
  'color-bg-base': 'canvas',
  'color-bg-surface': 'surface',
  'color-bg-elevated': 'surface-raised',
  'color-bg-subtle': 'surface-sunken',
  'color-bg-inset': 'surface-inset',
  'color-border-base': 'border',
  'color-border-strong': 'border-strong',
  'color-border-brand': 'border-brand',
  'color-text-primary': 'text',
  'color-text-secondary': 'text-secondary',
  'color-text-muted': 'text-muted',
  'color-text-disabled': 'text-disabled',
  'color-text-on-brand': 'on-primary',
  'color-brand': 'brand',
  'color-brand-hover': 'brand-hover',
  'color-brand-active': 'brand-active',
  'color-brand-subtle': 'brand-soft',
  'color-success': 'success',
  'color-success-subtle': 'success-subtle',
  'color-warning': 'warning',
  'color-warning-subtle': 'warning-subtle',
  'color-danger': 'danger',
  'color-danger-subtle': 'danger-subtle',
  'color-info': 'info',
  'color-info-subtle': 'info-subtle',
};

const withPlanNames = (theme) => ({
  ...theme,
  ...Object.fromEntries(
    Object.entries(planNames).map(([cssName, key]) => [cssName, theme[key]]),
  ),
});

export const light = withPlanNames(lightTheme);
export const dark = withPlanNames(darkTheme);

/* ── Non-colour scales ──────────────────────────────────────────────────── */

/**
 * The four-font system (REDESIGN_PLAN §4.2). Each family has exactly one role
 * and is never used outside it. `web/index.html` loads all four from the Google
 * Fonts CDN with `display=swap`; the stacks below carry system fallbacks in
 * case that request fails.
 */
export const font = {
  /** Display — Playfair Display. Hero headings, page titles. Never below 3xl. */
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  /** Alias of `display`, matching the pre-redesign `font-heading` utility. */
  heading: "'Playfair Display', Georgia, 'Times New Roman', serif",
  /** Body — Inter. All running text, form values, captions. */
  body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  /** Alias of `body`, matching the pre-redesign `font-sans` utility. */
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  /** UI — DM Sans. Nav labels, buttons, form labels, badges, tab labels. */
  ui: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  /** Mono — JetBrains Mono. Roll numbers, code, audit timestamps. */
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
};

/**
 * The plan's type scale (REDESIGN_PLAN §4.2, "Type Scale"). Every step carries
 * the size, line-height, letter-spacing AND the font role the plan assigns to
 * that step, so a step and its family can never be read from two different
 * tables.
 *
 * The family is enforced as a generated `text-*` utility in
 * `shared/tokens.css` (see `tools/build-tokens.mjs`), because Tailwind's
 * `fontSize` extension only emits `font-size`, `line-height`, `letter-spacing`
 * and `font-weight` — it silently drops a `fontFamily` key. An explicit
 * `font-display` / `font-ui` / `font-body` / `font-mono` on the element still
 * wins, because those utilities are emitted after this one.
 *
 * Playfair Display starts at `3xl` (30px) and is used nowhere below it. That is
 * the plan's own rule — "never used below `text-3xl`" — and it is why `xl` and
 * `2xl` are DM Sans and not Playfair: they are card and section headings, not
 * display type. `sm` is listed by the plan as "DM Sans / Inter"; it resolves to
 * DM Sans here, because at 14px it is always a label or a caption and never
 * running body copy (`base` and `lg` carry Inter for that).
 */
export const typeScale = {
  xs: { size: '0.75rem', lineHeight: '18px', letterSpacing: '0.025em', family: 'ui' },
  sm: { size: '0.875rem', lineHeight: '21px', letterSpacing: '0.01em', family: 'ui' },
  base: { size: '1rem', lineHeight: '25.6px', letterSpacing: '0', family: 'body' },
  lg: { size: '1.125rem', lineHeight: '27.9px', letterSpacing: '-0.01em', family: 'body' },
  xl: { size: '1.25rem', lineHeight: '28px', letterSpacing: '-0.015em', family: 'ui' },
  '2xl': { size: '1.5rem', lineHeight: '32.4px', letterSpacing: '-0.02em', family: 'ui' },
  '3xl': { size: '1.875rem', lineHeight: '39px', letterSpacing: '-0.025em', family: 'display' },
  '4xl': { size: '2.25rem', lineHeight: '45px', letterSpacing: '-0.03em', family: 'display' },
  '5xl': { size: '3rem', lineHeight: '57.6px', letterSpacing: '-0.035em', family: 'display' },
  '6xl': { size: '3.75rem', lineHeight: '69px', letterSpacing: '-0.04em', family: 'display' },
  '7xl': { size: '4.5rem', lineHeight: '79.2px', letterSpacing: '-0.045em', family: 'display' },
  '8xl': { size: '6rem', lineHeight: '1.05', letterSpacing: '-0.05em', family: 'display' },
  '9xl': { size: '8rem', lineHeight: '1', letterSpacing: '-0.055em', family: 'display' },
};

/**
 * The named `text-headline-*` / `text-body-*` scale, mapped onto the plan's
 * `text-*` steps above. It is ~200 files' worth of existing class names, so it
 * is re-pointed rather than deleted — deleting it would break every call site
 * in both apps. Each entry below is the plan step it now borrows from:
 *
 *   headline-xl        -> 4xl   (36px, Playfair — the plan's "page titles")
 *   headline-xl-mobile -> 3xl   (28px companion of the same page title)
 *   headline-lg        -> 3xl   (28px companion of the same page title)
 *   headline-lg-mobile -> 2xl   (22px companion)
 *   headline-md        -> xl    (20px — the plan's "card headings", DM Sans 600)
 *   headline-sm        -> base  (16px)
 *   body-lg            -> base  (16px)
 *   body-md            -> sm    (14px)
 *   label-lg           -> sm    (14px)
 *   label-md           -> xs    (12px)
 *   body-sm / label-sm / data-mono have no plan step (13px, 11px, 13px) and
 *   keep their own metrics; they are legacy steps a page drops when it adopts
 *   the plan's scale.
 *
 * `headline-xl-mobile` and `headline-lg` were Playfair before this batch, on a
 * ">= 28px" threshold. That threshold is not the plan's: the plan says Playfair
 * is never used below `text-3xl` (30px) and hands `xl` / `2xl` to DM Sans, so
 * both 28px steps are UI type now. `headline-xl` at 36px is a page title, which
 * is the plan's explicit Playfair use case, and keeps it.
 *
 * `fontWeight` is a separate axis: the plan's Font Weight Meaning Guide keeps
 * these semantic (600 = interactive, 700 = primary heading), so the weights are
 * preserved while the sizes, line-heights and letter-spacings move onto the
 * plan's steps.
 */
export const namedType = {
  'headline-xl': { size: '36px', lineHeight: '45px', letterSpacing: '-0.03em', fontWeight: '700', family: 'display' },
  'headline-xl-mobile': { size: '28px', lineHeight: '36px', letterSpacing: '-0.025em', fontWeight: '700', family: 'ui' },
  'headline-lg': { size: '28px', lineHeight: '36px', letterSpacing: '-0.025em', fontWeight: '600', family: 'ui' },
  'headline-lg-mobile': { size: '22px', lineHeight: '30px', letterSpacing: '-0.02em', fontWeight: '600', family: 'ui' },
  'headline-md': { size: '20px', lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600', family: 'ui' },
  'headline-sm': { size: '16px', lineHeight: '25.6px', letterSpacing: '0', fontWeight: '600', family: 'ui' },
  'body-lg': { size: '16px', lineHeight: '25.6px', letterSpacing: '0', fontWeight: '400', family: 'body' },
  'body-md': { size: '14px', lineHeight: '21px', letterSpacing: '0.01em', fontWeight: '400', family: 'body' },
  // No plan step: 13px body copy.
  'body-sm': { size: '13px', lineHeight: '20px', letterSpacing: '0', fontWeight: '400', family: 'body' },
  'body-xs': { size: '11px', lineHeight: '16px', letterSpacing: '0', fontWeight: '400', family: 'body' },
  'label-lg': { size: '14px', lineHeight: '21px', letterSpacing: '0.01em', fontWeight: '500', family: 'ui' },
  'label-md': { size: '12px', lineHeight: '18px', letterSpacing: '0.025em', fontWeight: '500', family: 'ui' },
  // No plan step: 11px tracked uppercase labels.
  'label-sm': { size: '11px', lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600', family: 'ui' },
  'label-xs': { size: '10px', lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600', family: 'ui' },
  // No plan step: 13px identifiers in JetBrains Mono.
  'data-mono': { size: '13px', lineHeight: '18px', letterSpacing: '0', fontWeight: '400', family: 'mono' },
};

export const radius = {
  none: '0',
  sm: '4px', // badges, tags, small inline elements
  DEFAULT: '6px', // small buttons, chips
  md: '8px', // inputs, small cards, buttons — the plan's default control radius
  lg: '12px', // cards (default), dropdowns
  xl: '16px', // modal dialogs, large cards
  '2xl': '20px', // feature cards, bento grid items, bottom sheets
  '3xl': '24px', // profile cover image corners
  full: '9999px', // avatars, icon buttons, pills
};

/**
 * Motion. `MOTION_INTENSITY: 3` — hover, press and state feedback only. No
 * scroll choreography, no parallax, no looping ambient animation. Every
 * duration below collapses to 0 under `prefers-reduced-motion: reduce` via the
 * global block in tokens.css, so nothing here needs a JS guard.
 *
 * The durations and easings are the plan's own (§4.7 "Duration Tokens" and
 * "Easing Tokens", restated in Appendix A / Appendix B). The alias block at the
 * bottom maps the four duration names and four easing names that the generated
 * CSS and the Tailwind config already read onto the plan's steps, so nothing
 * reads a value that is not in the plan and nothing has to be renamed at every
 * call site.
 */
const durations = {
  'dur-instant': '0ms',
  'dur-fast': '100ms',
  'dur-quick': '150ms',
  'dur-normal': '200ms',
  'dur-moderate': '300ms',
  'dur-slow': '400ms',
  'dur-deliberate': '500ms',
  'dur-lazy': '700ms',
  'dur-story': '1000ms',
};

const easings = {
  'ease-linear': 'linear',
  'ease-out': 'cubic-bezier(0, 0, 0.2, 1)', // decelerating — entrances
  'ease-in': 'cubic-bezier(0.4, 0, 1, 1)', // accelerating — exits
  'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)', // symmetric — movement
  'ease-gentle': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // smooth, premium
};

export const motion = {
  ...durations,
  ...easings,
  // Pre-plan names, still read by the generated component layer and the
  // Tailwind config. Each one is a pointer at a plan step, not a second value.
  'dur-base': durations['dur-normal'],
  'dur-slower': durations['dur-slow'],
  'ease-standard': easings['ease-in-out'],
  'ease-entrance': easings['ease-out'],
  'ease-exit': easings['ease-in'],
  'ease-press': easings['ease-gentle'],
};

/**
 * Layer scale. Use these instead of arbitrary `z-[60]`. Documented so a new
 * surface knows which slot to take rather than inventing a number.
 */
export const layer = {
  base: '0',
  raised: '10', // sticky table headers, dropdowns
  sticky: '20', // app header, sidebar
  overlay: '30', // drawer scrim
  modal: '40', // dialog + its scrim
  toast: '50',
  'skip-link': '60', // must beat everything, it is the a11y escape hatch
};

/**
 * Elevation, from the plan's own scale (REDESIGN_PLAN §4.5, restated in
 * Appendix B). Named `xs`…`2xl` rather than by role, because that is the scale
 * the plan and every component snippet in it are written against.
 *
 * The pre-plan names are kept as aliases onto the nearest step, because
 * `shadow-card` / `shadow-modal` and friends are already in use across both
 * apps and `tools/build-tokens.mjs` reads them in the component layer:
 *
 *   card -> sm (cards, default)      raised -> lg (dropdowns, modals)
 *   card-hover -> md (cards, hover)  drawer -> xl (bottom sheets, drawers)
 *   modal -> 2xl (full-screen modals)
 */
const planShadows = {
  xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
  sm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
  brand: '0 4px 14px 0 rgba(225,29,72,0.35)',
  inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
  // Not in the plan's scale and deliberately not aliased onto one: the focus
  // glow a focused input reads. Every plan step is a cast shadow that falls
  // away from the element, and a ring has to hug the border instead.
  focus: '0 0 0 3px rgba(225, 29, 72, 0.35)',
};

const shadowAliases = (steps) => ({
  card: steps.sm,
  'card-hover': steps.md,
  raised: steps.lg,
  drawer: steps.xl,
  modal: steps['2xl'],
});

export const shadow = { ...planShadows, ...shadowAliases(planShadows) };

/**
 * The plan's dark elevation table (§4.5, "Dark Mode Shadows"). Elevation in
 * dark is carried mainly by surface lightness, so only four steps change; the
 * rest stay theme-invariant and ride along so every `--shadow-*` name resolves
 * in both themes.
 */
const darkShadows = {
  ...planShadows,
  sm: '0 1px 3px 0 rgba(0,0,0,0.3)',
  md: '0 4px 6px -1px rgba(0,0,0,0.4)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.5)',
  brand: '0 4px 14px 0 rgba(244,63,94,0.4)',
};

export const shadowDark = { ...darkShadows, ...shadowAliases(darkShadows) };

/* ── Brand metadata ────────────────────────────────────────────────────── */

/**
 * Used for the generated CSS header, the manifest, the document titles and the
 * login pages, so the institution's name is spelled in exactly one place.
 */
export const brand = {
  name: 'ELITE',
  full: 'ELITE Student Portal',
  institution: 'SASI Institute of Technology and Engineering',
  institutionShort: 'SASI',
  department: 'Department of Information Technology',
  domain: 'sasi.ac.in',
  /** The ELITE red anchor the `red` ramp is derived from. */
  primary: '#C41230',
  /**
   * The dark anchor. It was ELITE navy `#041030`; the palette is monochromatic
   * now, so the accent role is carried by a slate step (see `accent` in each
   * theme) and this is metadata only.
   */
  accent: '#0F172A',
};

/* ── Contrast reference ─────────────────────────────────────────────────── */

/**
 * Every pair the UI is allowed to put on screen, with its floor.
 * `tools/check-contrast.mjs` re-derives these from the same values and fails the
 * build if one drops below its floor, so this table cannot rot.
 *
 * **A floor is a claim, not a target.** Every row below 4.5 is either a genuine
 * WCAG exemption, or a bug that got papered over by lowering the number — and
 * the second kind is not allowed here. The rule:
 *
 *   - A *text* pair floors at 4.5:1 (WCAG 1.4.3). Captions and timestamps are
 *     body-sized text, not decoration; there is no "metadata" exemption.
 *     `--color-text-disabled` is the one text token that appears nowhere below,
 *     because 1.4.3 exempts disabled controls outright.
 *   - A *non-text* pair — a border, a focus ring, anything that identifies a
 *     control or its state — floors at 3:1 (WCAG 1.4.11).
 *   - `border-strong` is the one pair below even that, at ~1.4:1. It is a
 *     decorative divider with no state attached, which 1.4.11 does not cover;
 *     the floor is recorded as the measured ratio so a future change that
 *     pushes it lower still fails here. Raising it means moving `border-strong`
 *     a step darker, which is a visual decision, not a token one.
 *
 * Three values in this file exist because a floor could not be met with the
 * plan's value; each is commented where it is defined, with the plan value, the
 * value chosen instead, and the measured ratio:
 *
 *   - light `--text-muted`: plan slate-400 (2.56:1) -> slate-500 (4.76:1)
 *   - dark  `--text-muted`: plan slate-600 (2.36:1 on surface, 1.93:1 on
 *     surface-raised) -> slate-400 (6.96:1 / 5.71:1)
 *   - dark  `--color-brand`: plan red-500 (3.67:1 with white) -> red-600
 *     (4.70:1 with white)
 *
 * Restoring any of the plan values requires lowering the matching row below
 * 4.5 again, which is the thing this table exists to prevent. §3.4 governs.
 */
export const contrast = [
  { fg: 'light.text', bg: 'light.canvas', min: 4.5 },
  { fg: 'light.text', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-secondary', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-muted', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-brand', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-inverse', bg: 'light.brand', min: 4.5 },
  { fg: 'light.text-inverse', bg: 'light.surface-inverse', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.danger', min: 4.5 },
  // `brand-soft-text` is the token paired with `brand-soft`, NOT `text-brand`.
  // The soft chip is a pale pink in light and a dark maroon in dark, so the two
  // themes need opposite ends of the ramp.
  { fg: 'light.brand-soft-text', bg: 'light.brand-soft', min: 4.5 },
  { fg: 'light.focus', bg: 'light.canvas', min: 3 },
  { fg: 'dark.text', bg: 'dark.canvas', min: 4.5 },
  { fg: 'dark.text', bg: 'dark.surface', min: 4.5 },
  { fg: 'dark.text-secondary', bg: 'dark.surface', min: 4.5 },
  { fg: 'dark.text-muted', bg: 'dark.surface', min: 4.5 },
  { fg: 'dark.text', bg: 'dark.surface-raised', min: 4.5 },
  { fg: 'dark.text-muted', bg: 'dark.surface-raised', min: 4.5 },
  // A solid brand chip keeps white text in BOTH themes; it is `surface-inverse`
  // that flips (white chip on a dark page).
  { fg: 'dark.text-inverse', bg: 'dark.surface-inverse', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.brand', min: 4.5 },
  { fg: 'dark.brand-soft-text', bg: 'dark.brand-soft', min: 4.5 },
  { fg: 'dark.focus', bg: 'dark.canvas', min: 3 },
  // Non-text UI contrast (WCAG 1.4.11) for borders that carry meaning. The two
  // `border-brand` rows clear 3:1 comfortably: dark keeps red-500 (#F43F5E),
  // which is the plan's own dark `border-brand` value and the brightest step
  // that still reads as red on a near-black surface. `border-strong` is the
  // documented exception above.
  { fg: 'light.border-strong', bg: 'light.canvas', min: 1.4 },
  { fg: 'light.border-brand', bg: 'light.canvas', min: 3 },
  { fg: 'dark.border-strong', bg: 'dark.surface', min: 1.4 },
  { fg: 'dark.border-brand', bg: 'dark.surface', min: 3 },
  // `on-primary` on every solid status fill, in both themes. These are the
  // pairs that were missing: 18 call sites use `bg-status-solid-* text-on-primary`
  // and the dark-theme badge hues put them at 1.67:1. `status-solid-*` exists to
  // satisfy exactly these rows, so a future edit that changes one value fails
  // here rather than shipping an invisible button.
  { fg: 'light.on-primary', bg: 'light.statusApprovedSolid', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.statusRejectedSolid', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.statusPendingSolid', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.statusReviewSolid', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.statusChangesSolid', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.statusDraftSolid', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.awardGold', min: 4.5 },
  { fg: 'light.on-primary', bg: 'light.awardBronze', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.statusApprovedSolid', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.statusRejectedSolid', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.statusPendingSolid', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.statusReviewSolid', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.statusChangesSolid', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.statusDraftSolid', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.awardGold', min: 4.5 },
  { fg: 'dark.on-primary', bg: 'dark.awardBronze', min: 4.5 },
];

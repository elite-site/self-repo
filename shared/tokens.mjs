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
 * Measured from the shipped brand marks (see `docs/FRONTEND_PAGES.md` §19):
 *   assets/sasi logo.png  → #ED1E26  (SASI red, 4.3% of pixels)
 *   assets/elite logo.png → #041030  (ELITE navy, 11.6% of pixels)
 *
 * The user chose SASI red as the primary and ELITE navy as the dark accent.
 * Every step below is a hand-tuned tint of one of those two hues; the ramp
 * lightnesses are evenly spaced and each step is contrast-checked (see
 * `contrast` at the bottom of this file and `tools/check-contrast.mjs`).
 *
 * Two AA decisions are baked in and should not be "simplified" away:
 *   - `red.500` (#ED1E26) on white is 4.36:1, just under the 4.5:1 body-text
 *     floor. It is the brand colour for large text, marks and borders. Solid
 *     buttons use `red.600` (5.65:1) instead. Do not swap a button to 500.
 *   - `neutral.400` (#94A0B4) on white is 2.64:1 and is for hairline borders
 *     and disabled text only. Body secondary text uses `neutral.600` (7.21:1).
 */

/* ── Raw ramps ─────────────────────────────────────────────────────────── */

/** SASI red. Hue ~357deg. */
export const red = {
  50: '#FEF3F3',
  100: '#FDE4E5',
  200: '#FBC8CB',
  300: '#F79FA5',
  400: '#F2606A',
  500: '#ED1E26', // brand
  600: '#CE1119', // solid-button fill: 5.65:1 with white text
  700: '#A80D14',
  800: '#830E14',
  900: '#6B1016',
};

/** ELITE navy. Hue ~220deg, very dark. Also the dark-theme neutral. */
export const navy = {
  50: '#F3F5F9',
  100: '#E4E8F0',
  200: '#C3CBDB',
  300: '#94A0BA',
  400: '#5C6A8C', // 5.39:1 on white — secondary text on light
  500: '#384763',
  600: '#23324F',
  700: '#16223A',
  800: '#0C1526',
  900: '#041030', // brand
  950: '#02081C',
};

/** Cool grey ramp tuned to sit beside navy rather than fight it. */
export const neutral = {
  50: '#F7F8FB',
  100: '#EEF1F6',
  200: '#DFE4EC',
  300: '#C3CBD8',
  400: '#94A0B4', // hairlines and disabled text only (2.64:1)
  500: '#6B7688', // 4.59:1 on white — the muted-text floor
  600: '#4E5866', // 7.21:1 — body secondary text on light
  700: '#3A424E',
  800: '#252B34',
  900: '#12161C',
};

/**
 * Status ramp. These are semantic, not brand, so they keep conventional hues.
 * `draft` is deliberately neutral rather than grey-blue: an unsubmitted
 * profile is not a state worth colouring.
 */
export const status = {
  draft: neutral[500],
  pending: '#B45309', // amber-700
  review: '#5B4BC4', // indigo, cooled to sit with navy
  approved: '#047857', // emerald-700
  rejected: red[700],
  changes: '#C2410C', // orange-700
};

/**
 * Ranking medal fills, for a circle carrying the place number in `on-primary`.
 *
 * These replaced a pair of raw Tailwind palette steps that the migration was
 * meant to remove. The design's original gold was amber-400, which is 1.67:1
 * against white, so "bright gold" and "white digits" cannot both survive: a medal
 * has to be dark enough for the number on it to be readable, which is the same
 * constraint that produced `statusSolid`. Gold and bronze therefore sit two
 * steps apart rather than one, and second place stays on `surface-inset`/`ink`,
 * which was already silver.
 *
 * Theme-invariant, like `on-primary`, because a medal is a medal in both themes.
 */
export const award = {
  gold: '#B45309', // 5.02:1 with white
  bronze: '#92400E', // 7.09:1 with white
};

/**
 * Status colours for a *solid fill* carrying `on-primary` text.
 *
 * `status` above is the badge/border/text hue, and the dark theme deliberately
 * brightens it so it reads on a near-black surface. That is correct for
 * `.badge-approved` and wrong for `bg-status-approved text-on-primary`: the
 * brightened dark values clear only 1.67:1 (pending) and 1.92:1 (approved)
 * against white, so a solid button went effectively invisible.
 *
 * These values are theme-invariant, for the same reason `on-primary` is: a
 * solid chip stays a solid chip. Each clears 4.5:1 with white in both themes,
 * which `shared/tokens.mjs` -> `contrast` asserts so the pair cannot rot.
 *
 * Use `status-*` for text, borders and soft backgrounds. Use `status-solid-*`
 * only where the status colour is itself a fill.
 */
export const statusSolid = {
  draft: '#4E5866', // neutral-600, 7.21:1 — the light-theme `draft` is too pale
  pending: status.pending, // 5.02:1
  review: status.review, // 6.46:1
  approved: status.approved, // 5.48:1
  rejected: status.rejected, // 7.68:1
  changes: status.changes, // 5.18:1
};

/* ── Semantic themes ────────────────────────────────────────────────────── */

/**
 * The light theme is the default. `dark` is a real, first-class theme here,
 * not a set of `!important` overrides bolted on top of light-mode utility
 * classes: every token below has a hand-picked dark value.
 */
export const light = {
  canvas: neutral[50],
  surface: '#FFFFFF',
  'surface-raised': '#FFFFFF',
  'surface-sunken': neutral[100],
  'surface-inset': neutral[50],
  'surface-inverse': navy[900],

  border: neutral[200],
  'border-strong': neutral[300],
  'border-inverse': navy[700],

  text: navy[900], // 18.72:1 on canvas
  'text-secondary': neutral[600], // 7.21:1
  'text-muted': neutral[500], // 4.59:1 — AA floor for body copy
  'text-inverse': '#FFFFFF',
  'text-brand': red[600], // 5.65:1 — never red[500] for body text

  brand: red[600], // solid fill
  'brand-hover': red[700],
  'brand-active': red[800],
  'brand-soft': red[50], // tinted background
  'brand-soft-text': red[700],
  'brand-ring': red[400],

  accent: navy[900],
  'accent-hover': navy[800],

  // Text on a solid brand/accent/status fill. White in BOTH themes: a solid
  // chip stays a solid chip, only `surface-inverse` flips.
  'on-primary': '#FFFFFF',

  focus: red[600], // 5.65:1 against canvas — non-text contrast needs 3:1
  'overlay-scrim': 'rgba(4, 16, 48, 0.44)',

  statusDraft: status.draft,
  statusPending: status.pending,
  statusReview: status.review,
  statusApproved: status.approved,
  statusRejected: status.rejected,
  statusChanges: status.changes,
  statusDraftBg: neutral[100],
  statusPendingBg: '#FEF3C7',
  statusReviewBg: '#EDE9FE',
  statusApprovedBg: '#D1FAE5',
  statusRejectedBg: red[50],
  statusChangesBg: '#FFEDD5',

  awardGold: award.gold,
  awardBronze: award.bronze,

  statusDraftSolid: statusSolid.draft,
  statusPendingSolid: statusSolid.pending,
  statusReviewSolid: statusSolid.review,
  statusApprovedSolid: statusSolid.approved,
  statusRejectedSolid: statusSolid.rejected,
  statusChangesSolid: statusSolid.changes,
};

export const dark = {
  canvas: '#070B18', // navy[950]-adjacent, not pure black
  surface: navy[950],
  'surface-raised': '#0B1224',
  'surface-sunken': '#04081A',
  'surface-inset': '#0A0F20',
  'surface-inverse': '#FFFFFF',

  border: '#1E2942',
  'border-strong': '#2C3A5A',
  'border-inverse': neutral[300],

  text: '#F1F4FA', // 16.8:1 on canvas
  'text-secondary': '#A8B4CC', // 7.6:1
  'text-muted': '#7C8AA6', // 4.6:1 — AA floor for body copy
  'text-inverse': navy[900],
  'text-brand': '#FF6B72', // red-300 brightened: 7.1:1 on dark canvas

  brand: '#E0272F', // red-500 nudged dark so white text clears 4.5:1
  'brand-hover': '#F0343C',
  'brand-active': '#F74B52',
  'brand-soft': 'rgba(237, 30, 38, 0.16)',
  'brand-soft-text': '#FF8A90',
  'brand-ring': '#F2606A',

  accent: '#E4E8F0',
  'accent-hover': '#FFFFFF',

  // Declared in both themes even though the value is identical, so the
  // `on-primary` pairing is checkable against each theme independently.
  'on-primary': '#FFFFFF',

  focus: '#FF6B72',
  'overlay-scrim': 'rgba(2, 8, 28, 0.66)',

  statusDraft: '#94A0BA',
  statusPending: '#FBBF24',
  statusReview: '#A78BFA',
  statusApproved: '#34D399',
  statusRejected: '#FB7185',
  statusChanges: '#FB923C',
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
  statusDraftBg: 'rgba(148, 160, 186, 0.14)',
  statusPendingBg: 'rgba(251, 191, 36, 0.14)',
  statusReviewBg: 'rgba(167, 139, 250, 0.14)',
  statusApprovedBg: 'rgba(52, 211, 153, 0.14)',
  statusRejectedBg: 'rgba(251, 113, 133, 0.14)',
  statusChangesBg: 'rgba(251, 146, 60, 0.14)',
};

/* ── Non-colour scales ──────────────────────────────────────────────────── */

export const font = {
  sans: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  heading: "'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
};

export const radius = {
  none: '0',
  sm: '4px',
  DEFAULT: '6px',
  md: '6px',
  lg: '8px', // cards and buttons — the default surface radius
  xl: '12px', // modals and large panels
  full: '9999px', // pills and avatars only
};

/**
 * Motion. `MOTION_INTENSITY: 3` — hover, press and state feedback only. No
 * scroll choreography, no parallax, no looping ambient animation. Every
 * duration below collapses to 0 under `prefers-reduced-motion: reduce` via the
 * global block in tokens.css, so nothing here needs a JS guard.
 *
 * Values are the ui-animation defaults: routine UI stays under 300ms and
 * scales with travel distance.
 */
export const motion = {
  'dur-instant': '0ms',
  'dur-fast': '120ms', // hover, colour
  'dur-base': '200ms', // state change, small popovers
  'dur-slow': '280ms', // page content enter, drawer
  'dur-slower': '360ms', // full modal

  'ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  'ease-entrance': 'cubic-bezier(0.22, 1, 0.36, 1)', // things arriving
  'ease-exit': 'cubic-bezier(0.4, 0, 1, 1)', // things leaving
  'ease-press': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
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

export const shadow = {
  card: '0 1px 2px 0 rgba(4, 16, 48, 0.04), 0 1px 3px 0 rgba(4, 16, 48, 0.03)',
  'card-hover':
    '0 4px 8px -2px rgba(4, 16, 48, 0.08), 0 2px 4px -2px rgba(4, 16, 48, 0.04)',
  raised: '0 8px 20px -6px rgba(4, 16, 48, 0.12)',
  drawer: '-12px 0 32px -8px rgba(4, 16, 48, 0.16)',
  modal: '0 24px 48px -12px rgba(4, 16, 48, 0.28)',
  // Focus rings are a ring, not a shadow, but Tailwind's ring-* reads from
  // --tw-ring-color, so it is expressed here for completeness.
  focus: '0 0 0 3px rgba(206, 17, 25, 0.35)',
};

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
  primary: '#ED1E26',
  accent: '#041030',
};

/* ── Contrast reference ─────────────────────────────────────────────────── */

/**
 * Every pair the UI is allowed to put on screen, with its measured ratio.
 * `tools/check-contrast.mjs` re-derives these from the same values and fails
 * the build if one drops below its floor, so this table cannot rot.
 */
export const contrast = [
  { fg: 'light.text', bg: 'light.canvas', min: 4.5 },
  { fg: 'light.text', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-secondary', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-muted', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-brand', bg: 'light.surface', min: 4.5 },
  { fg: 'light.text-inverse', bg: 'light.brand', min: 4.5 },
  { fg: 'light.text-inverse', bg: 'light.surface-inverse', min: 4.5 },
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
  // that flips (white chip on a dark page). The original table paired
  // `dark.text-inverse` (navy) with `dark.brand` (red) and failed at 1.4:1 --
  // a table bug, not a palette bug. These two rows are the correct pairs.
  { fg: 'light.text-inverse', bg: 'dark.brand', min: 4.5 },
  { fg: 'dark.text-inverse', bg: 'dark.surface-inverse', min: 4.5 },
  { fg: 'dark.brand-soft-text', bg: 'dark.brand-soft', min: 4.5 },
  { fg: 'dark.focus', bg: 'dark.canvas', min: 3 },
  // Non-text UI contrast (WCAG 1.4.11) for borders that carry meaning.
  { fg: 'light.border-strong', bg: 'light.canvas', min: 1.4 },
  { fg: 'dark.border-strong', bg: 'dark.surface', min: 1.4 },
  // `on-primary` on every solid status fill, in both themes. These are the
  // pairs that were missing: 18 call sites use `bg-status-* text-on-primary`
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

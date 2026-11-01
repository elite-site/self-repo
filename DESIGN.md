---
name: ELITE Student Portal
description: Placement readiness and engineering excellence dashboard for SASI Institute of Technology and Engineering — IT Department.
colors:
  # ── Primary interactive ─────────────────────────────────────────────────
  brand: "#2563EB"
  brand-hover: "#1D4ED8"
  brand-active: "#1E40AF"
  brand-soft: "#EFF6FF"
  brand-soft-text: "#1D4ED8"
  brand-ring: "#3B82F6"
  # ── Brand anchor (destructive / alerts only) ────────────────────────────
  elite-red: "#E11D48"
  elite-red-soft: "#FFF1F2"
  # ── Surfaces (light) ────────────────────────────────────────────────────
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-raised: "#FFFFFF"
  surface-sunken: "#F1F5F9"
  surface-inset: "#E2E8F0"
  # ── Surfaces (dark) ─────────────────────────────────────────────────────
  canvas-dark: "#020617"
  surface-dark: "#0F172A"
  surface-raised-dark: "#1E293B"
  surface-sunken-dark: "#020617"
  # ── Borders ─────────────────────────────────────────────────────────────
  border: "#E2E8F0"
  border-strong: "#CBD5E1"
  border-brand: "#2563EB"
  # ── Text ────────────────────────────────────────────────────────────────
  ink: "#0F172A"
  ink-secondary: "#475569"
  ink-muted: "#64748B"
  ink-disabled: "#CBD5E1"
  ink-inverse: "#FFFFFF"
  ink-brand: "#2563EB"
  # ── Status ──────────────────────────────────────────────────────────────
  success: "#16A34A"
  success-subtle: "#DCFCE7"
  warning: "#D97706"
  warning-subtle: "#FEF3C7"
  danger: "#DC2626"
  danger-subtle: "#FEE2E2"
  info: "#2563EB"
  info-subtle: "#DBEAFE"
  status-draft: "#64748B"
  status-pending: "#D97706"
  status-review: "#2563EB"
  status-approved: "#16A34A"
  status-rejected: "#DC2626"
  status-changes: "#C2410C"
typography:
  display:
    fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "45px"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "36px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
    letterSpacing: "0.01em"
  label:
    fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0.025em"
rounded:
  none: "0"
  sm: "4px"
  default: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-brand:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "32px"
  badge:
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: ELITE Student Portal

## Overview

**Creative North Star: "The Scholar's Dashboard"**

The ELITE Student Portal is an **Operate-mode** product: every student's job is to check in, track progress, submit work, and stay placement-ready. The design earns trust the same way a well-made engineering notebook does — through precision, clear hierarchy, and zero visual noise. Notion's content composure, Linear's task density, and the tactile honesty of academic record-keeping are its nearest cultural relatives.

The portal separates itself from the category default — a grid of identical widgets on a neutral dashboard — through deliberate hierarchy. One large featured block dominates the top of each page; smaller, varied-height blocks orbit it; a single accent-coloured block draws the eye to the most time-sensitive action. Below that, masonry columns hold repeating cards of staggered heights so a student reads a page the way they read a well-laid out magazine spread: different entry points, natural visual weight, clear path to the next action.

Density is medium. Students use this on a laptop during campus hours and on mobile between classes. The design must read in both contexts with no horizontal scroll and no content hidden behind a gesture. Light mode is the primary scene (daylit labs and classrooms); dark mode is a toggle, not an afterthought.

**Key Characteristics:**
- Asymmetrical hero zone: one large featured block (7–8 of 12 columns) beside smaller supporting blocks, one of which is always accent-tinted.
- Masonry content zone: 3-column desktop, 2-column tablet, 1-column mobile, staggered card heights.
- Royal blue (`#2563EB`) is the sole interactive accent — reserved, not scattered.
- ELITE red (`#E11D48`) is for destructive actions and critical alerts only.
- Every screen declares four states explicitly: loading (skeleton), empty (honest copy + illustration stub), error (message + retry), and populated.
- Motion is one authored entrance per section — stagger fade-up — plus a hover lift on interactive cards. No looping animations.

---

## Colors

The palette is a cool, blue-anchored professional system. Neutral slate grounds every surface; royal blue is the one interactive signal. ELITE red survives only as a destructive-action and critical-alert colour.

### Primary

- **Royal Blue** (`#2563EB`): The portal's single interactive accent. Every clickable element — primary buttons, active nav states, focus rings, links, badge fills — is this colour or a tonal step of it. Its rarity earns its authority; avoid scattering it as decoration.
- **Royal Blue Hover** (`#1D4ED8`): Deeper step for hover and pressed states on brand-coloured surfaces.
- **Royal Blue Active** (`#1E40AF`): Pressed state on brand buttons.
- **Brand Soft** (`#EFF6FF`): Blue-tinted background for hero banners, accent blocks, and notification chips. Pairs with Brand Soft Text (`#1D4ED8`) for legible contrast (5.5:1).

### Secondary

- **ELITE Red** (`#E11D48`): The college's brand anchor. Used exclusively for destructive buttons, critical error states, and the delete badge — never as a decorative accent on new screens.
- **ELITE Red Soft** (`#FFF1F2`): Background for danger badges and alert panels. Text is always the danger semantic token, not the raw red ramp.

### Neutral

- **Midnight Slate** (`#0F172A`): Primary text and dark surface backgrounds. The darkest readable ink.
- **Slate Secondary** (`#475569`): Body text, descriptions, card content. The workhorse reading colour.
- **Slate Muted** (`#64748B`): Labels, timestamps, helper text, placeholders. Cleared at 4.5:1 against white in light mode.
- **Slate Disabled** (`#CBD5E1`): Disabled text only; never use for any active content.
- **Canvas** (`#F8FAFC`): Page background — the lightest surface, slightly cooler than white.
- **Surface** (`#FFFFFF`): Card and component backgrounds in light mode.
- **Surface Sunken** (`#F1F5F9`): Inset panels, code blocks, skeleton bones.
- **Border** (`#E2E8F0`): Default card and input borders. Subtle enough not to compete with content.
- **Border Strong** (`#CBD5E1`): Dividers and emphasized separators inside cards.

### Status

- **Success Green** (`#16A34A` light / `#4ADE80` dark): Approved status, passed checks, complete states.
- **Warning Amber** (`#D97706` light / `#FCD34D` dark): Pending review, upcoming deadline, in-progress.
- **Danger Red** (`#DC2626` light / `#F87171` dark): Rejected, overdue, error, destructive. Distinct from ELITE red; the semantic token, not the brand ramp.
- **Info Blue** (`#2563EB` light / `#60A5FA` dark): Informational chips, review-state badges.

**The One Accent Rule.** The royal blue `#2563EB` appears on ≤10% of any given screen's surface area. Its scarcity is the point: when it appears, a student knows something is interactive or time-sensitive.

**The Red Reservation Rule.** `#E11D48` (ELITE red, the college brand colour) does not appear on interactive brand elements in the student portal. The interactive accent is royal blue. ELITE red is reserved for destructive actions (delete, revoke) and critical alerts only. Violation is not an aesthetic choice — it breaks the distinction between brand identity and danger signal.

---

## Typography

**Display Font:** Playfair Display (with Georgia, Times New Roman, serif fallbacks) — hero headings and page titles at `text-4xl` (36px) and above only.

**Body Font:** Inter (with system-ui, -apple-system, Segoe UI, sans-serif) — running text, descriptions, table content.

**UI / Label Font:** DM Sans (with system-ui, -apple-system, Segoe UI, sans-serif) — buttons, navigation labels, section headers below 3xl, badge text, form labels.

**Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo fallbacks) — roll numbers, code snippets, data identifiers, timestamps in tabular contexts.

**Character:** Playfair Display's editorial authority grounds the hero zone; DM Sans's geometric clarity handles all operational chrome. The contrast between their personalities (serif display vs. clean UI sans) is the one designed moment of visual surprise; everywhere else the system defers to reading.

### Hierarchy

- **Display** (Playfair Display, 700, 36px / 45px lh, −0.03em): Page titles inside hero banners only. Student name on profile hero, "Dashboard", "Learning Hub". Never below `text-4xl`.
- **Headline-LG** (DM Sans, 600, 28px / 36px lh, −0.025em): Section header for the top-level zone on each page. Used once per screen.
- **Title** (DM Sans, 600, 20px / 28px lh, −0.015em): Card headings, widget titles, metric values. The most frequent heading weight.
- **Headline-SM** (DM Sans, 600, 16px / 25.6px lh, 0): Sub-headings inside cards, table column headers, panel labels.
- **Body-LG** (Inter, 400, 16px / 25.6px lh, 0): Long-form descriptions and guidance copy. Minimum body size for any paragraph.
- **Body-MD** (Inter, 400, 14px / 21px lh, +0.01em): Default card body text, table rows, form field values. 65–75ch max line length.
- **Body-SM** (Inter, 400, 13px / 20px lh, 0): Secondary content inside dense cards; never below 13px for body.
- **Label-LG** (DM Sans, 500, 14px / 21px lh, +0.01em): Button labels (medium and large), nav items.
- **Label-MD** (DM Sans, 500, 12px / 18px lh, +0.025em): Badge text, chip labels, form helper text.
- **Label-SM** (DM Sans, 600, 11px / 14px lh, +0.04em): Caption text, timestamps, metric tile labels.

**The Display Ceiling Rule.** Playfair Display is used only at `text-3xl` (30px) and above — this is the plan's hard line. A heading below 30px in Playfair looks decorative, not authoritative. `headline-xl` (36px) is the designed entry point for display type in the student portal.

---

## Layout

The portal uses a **fixed sidebar + scrolling content column** shell. The sidebar rail collapses between 64px (icon-only) and 240px (labelled) without reflowing the content column.

```
[ Sidebar 64px–240px, fixed ]  [ Content column, flex-1, scrolls ]
                                 [ TopBar 56px, sticky ]
                                 [ <main> padded 24px–32px ]
                                   [ Hero Zone ]
                                   [ Masonry Content Zone ]
```

### Hero Zone (asymmetrical grid)

Every page opens with an asymmetrical hero zone using a 12-column grid:

| Slot | Columns | Contents |
|---|---|---|
| Featured block | 7–8 cols | Welcome + key action, page title, primary CTA |
| Accent block | 2–3 cols | Time-sensitive metric or status — always brand-soft tinted |
| Supporting block(s) | 2–3 cols each | Secondary metrics, quick stats |

The featured block is always the left anchor. Accent block is always brand-soft (`#EFF6FF`) background. On tablet (≤1024px), the grid collapses to 2 columns: featured full-width on top, smaller blocks below in a 2-up row. On mobile (≤640px), all blocks stack full-width, featured first.

### Masonry Content Zone

Below the hero zone, repeating content (course cards, submission cards, student directory cards, activity items, info panels) uses a masonry column layout:

| Breakpoint | Columns | Gap |
|---|---|---|
| Desktop (>1024px) | 3 columns | 0 (masonry, no gap — cards butt to each other) |
| Tablet (641–1024px) | 2 columns | 0 |
| Mobile (≤640px) | 1 column | 0 |

Cards have varied heights by design. Never force equal heights in the masonry zone. Equal-height card grids are explicitly rejected as the category default.

### Spacing Rhythm

- **8px base grid.** All spacing values are multiples of 8px.
- **Between page-level sections:** `space-y-6` (24px).
- **Card internal padding:** `p-6` (24px) for large feature cards; `p-4` (16px) for compact metric tiles; `p-5` (20px) for standard content cards.
- **Sidebar rail:** 64px collapsed, 240px expanded.
- **TopBar height:** 56px.
- **Breakpoints:** mobile `≤640px`, tablet `641–1024px`, desktop `>1024px`.

### The No-Horizontal-Scroll Rule.

No page or component causes horizontal overflow at any of the three breakpoints. Tables and wide content scroll inside their own container (`overflow-x: auto` on a wrapper), never the page.

---

## Elevation & Depth

The portal uses **ambient, structural shadows** — not colored halos or neobrutalist offsets. Every shadow is a grey-black with soft blur and meaningful offset, conveying real physical elevation rather than decorative glow.

Surfaces use tonal layering in dark mode (the canvas is darkest, cards one step lighter, raised cards one step lighter still) because dark-mode shadows disappear on near-black backgrounds. Shadow opacity is higher in dark mode to compensate.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only in response to state: hover, elevation change, and fixed-position chrome. A card at rest reads as a sheet on a slightly darker canvas; it lifts on hover.

### Shadow Vocabulary

- **`shadow-xs`** (`0 1px 2px 0 rgba(0,0,0,0.05)`): Subtle separation for inline chips, badges, small helper elements.
- **`shadow-sm` / `shadow-card`** (`0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)`): Default card rest state. The base layer of every content card.
- **`shadow-md` / `shadow-card-hover`** (`0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`): Card hover state. Applied with a Framer Motion `whileHover` so it animates in at 150ms ease-out.
- **`shadow-lg` / `shadow-raised`** (`0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`): Sticky elements, filter bars, the sidebar when overlaying content on mobile.
- **`shadow-xl` / `shadow-drawer`** (`0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`): Drawers, side panels.
- **`shadow-2xl` / `shadow-modal`** (`0 25px 50px -12px rgba(0,0,0,0.25)`): Modals, dialogs, full-screen overlays.
- **`shadow-focus`** (`0 0 0 3px rgba(225,29,72,0.35)`): Focus ring for brand-coloured interactive elements. Uses the focus semantic token (`#2563EB` in light, `#3B82F6` in dark) via `:focus-visible`.

---

## Shapes

The portal uses **smooth, rounded, organic forms**. No sharp 90° corners on any visible surface. The radius scale communicates hierarchy: larger radius = larger or more prominent element.

| Element | Radius Token | Exact Value |
|---|---|---|
| Page-level feature cards, hero banner | `--2xl` | 20px |
| Content cards, metric tiles, stat blocks | `--xl` | 16px |
| Compact cards, dropdowns, tooltips | `--lg` | 12px |
| Inputs, selects, textareas | `--md` | 8px |
| Buttons (all variants) | `--full` | 9999px — pill shape |
| Badges, chips, tags, search bar | `--full` | 9999px |
| Avatars, icon buttons | `--full` | 9999px |
| Progress bar tracks | `--full` | 9999px |
| Modal dialogs | `--2xl` | 20px |
| Bottom sheets (mobile) | `--3xl` top-only | 24px top corners only |
| Active sidebar nav items | `--xl` | 16px |

**The Pill Button Rule.** All interactive buttons use `rounded-full` (9999px), giving them pill silhouettes. This single decision distinguishes the portal's interactive affordances from its purely informational containers (which use `xl` / `2xl`). The contrast is intentional and must not be eroded by mixing in `rounded-lg` buttons.

---

## Components

### Buttons

Clean, pill-shaped, one font family (DM Sans semibold). The press animation is instant (`transition-duration: 0ms` on `:active`) so it feels tactile; the entry hover transition is 100ms ease-standard.

- **Shape:** Pill (9999px radius), minimum 44px height for all interactive sizes.
- **Primary** (`btn-primary`): Royal blue fill (`#2563EB`), white label, `shadow-card` at rest. Hover: `#1D4ED8`. Active: `#1E40AF`. Loading: spinner replaces icon, `aria-busy="true"`, pointer-events disabled.
- **Secondary** (`btn-secondary`): White / surface background, `ink` text, 1px `border` border. Hover: `surface-sunken` background, `border-strong` border.
- **Ghost** (`btn-ghost`): Transparent background, `ink-secondary` text. Hover: `surface-sunken` background, `ink` text. Used for low-emphasis actions adjacent to a primary button.
- **Danger** (`btn-danger`): `status-rejected` fill, white label. Used only for delete, revoke, and irreversible actions.
- **Icon-only:** Square pill, same heights as labelled buttons. Requires `aria-label`; Lucide icon at 16px (sm) or 20px (md/lg), `aria-hidden="true"`.
- **Sizes:** sm (32px h, 12px pad), md (40px h, 16px pad), lg (48px h, 20px pad).
- **Disabled:** `opacity-50`, `cursor-not-allowed`, `pointer-events-none`. Never change colour to communicate disabled; use opacity only.

### Cards / Containers

The portal's primary content unit. Motion is handled by Framer Motion with `useReducedMotion()` gate.

- **Default** (`card-default`): White surface, `border-edge` 1px border, `shadow-sm`, `rounded-xl` (16px), `p-6`.
- **Elevated** (`card-elevated`): White surface, transparent border (prevents reflow on variant swap), `shadow-md`, `rounded-xl`.
- **Ghost** (`card-ghost`): Transparent background, `border-edge` border. For low-contrast grouping.
- **Brand** (`card-brand`): `brand-soft` (`#EFF6FF`) background, `border-brand` border, `rounded-2xl` (20px), `p-8`. Used for hero banners and accent blocks.
- **Interactive** (`card-interactive`): Same as default at rest; lifts to `shadow-md` and `translateY(-2px)` on hover (150ms ease-out). Keyboard accessible via `role="button"`, `tabIndex=0`, Enter/Space handling.

### MetricTile

The portal's compact stat surface. Used in the hero zone's supporting blocks and in dedicated metric rows.

- **Structure:** `rounded-xl` card, `p-4`, flex-column. Icon (Lucide, 16px, `ink-brand` colour, `aria-hidden`) + label (`label-sm`, `ink-muted`) + animated numeric value (`title`, `ink`, `tabular-nums`, count-up animation on mount) + optional sub-label.
- **Hover (when linked):** `card-interactive` lift behaviour.
- **Skeleton state:** Full card replaced by `skeleton` class (pulse animation, `surface-sunken` background).

### Badge / Status Chip

Pill (9999px), 12px font, DM Sans semibold. Uses semantic `status-*` background and text tokens; never the raw ramp.

| State | Background | Text |
|---|---|---|
| Draft | `status-draft-bg` | `status-draft` |
| Pending | `status-pending-bg` | `status-pending` |
| Review | `status-review-bg` | `status-review` |
| Approved | `status-approved-bg` | `status-approved` |
| Rejected | `status-rejected-bg` | `status-rejected` |
| Changes | `status-changes-bg` | `status-changes` |
| Brand | `brand-soft` | `brand-soft-text` |

### Inputs / Fields

- **Style:** Full-width, `surface` background, 1px `border` border, `rounded-md` (8px), `p-2 px-3`, 14px Inter, `ink` text.
- **Placeholder:** `ink-muted` colour.
- **Focus:** `border-brand` border, `shadow-focus` ring (`0 0 0 3px rgba(225,29,72,0.35)` — semantic `focus` token). No outline override needed; `:focus-visible` is handled globally.
- **Error:** `status-rejected` border, matching red glow ring. Error copy below the field in `error-text` class (12px, `status-rejected`).
- **Disabled:** `surface-sunken` background, `ink-muted` text, `cursor-not-allowed`.

### Skeleton / Loading State

Static pulse (no shimmer shimmy — loading states in this portal last 150–400ms; a shimmer reads as jank). `surface-sunken` background, `rounded-md`, `animation: skeleton-pulse 1.6s ease-in-out infinite`. Replace the exact shape of the content it stands in for, not a generic rectangle.

### Navigation (Sidebar)

- **Collapsed (64px):** Icon-only, tooltip on hover showing the label.
- **Expanded (240px):** Icon + label, `font-ui font-semibold`, 14px.
- **Active item:** `brand-soft` background, `ink-brand` text and icon, `rounded-xl` (16px).
- **Hover (inactive):** `surface-sunken` background, `ink` text.
- **Mobile:** Sidebar becomes a bottom-sheet drawer (`rounded-t-3xl`, `shadow-modal`). Overlay scrim uses `overlay-scrim` token.

### RadialRing (Progress Indicator)

SVG-based circular progress used in hero banners (profile completion %, readiness score). Fills from 0 to value on mount over 600ms ease-out. Background track is `surface-sunken`; progress arc is `brand`. Value label is `title` weight centred inside.

---

## Do's and Don'ts

### Do:

- **Do** use `text-brand` (`#2563EB`) for all interactive accents — links, focus rings, active nav, primary buttons. One colour owns interaction.
- **Do** place the most time-sensitive information in the accent block (brand-soft tint) in the hero zone's supporting column.
- **Do** use `rounded-full` on every button. A `rounded-lg` button is a regression to the category default.
- **Do** give every data view all four states: loading skeleton, error state with retry, empty state with honest copy, and populated content.
- **Do** gate all Framer Motion animations behind `useReducedMotion()`. The `shouldReduce` flag disables transitions; the content still renders.
- **Do** use `tabular-nums` on numeric values in metric tiles, tables, and stat blocks so digits don't shift as they count up.
- **Do** use the `status-*` semantic tokens for badge colours. Never reach for the raw ramp (`red-500`, `slate-400`) inside a status context.
- **Do** set `aria-hidden="true"` on every Lucide icon. Labels come from adjacent text or the button's `aria-label`.
- **Do** size touch targets to a minimum of 44px in both dimensions on mobile breakpoints.
- **Do** scroll wide tables inside their own wrapper (`overflow-x: auto`, never `overflow-x: scroll` on `<body>`).

### Don't:

- **Don't** use `#E11D48` (ELITE red) as the interactive brand accent on student-facing screens. It is reserved for destructive actions and critical alerts.
- **Don't** build equal-height card grids in the masonry zone. Staggered heights are the design.
- **Don't** scatter the brand blue as decoration (borders, underlines, icon fills on static elements). Its rarity is its authority.
- **Don't** use raw Tailwind palette classes (`bg-blue-600`, `text-slate-400`, `border-gray-200`) in components. Every colour reference goes through a semantic token (`bg-brand`, `text-ink-muted`, `border-edge`).
- **Don't** write `dark:` variant classes on component elements. The token system handles theme switching on `:root` / `[data-theme="dark"]`; a component that reads semantic tokens re-themes automatically.
- **Don't** use Playfair Display below `text-3xl` (30px). Below that size it reads decorative rather than authoritative.
- **Don't** use `alert()`, `confirm()`, or `console.error()` as user feedback. Toasts and inline error states are the only permitted channels.
- **Don't** use emoji or Unicode glyphs in place of icons. Icons are Lucide SVGs at 16px or 20px, one consistent stroke weight.
- **Don't** create a second button component, a second Card component, or a second colour ramp. `QUAL-1` applies: one implementation of each thing, fixed in place and migrated, never shadowed.
- **Don't** animate on loop. One entrance animation per section on mount. Hover states transition in/out; they don't play after the cursor leaves.

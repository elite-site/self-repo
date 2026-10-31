---
name: elite-portal-design
description: >
  Enforces the ELITE Student Portal design system across every student-facing
  page. Use when creating, editing, or reviewing any page, component, or layout
  in web/src/features/** or web/src/shared/**. Covers layout, color tokens,
  shape language, animation standards, and per-page consistency requirements
  derived from the approved reference mockup in docs/design/elite-portal-reference-mockup.jpg.
---

# ELITE Portal Design Skill

## Purpose

This skill ensures every student portal page is visually consistent with the
approved reference mockup (`docs/design/elite-portal-reference-mockup.jpg`).
It governs layout structure, token usage, shape language, and animation
patterns.

## Reference Documents

| Document | Path | Role |
|---|---|---|
| **Primary Spec** | `DESIGN.md` | Full design system spec (colors, layout, animation, per-page specs) |
| **Reference Mockup** | `docs/design/elite-portal-reference-mockup.jpg` | Approved side-by-side light/dark UI mockup |
| **Design Tokens (CSS)** | `shared/tokens.css` | All CSS custom properties |
| **Design Tokens (JS)** | `shared/tokens.mjs` | Radius, motion, type scales |
| **Tailwind Preset** | `shared/tailwind-preset.mjs` | Tailwind token integration |
| **Motion Vocabulary** | `web/src/shared/lib/motion.ts` | All animation variants and transitions |
| **Theme System** | `web/src/shared/lib/theme.ts` | Light/dark theme switching |

## Instructions

### Before writing or editing any UI file:
1. Read `DESIGN.md` sections 1–5 (color, geometry, layout, typography, animation).
2. Look at `docs/design/elite-portal-reference-mockup.jpg` to ground your decisions visually.
3. Identify which page spec in `DESIGN.md §7` applies to your current page.

### During implementation:
4. Apply the **Hero Card** pattern from `DESIGN.md §3.4` as the first section.
5. Add the **Metric Tiles Row** from `DESIGN.md §3.5` where applicable.
6. Use `RadialRing` from `@/shared/ui/RadialRing` for circular progress displays.
7. Use `MetricTile` from `@/shared/ui/MetricTile` for the quick-stats row.
8. Use `scrollReveal` from `@/shared/lib/scrollReveal` for non-React reveal animations.
9. Always wrap pages in a `motion.div` stagger container using `selectVariantsByName`.
10. Cards use `rounded-2xl` (feature) or `rounded-xl` (compact) — **never** `rounded`.

### Color rules (hard):
- Primary brand interactions use `--brand` (`#2563EB` light / `#3B82F6` dark).
- The ELITE red (`#E11D48`) is reserved for destructive actions only.
- No hardcoded hex values in JSX. Use semantic token classes only.
- No `bg-slate-*`, `text-rose-*`, or raw Tailwind palette classes.

### Animation rules (hard):
- All page entries use `staggerFastContainer` / `staggerFastItem` from `motion.ts`.
- Cards animate on hover: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-quick`.
- Numeric values use `useCountUp` hook.
- Progress bars and rings animate on mount.
- No looping animations, no parallax.
- Every animation respects `prefers-reduced-motion` via `useReducedMotion()`.

### After implementation:
11. Run through the **Per-Page Consistency Checklist** in `DESIGN.md §6`.
12. Visually verify the component in both light mode and dark mode.

## Quick Component Reference

```tsx
// Radial progress ring
import { RadialRing } from '@/shared/ui/RadialRing';
<RadialRing value={68} size={96} strokeWidth={8} />

// Metric tile with count-up
import { MetricTile } from '@/shared/ui/MetricTile';
<MetricTile icon={<BookOpen size={16} aria-hidden="true" />} label="Active Courses" value={8} />

// Scroll reveal (non-React)
import { scrollReveal } from '@/shared/lib/scrollReveal';
useEffect(() => scrollReveal(), []);
// In HTML: <div data-reveal data-reveal-delay="100"> ... </div>

// Page stagger
import { selectVariantsByName } from '@/shared/lib/motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
const reduce = useReducedMotion();
const container = selectVariantsByName(reduce, 'staggerFastContainer');
const item = selectVariantsByName(reduce, 'staggerFastItem');
<motion.div variants={container} initial="hidden" animate="show">
  <motion.section variants={item}> ... </motion.section>
</motion.div>
```

## What This Skill Covers

- Dashboard page
- Learning Hub page
- Portfolio page
- Events & Hackathons page
- Voting page
- Student Directory page
- Profile page
- Resume page
- GitHub Sync page
- Notifications page
- All shared layout components (Sidebar, TopBar, BottomTabBar)

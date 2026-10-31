# ELITE Student Portal — Design System & UI Standards

> **Reference Mockup:** `docs/design/elite-portal-reference-mockup.jpg`
> This file is the single source of truth for visual identity, layout rules, animation standards, and per-page consistency requirements across all student-facing pages.

---

## 1. Visual Identity & Brand

The ELITE portal presents as a **clean, professional engineering edtech product** — confident but never loud. Think Notion × Linear × Techsnap: maximum clarity, minimum noise, trustworthy depth.

### 1.1 Color Palette

#### Light Mode (`:root` / `[data-theme="light"]`)
| Token | Value | Usage |
|---|---|---|
| `--canvas` | `#F8FAFC` (slate-50) | Page background |
| `--surface` | `#FFFFFF` | Card backgrounds |
| `--surface-raised` | `#FFFFFF` | Elevated cards, dropdowns |
| `--surface-sunken` | `#F1F5F9` | Inset panels, code blocks |
| `--border` | `#E2E8F0` | Default card/input borders |
| `--border-strong` | `#CBD5E1` | Emphasized dividers |
| `--ink` | `#0F172A` | Primary text (headings) |
| `--ink-secondary` | `#475569` | Body, descriptions |
| `--ink-muted` | `#94A3B8` | Labels, placeholders, hints |
| `--brand` | `#2563EB` | Primary interactive accent (buttons, active states, links) |
| `--brand-hover` | `#1D4ED8` | Hover state for brand elements |
| `--brand-soft` | `#EFF6FF` | Subtle brand-tinted backgrounds |
| `--brand-soft-text` | `#1D4ED8` | Text inside brand-soft surfaces |

#### Dark Mode (`[data-theme="dark"]`)
| Token | Value | Usage |
|---|---|---|
| `--canvas` | `#0F172A` (slate-900) | Page background |
| `--surface` | `#1E293B` (slate-800) | Card backgrounds |
| `--surface-raised` | `#293548` | Elevated cards, dropdowns |
| `--surface-sunken` | `#0B1222` | Inset panels |
| `--border` | `#334155` | Default borders |
| `--border-strong` | `#475569` | Emphasized dividers |
| `--ink` | `#F8FAFC` | Primary text |
| `--ink-secondary` | `#CBD5E1` | Body text |
| `--ink-muted` | `#64748B` | Muted labels |
| `--brand` | `#3B82F6` | Primary interactive accent |
| `--brand-hover` | `#60A5FA` | Hover state |
| `--brand-soft` | `#172554` | Brand-tinted backgrounds |
| `--brand-soft-text` | `#93C5FD` | Text on brand-soft surfaces |

#### Status Colors (both modes)
| Purpose | Light | Dark |
|---|---|---|
| Success / Active | `#10B981` | `#34D399` |
| Warning / Deadline | `#F59E0B` | `#FBBF24` |
| Danger / Overdue | `#EF4444` | `#F87171` |
| Info / Neutral | `#6366F1` | `#818CF8` |

> [!IMPORTANT]
> Never use the ELITE red `#E11D48` (brand) on new pages. The **primary interactive accent is `#2563EB` (royal blue)** to align with the approved reference mockup. The red is reserved for destructive actions and critical alerts only.

---

## 2. Geometry & Shape Language

The portal uses **smooth, rounded, organic shapes**. No sharp 90-degree corners on visible surfaces.

| Element | Border Radius Token | Tailwind Class |
|---|---|---|
| Page cards, feature panels | `--2xl` → 20px | `rounded-2xl` |
| Metric tiles, compact cards | `--xl` → 16px | `rounded-xl` |
| Inputs, selects, text areas | `--lg` → 12px | `rounded-lg` |
| Buttons (default) | `--lg` → 12px | `rounded-lg` |
| Pill buttons, badges, tags, search bar | `--full` → 9999px | `rounded-full` |
| Avatars, icon buttons | `--full` → 9999px | `rounded-full` |
| Progress bars (track) | `--full` | `rounded-full` |
| Modal dialogs | `--2xl` → 20px | `rounded-2xl` |
| Sidebar nav items (active) | `--xl` → 16px | `rounded-xl` |
| Bottom sheets (mobile) | `--3xl` top only → 24px | `rounded-t-3xl` |

---

## 3. Layout System

### 3.1 Page Structure

```
[ Fixed Sidebar Rail 64px/240px ]  [ Content Column (flex-1) ]
                                    [ TopBar (sticky) ]
                                    [ <main> — page content ]
```

### 3.2 Content Grid

Pages use a **12-column grid at large screens**, collapsing to a single column on mobile.

| Breakpoint | Layout |
|---|---|
| `< md` (mobile) | Single column, full width |
| `md` | 2 columns, 50/50 |
| `lg` | 3-column: main 2fr + sidebar 1fr |
| `xl` | 4-column: main 3fr + sidebar 1fr |

### 3.3 Spacing Scale

Use `space-y-6` (24px) between page-level sections. Within cards, use `p-5 sm:p-6` (20–24px padding).

**Never use px values directly in components.** Always use Tailwind spacing tokens (multiples of 4).

### 3.4 Hero Banner (Top of Every Page)

Every main page has a **Hero Card** as its first element:
- Large `rounded-2xl` card with a subtle brand-tinted gradient background.
- Greeting / page title as `text-headline-xl` heading.
- Context subtitle as `text-body-md text-ink-secondary`.
- One or two primary actions: a solid brand blue pill button + optional secondary link.
- Optional: a circular radial progress meter (completion %, streak, readiness score).

### 3.5 Metric Tiles Row

Below the hero, a **3-column or 4-column grid** of compact metric tiles:
- `rounded-xl bg-surface border border-border p-4` for each tile.
- Lucide icon in `text-brand` (top-left).
- `text-label-sm text-ink-muted` label.
- `text-headline-md font-bold text-ink` value.

### 3.6 Main Content + Sidebar

Below metric tiles:
- **Main column** (2fr–3fr): Feature cards for primary page content.
- **Sidebar column** (1fr): Supplementary quick-info widgets, upcoming events, announcements.

---

## 4. Typography Rules

| Scale | Element | Class |
|---|---|---|
| `text-headline-xl` | Page title (hero) | `font-heading` |
| `text-headline-lg` | Section headers | `font-heading` |
| `text-headline-md` | Card titles, metric values | `font-heading` |
| `text-headline-sm` | Widget headers | `font-heading` |
| `text-body-lg` | Long-form body copy | — |
| `text-body-md` | Default body, descriptions | — |
| `text-body-sm` | Secondary text, table rows | — |
| `text-label-lg` | Buttons, nav labels | `font-ui font-semibold` |
| `text-label-sm` | Badges, tags, tab labels | `font-ui font-semibold` |
| `text-label-xs` | Caption, timestamps | `font-ui` |

**Line clamping:** Descriptions inside cards are `line-clamp-2`. Headings never wrap more than 2 lines.

---

## 5. Animation Standards

Animations in this portal are **purposeful, lightweight, and professional**. Never decorative.

### 5.1 Framer Motion (React Components)

Use named variants from `@/shared/lib/motion.ts`. Always pair with `useReducedMotion()`.

```tsx
const stagger = selectVariantsByName(shouldReduce, 'staggerFastContainer');
const item    = selectVariantsByName(shouldReduce, 'staggerFastItem');

<motion.div variants={stagger} initial="hidden" animate="show">
  <motion.div variants={item}> ... </motion.div>
</motion.div>
```

### 5.2 Approved Animation Patterns

| Pattern | Duration | Where |
|---|---|---|
| Page entry stagger | 200ms/item | All page sections fade+slide up on mount |
| Card hover lift | 150ms ease-out | All `Card` components: `hover:-translate-y-0.5 hover:shadow-md` |
| Button press feedback | 100ms | Scale `0.97` on `:active` |
| Metric counter count-up | 800ms | Numeric values in hero meter and metric tiles |
| Progress bar fill | 600ms ease-out | All `ProgressBar` and radial rings on mount |
| Skeleton to content | 300ms fade | All loading skeletons |
| Sidebar collapse/expand | 300ms ease-gentle | Width transition only |

### 5.3 Lightweight Vanilla JS Animations

For non-React contexts (CSS classes, utility hooks) use these micro-animation utilities:

**Intersection Observer fade-in (scroll reveal):**
```ts
// web/src/shared/lib/scrollReveal.ts
export function scrollReveal(selector: string = '[data-reveal]') {
  const io = new IntersectionObserver(
    (entries) => entries.forEach(e => e.target.classList.toggle('revealed', e.isIntersecting)),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll(selector).forEach(el => io.observe(el));
  return () => io.disconnect();
}
```

Apply to elements: `data-reveal` attr + CSS:
```css
[data-reveal] { opacity: 0; transform: translateY(12px); transition: opacity 400ms ease, transform 400ms ease; }
[data-reveal].revealed { opacity: 1; transform: translateY(0); }
```

**Circular progress ring (SVG, no library):**
```ts
export function animateRing(el: SVGCircleElement, targetPct: number) {
  const r = parseFloat(el.getAttribute('r') ?? '40');
  const circ = 2 * Math.PI * r;
  el.style.strokeDasharray = `${circ}`;
  el.style.strokeDashoffset = `${circ}`;
  requestAnimationFrame(() => {
    el.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.strokeDashoffset = `${circ * (1 - targetPct / 100)}`;
  });
}
```

**Counter count-up:**
```ts
export function countUp(el: HTMLElement, target: number, durationMs = 800) {
  const start = performance.now();
  const raf = (now: number) => {
    const p = Math.min((now - start) / durationMs, 1);
    el.textContent = String(Math.round(p * target));
    if (p < 1) requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}
```

### 5.4 Hard Limits

- **No looping ambient animations** (spinning rings, pulsing blobs, floating particles).
- **No parallax or scroll-driven transforms**.
- **All animations must collapse to instant under `prefers-reduced-motion: reduce`** (handled by the token layer and `useReducedMotion` hook).
- **No third-party animation libraries** beyond Framer Motion (already in the bundle).

---

## 6. Per-Page Consistency Checklist

Every student portal page **must** satisfy all of the following:

### 6.1 Structure
- [ ] Starts with a `<motion.div className="space-y-6">` stagger container.
- [ ] First section is the Hero Card (`rounded-2xl`, brand gradient, page title).
- [ ] Metric tiles row (if applicable, 3–4 compact tiles).
- [ ] Main content + optional sidebar grid (`lg:grid-cols-3 xl:grid-cols-4`).
- [ ] Loading: `Skeleton` with matching layout (not blank).
- [ ] Error: `ErrorState` with retry action.
- [ ] Empty: `EmptyState` with action (not a blank div).

### 6.2 Visual Style
- [ ] Cards use `rounded-2xl` (feature) or `rounded-xl` (compact).
- [ ] No hardcoded hex colors or pixel values in JSX.
- [ ] No `bg-slate-*`, `text-rose-*` or raw palette classes — use semantic tokens only.
- [ ] Buttons: `btn btn-primary` (brand blue pill) or `btn btn-secondary` (ghost).
- [ ] Icons: Lucide only, size 16 or 20, `aria-hidden="true"`.
- [ ] Typography: uses heading/body/label scale — never `text-xl font-bold` raw.

### 6.3 Animation
- [ ] Page entry uses `staggerFastContainer` / `staggerFastItem` variants.
- [ ] Cards have `hover:-translate-y-0.5 hover:shadow-md transition-all duration-quick` class.
- [ ] Numeric displays use `useCountUp` hook.
- [ ] Progress bars and rings animate in on mount.
- [ ] All motion is gated on `useReducedMotion()`.

### 6.4 Theme & Accessibility
- [ ] Component is tested in both light and dark mode.
- [ ] All interactive elements have accessible names.
- [ ] Focus ring uses `focus-visible:ring-2 focus-visible:ring-brand`.
- [ ] Touch targets ≥ 44px on mobile.
- [ ] Color is never the only indicator of state.

---

## 7. Page-by-Page Specifications

### Dashboard (`/`)
- Hero: Welcome greeting, profile completion radial ring, "Continue Learning" CTA.
- Metrics: Active courses, coding streak, placement readiness, upcoming events count.
- Main: Learning card, task board, activity feed.
- Sidebar: Events, voting campaigns.

### Learning Hub (`/learning`)
- Hero: "Learning Hub" title, total modules completed, enrolled courses count.
- Metrics: In-progress, completed, hours logged, certificates earned.
- Main: Course grid cards (video thumbnail + progress bar + "Resume" CTA).
- Sidebar: Recommended next course, upcoming lesson schedule.

### Portfolio (`/portfolio`)
- Hero: "Your Portfolio" title, public showcase readiness %, profile views count.
- Main: Project bento grid with GitHub stats, live preview links, tech stack chips.
- Sidebar: Profile completion checklist, public profile link.

### Events (`/events`)
- Hero: "Events & Hackathons" with upcoming count badge.
- Main: Event cards with date badge, registration status pill, countdown.
- Sidebar: My registrations list.

### Voting (`/voting`)
- Hero: "Campus Voting" with active campaigns count.
- Main: Campaign cards with candidates, progress bar per candidate, vote action.
- Sidebar: Past results, voting history.

### Directory (`/directory`)
- Hero: Search interface (large, prominent search bar with `rounded-full`).
- Main: Student card grid (avatar + name + skills chips + public profile link).
- Filters: Pill-shaped filter buttons for branch, year, skills.

### Profile (`/profile`)
- Hero: Profile photo, name, roll number, bio — card with brand gradient top strip.
- Main: Tabbed sections (Personal Info, Skills, Social Links, Resume).
- Sidebar: Completeness checklist.

### Resume (`/resume`)
- Hero: ATS score circular ring, "Download Resume" CTA.
- Main: Resume preview + section-by-section editor.

### GitHub (`/github`)
- Hero: Connected GitHub account + last synced timestamp.
- Main: Contribution heatmap, top repositories bento grid.
- Sidebar: Stats summary (stars, forks, streak).

### Notifications (`/notifications`)
- Hero: "Notifications" with unread count badge.
- Main: Grouped notification feed (Today, This Week, Earlier).

---

## 8. Component Patterns

### Metric Tile
```tsx
<Card className="rounded-xl p-4 flex flex-col gap-2">
  <div className="flex items-center gap-2 text-brand">
    <Icon size={16} aria-hidden="true" />
    <span className="text-label-sm text-ink-muted">{label}</span>
  </div>
  <p className="text-headline-md font-bold text-ink tabular-nums">{value}</p>
</Card>
```

### Hero Card
```tsx
<Card variant="brand" className="rounded-2xl p-6 sm:p-8">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h1 className="font-heading text-headline-xl text-ink">{title}</h1>
      <p className="mt-1 text-body-md text-ink-secondary">{subtitle}</p>
      <Link className="btn btn-primary rounded-full mt-4 inline-flex">{ctaLabel}</Link>
    </div>
    <RadialProgressRing value={pct} size={96} />
  </div>
</Card>
```

### Hoverable Feature Card
```tsx
<Card className="rounded-2xl p-5 transition-all duration-quick hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
  ...
</Card>
```

---

## 9. What NOT To Do

| ❌ Bad | ✅ Good |
|---|---|
| `className="bg-blue-600 text-white rounded"` | `className="btn btn-primary"` |
| `className="bg-slate-900 text-gray-200"` | `className="bg-surface-inverse text-ink"` |
| `className="rounded"` or `className="rounded-sm"` on a card | `className="rounded-xl"` or `className="rounded-2xl"` |
| Raw hardcoded glow: `boxShadow: "0 0 20px #6366f1"` | `className="shadow-md"` using elevation tokens |
| `animate={{ x: [0, 10, 0] }}` looping | One-shot entry animation only |
| Empty `<div />` for loading/error state | `<Skeleton />` / `<ErrorState />` / `<EmptyState />` |
| Page with no stagger entry animation | `motion.div` with `staggerFastContainer` |
| Neon glows, gradient text, rainbow colors | Flat brand blue, clean white, semantic tokens |

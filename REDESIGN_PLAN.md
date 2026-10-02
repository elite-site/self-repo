# ELITE Student Portal — Comprehensive Redesign Plan

**Document Version:** 1.0  
**Date:** October 2026  
**Status:** Production-Ready Specification  
**Audience:** Frontend Engineers, Designers, Product Owners, QA

---

## Table of Contents

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Project Overview](#2-project-overview)
3. [Design Principles](#3-design-principles)
4. [Design System Foundation](#4-design-system-foundation)
5. [Navigation Architecture](#5-navigation-architecture)
6. [Page-by-Page Design Specifications](#6-page-by-page-design-specifications)
7. [Light/Dark Mode Implementation](#7-lightdark-mode-implementation)
8. [Responsive Design Specification](#8-responsive-design-specification)
9. [Performance Strategy](#9-performance-strategy)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [File Structure & Code Organization](#11-file-structure--code-organization)
12. [Admin Client Minimal Update](#12-admin-client-minimal-update)
13. [Appendix A — Design Token Reference](#appendix-a--design-token-reference)
14. [Appendix B — Tailwind Config Extension](#appendix-b--tailwind-config-extension)
15. [Appendix C — Framer Motion Variants Reference](#appendix-c--framer-motion-variants-reference)

---

## 1. Executive Summary & Vision

The ELITE Self Introduction Portal is the primary digital identity platform for students of SASI Institute of Engineering & Technology. It serves as the vehicle through which students present their academic and creative work — videos, projects, certificates, achievements, resumes — to faculty, administrators, and peers. The current iteration of the portal fulfils its core functional requirements but falls short of the expressive, performant, and accessible standard that a modern student-facing product demands.

This document is the complete, production-ready specification for the ELITE portal redesign. It covers every decision made: every color token, every animation curve, every component variant, every page layout in both desktop and mobile form, and every interaction state. It is intended to serve as the single source of truth from which engineers and designers can build without ambiguity or guesswork.

### Vision Statement

> **Give every ELITE student a digital presence they are proud to share.** The redesigned portal should feel as polished as a consumer product — fast, beautiful, accessible on any device, and expressive enough that each student's personality can shine through their work.

### Strategic Goals

The redesign is driven by four strategic goals:

**1. Emotional Resonance.** Students currently use the portal because they are required to. After the redesign, they should want to use it. Every interaction — uploading a video, adding a project, voting on a classmate's work — should feel rewarding, even delightful. This is achieved through purposeful animation, confident typography, and a color system that feels prestigious rather than institutional.

**2. Mobile-First Parity.** A significant portion of the student body accesses the portal on their phones. Currently the mobile experience is a degraded version of the desktop layout. After the redesign, the mobile experience is a first-class citizen: a bottom tab bar, touch-friendly swipe interactions, optimised image loading, and layouts designed for portrait viewports from the ground up, simultaneously with desktop layouts.

**3. Performance as a Feature.** Slow page loads erode trust faster than any design decision can rebuild it. The redesigned portal targets Largest Contentful Paint (LCP) under 2.5 seconds on a 4G mobile connection, Cumulative Layout Shift (CLS) below 0.1, and First Input Delay (FID) below 100 ms. These are not aspirational — they are hard constraints built into the implementation roadmap.

**4. Systematic Consistency.** The current codebase has accumulated visual inconsistencies: colours that are close but not identical, spacing values that are ad-hoc, component patterns that diverge between pages. The redesign introduces a strict design token system backed by CSS custom properties and Tailwind configuration. Every visual decision is encoded as a named token. Any future designer or engineer making a change will reach for a token, not a raw hex value or pixel number.

### Out of Scope

This redesign covers the `web` student-facing portal and applies a minimal token-only update to the `admin-client`. It does not redesign backend API contracts, change authentication flows, modify the Prisma schema, or touch the backend Express application beyond what is required for new static assets (which are none in Phase 1–3).

---

## 2. Project Overview

### 2.1 Current State Analysis

The current ELITE Student Portal consists of seventeen distinct screens, each analysed below for its strengths and the specific pain-points the redesign addresses.

#### Login / Sign In Page

The current login page presents the ELITE branding with a Google SSO button. It is functional but visually sparse — a white card centred on a plain background with minimal personality. The ELITE red is used on the button but not integrated into a coherent visual composition. On mobile, the card extends close to the screen edges with insufficient padding. There is no dark mode support, no loading state on the button after click, and no meaningful error display beyond a toast that disappears before the user reads it.

#### Dashboard

The dashboard is a vertical list of cards — recent activity, pending actions, and announcements. The layout is linear and dense, with no visual hierarchy signalling which actions are most urgent. The "pending tasks" — filling in profile, uploading a video, adding projects — are buried in a list rather than surfaced as prominent calls to action. There is no streak or progress tracker to gamify completeness. On mobile, the cards stack vertically in a way that requires excessive scrolling. The dashboard does not animate between route changes, making the app feel static.

#### Profile View (Public)

The public profile page is the most visible screen — it is the page a faculty member or employer would see. Currently it reads as a data dump: a photo, a name, a bio, and a list of links. There is no visual storytelling. The page is not designed to be shared as a standalone URL. It lacks personality, progressive disclosure, or any sense that it represents a real human being's work and identity. The profile lacks a cover image area, section-level scroll animations, and skill tag displays.

#### Edit Profile

The edit profile page uses plain HTML inputs grouped into sections. Validation errors are shown inline but the error states are not visually distinct enough. The photo cropping flow uses a modal that works but is cramped on mobile. Saving is confirmed by a toast. There is no unsaved-changes warning if the user navigates away. The section structure is hard to scan — labels and inputs have inconsistent spacing.

#### Portfolio — Projects Tab

Projects are displayed as a simple list of cards with a title, description, and a tech stack label. The layout is one column on mobile and a two-column grid on desktop. The cards are visually flat — no cover image placeholder, no hover state, no visual weight differentiation between projects. The "Add Project" button is at the top of the page, which is correct, but it does not stand out enough.

#### Portfolio — Achievements Tab

Achievements are shown as list items with an icon and a title. There is no date, no description truncation, no visual hierarchy between achievement types. The empty state is a paragraph of text with no illustration. The layout is identical to the Projects tab when it should feel distinct.

#### Portfolio — Certificates Tab

Certificates have the same layout issues as Achievements. The certificate preview (a linked image or PDF) opens in a new tab, which breaks the user's context. There is no lightbox or in-page preview.

#### Add / Edit Project Modal

The project modal is a standard form in a modal dialog. It is functional but long — scrolling inside a modal is an interaction anti-pattern that the redesign eliminates. The tech stack input is a plain text field, not a tag/chip input. There is no image upload for project cover photos. The modal has no animation on open/close.

#### Intro Video Page

The video page shows the student's uploaded intro video in a basic HTML5 video player with browser-default controls. The upload flow is a file input button — no drag-and-drop, no upload progress indicator, no thumbnail preview before submission. The page does not convey the importance of this feature — the intro video is one of the most prominent artefacts in the portal and the page should feel like a "studio" experience.

#### Resume Page

The resume page shows a download link and an upload button. There is no inline PDF preview, which means the student cannot verify what their uploaded resume looks like without downloading it. The drag-and-drop upload is not supported. There is no replace flow (the student must upload over the existing file without explicit confirmation).

#### Events Page

Events are displayed as a plain list with a title, date, and a "Register" link. There are no cover images, no countdown timers, no registration status badges (whether the student is already registered). The empty state for when there are no events is generic.

#### Event Details Page

The event details page is a full-width text block with a registration button at the bottom. It does not include a cover image header, a clear metadata section (date, venue, capacity), or a visual breakdown of the event schedule/agenda if applicable. The registration confirmation is a toast.

#### Registrations Page

The registrations page lists events the student has registered for. It is a simple list with no filtering, no status distinction (upcoming vs. past), and no way to cancel a registration from within the list.

#### Teams Page

The teams page shows the student's current team and pending invitations. Team members are shown as a comma-separated list of names — not avatar cards. There is no visual indication of roles, no invite flow within the page, and no visual distinction between the player's own team and teams they are browsing.

#### Voting Page

The voting page lists candidates for voting in a table or card list. The student selects a candidate and clicks a submit button. There is no engagement mechanic — the experience is purely transactional. The redesign replaces this with a swipe-card mechanic similar to modern dating or discovery apps, making voting feel like an active, engaging experience rather than form-filling.

#### Notifications Page

The current portal has a notification bell that opens a dropdown. There is no dedicated notifications page. Clicking a notification closes the dropdown but does not navigate anywhere. The redesign adds a full notifications page with smart routing and a rich notification item component.

#### Settings Page

The settings page allows changing notification preferences and account information. It is a simple form with toggles. The section structure is adequate but the visual design is outdated — plain dividers, unweighted labels, no section icons.

---

### 2.2 Redesign Goals

The following goals are specific, measurable, and traceable to the page-level specifications in Section 6.

1. **Establish a complete design system** with named tokens for all colors, spacing, typography, shadows, and motion values, encoded in `shared/tokens.*` and extended into Tailwind configuration.

2. **Implement full light/dark mode** on every page and component, togglable by the user and persistent via `localStorage`, with system-preference detection as the initial default.

3. **Deliver a mobile-first responsive layout** on all 17 pages, with the bottom tab bar replacing the mobile drawer, touch-optimised controls, and mobile-specific layout variants where necessary.

4. **Elevate the visual quality** of every page: bento grid portfolio, Kanban-style dashboard, swipe-card voting, studio-style video page, inline PDF resume viewer.

5. **Implement a full motion design system** using Framer Motion: page transitions, card hovers, skeleton loaders, swipe gesture, parallax scroll on the profile page, and scroll-reveal on the portfolio.

6. **Ship a Command Palette (Cmd/Ctrl+K)** with search across pages, actions, and recent items.

7. **Meet Core Web Vitals targets**: LCP < 2.5s, CLS < 0.1, FID < 100ms.

---

### 2.3 Success Metrics

| Metric | Baseline (Current) | Target (Post-Redesign) |
|--------|-------------------|----------------------|
| LCP (mobile, 4G) | ~4.2s | < 2.5s |
| CLS | ~0.18 | < 0.1 |
| FID / INP | ~180ms | < 100ms |
| Lighthouse Accessibility Score | ~72 | ≥ 95 |
| Student session duration (avg.) | 2m 10s | > 4m 00s |
| Profile page shares (monthly) | Unmeasured | Track from launch |
| Mobile usage bounce rate | ~54% | < 30% |
| Upload completion rate (video) | ~61% | > 80% |

---

### 2.4 Scope

**In scope:**
- All 17 screens in `web/` (student portal)
- Global design system (`shared/tokens.*`, Tailwind config extension)
- Navigation architecture (sidebar, bottom tab bar, top bar, command palette)
- Animation system (Framer Motion)
- Light/dark mode implementation
- Font loading and performance optimisation

**Out of scope:**
- Backend API changes (routes, controllers, services)
- Database schema changes
- Admin client redesign (token update only — see Section 12)
- Authentication mechanism changes
- New features not listed in design decisions

---

## 3. Design Principles

These six principles govern every design decision in this document. When two valid options exist, the principle that differentiates them is the correct guide.

### 3.1 Confidence, Not Timidity

ELITE red is a bold color. The portal should own it. Gradients, solid fills, and high-contrast pairings are preferred over washed-out pastels or over-neutral interfaces. A student looking at their profile should feel proud, not underwhelmed. Confidence in the visual design translates directly into confidence in the student's presentation.

### 3.2 Clarity Above Cleverness

Every design pattern must be immediately understandable. The swipe card voting is engaging — but the swipe affordance (a visual drag indicator) is always visible so first-time users understand the mechanic without reading instructions. The bento grid portfolio is visually interesting — but the hierarchy (which projects are featured) is always clear from sizing. When a clever design obscures clarity, clarity wins.

### 3.3 Motion with Meaning

Animation exists to communicate, not to decorate. Every animated element in this spec exists for one of three reasons: (a) it provides spatial context (page transitions showing left/right navigation), (b) it confirms an action (button press feedback, success check-mark), or (c) it reduces perceived wait time (skeleton loaders, progress bars). Gratuitous looping animations or attention-grabbing effects that serve no informational purpose are explicitly prohibited.

### 3.4 Accessibility is Non-Negotiable

A target Lighthouse Accessibility score of ≥ 95 is a constraint, not a nice-to-have. All interactive elements have visible focus indicators that meet WCAG 2.1 AA contrast requirements. All images have `alt` text. All form inputs have associated labels. Motion can be reduced via the `prefers-reduced-motion` media query — every Framer Motion animation in this spec has a reduced-motion variant. Color alone is never the sole differentiator of state.

### 3.5 Performance is Design

A beautiful interface that is slow is a bad interface. Performance budgets are design constraints applied at the same level as color and layout. Lazy-loaded images, route-level code splitting, optimised font loading, and skeleton loaders in lieu of spinners are all design decisions, not engineering afterthoughts.

### 3.6 Systematic Consistency

No colour, spacing value, shadow, or duration is hardcoded in a component. Every value comes from a named token. This means the entire visual language can be updated by editing token files — a critical property for a codebase that will be maintained over multiple academic years with different contributors. Consistency also means that a student who learns one part of the interface understands all parts — the same button variants, the same card hover behavior, the same error state pattern appear everywhere.

---

## 4. Design System Foundation

### 4.1 Color System — ELITE Monochromatic Red

The color system is built on a single hue: ELITE red (`#C41230`, the college's brand color). From this anchor, a full 11-step tonal scale is derived (red-50 through red-950), covering the full range from near-white tints to near-black shades. A neutral grey scale (slate-based) and a set of semantic utility colors (success, warning, danger, info) complete the palette.

#### Red Tonal Scale

The tonal scale is hand-tuned for perceptual uniformity — each step is meaningfully lighter or darker than its neighbours in LAB color space, not just shifted in HSL lightness.

| Token | Hex | Usage Example |
|-------|-----|---------------|
| `red-50` | `#FFF1F2` | Lightest tint, hover backgrounds in light mode |
| `red-100` | `#FFE4E6` | Badge background, alert background |
| `red-200` | `#FECDD3` | Subtle border in light mode |
| `red-300` | `#FDA4AF` | Disabled brand elements |
| `red-400` | `#FB7185` | Secondary brand accents |
| `red-500` | `#F43F5E` | Accent CTAs, icon fills |
| `red-600` | `#E11D48` | Primary brand, interactive elements |
| `red-700` | `#BE123C` | Hover state for brand elements |
| `red-800` | `#9F1239` | Active/pressed state |
| `red-900` | `#881337` | Dark mode brand on dark surface |
| `red-950` | `#4C0519` | Darkest shade, text on red backgrounds |

#### Neutral / Slate Scale

A cool-tinted neutral scale pairs with the warm red to create visual balance.

| Token | Hex | Usage |
|-------|-----|-------|
| `slate-50` | `#F8FAFC` | Page background (light mode) |
| `slate-100` | `#F1F5F9` | Subtle surface (light mode) |
| `slate-200` | `#E2E8F0` | Border (light mode) |
| `slate-300` | `#CBD5E1` | Muted border |
| `slate-400` | `#94A3B8` | Placeholder text |
| `slate-500` | `#64748B` | Secondary text |
| `slate-600` | `#475569` | Body text (light mode) |
| `slate-700` | `#334155` | Strong body text |
| `slate-800` | `#1E293B` | Page background (dark mode surface) |
| `slate-900` | `#0F172A` | Page background (dark mode base) |
| `slate-950` | `#020617` | Deepest dark background |

#### Light Mode Semantic Tokens

| Token | Value | Description |
|-------|-------|-------------|
| `--color-bg-base` | `#F8FAFC` (slate-50) | Main page background |
| `--color-bg-surface` | `#FFFFFF` | Card, modal, sidebar surface |
| `--color-bg-elevated` | `#FFFFFF` | Elevated overlay (dropdown, tooltip) |
| `--color-bg-subtle` | `#F1F5F9` (slate-100) | Code blocks, subtle sections |
| `--color-bg-inset` | `#E2E8F0` (slate-200) | Input fields, inset areas |
| `--color-border-base` | `#E2E8F0` (slate-200) | Default border |
| `--color-border-strong` | `#CBD5E1` (slate-300) | Prominent dividers |
| `--color-border-brand` | `#E11D48` (red-600) | Focus rings, active borders |
| `--color-text-primary` | `#0F172A` (slate-900) | Primary headings |
| `--color-text-secondary` | `#475569` (slate-600) | Body text, descriptions |
| `--color-text-muted` | `#94A3B8` (slate-400) | Captions, timestamps |
| `--color-text-disabled` | `#CBD5E1` (slate-300) | Disabled state text |
| `--color-text-on-brand` | `#FFFFFF` | Text on brand-colored backgrounds |
| `--color-brand` | `#E11D48` (red-600) | Primary brand color |
| `--color-brand-hover` | `#BE123C` (red-700) | Brand hover |
| `--color-brand-active` | `#9F1239` (red-800) | Brand active/pressed |
| `--color-brand-subtle` | `#FFE4E6` (red-100) | Brand tinted backgrounds |
| `--color-success` | `#16A34A` | Success states |
| `--color-success-subtle` | `#DCFCE7` | Success background |
| `--color-warning` | `#D97706` | Warning states |
| `--color-warning-subtle` | `#FEF3C7` | Warning background |
| `--color-danger` | `#DC2626` | Error/danger states |
| `--color-danger-subtle` | `#FEE2E2` | Error background |
| `--color-info` | `#2563EB` | Informational states |
| `--color-info-subtle` | `#DBEAFE` | Info background |

#### Dark Mode Semantic Tokens

| Token | Value | Description |
|-------|-------|-------------|
| `--color-bg-base` | `#020617` (slate-950) | Main page background |
| `--color-bg-surface` | `#0F172A` (slate-900) | Card, modal, sidebar surface |
| `--color-bg-elevated` | `#1E293B` (slate-800) | Elevated overlay |
| `--color-bg-subtle` | `#1E293B` (slate-800) | Code blocks, subtle sections |
| `--color-bg-inset` | `#334155` (slate-700) | Input fields, inset areas |
| `--color-border-base` | `#1E293B` (slate-800) | Default border |
| `--color-border-strong` | `#334155` (slate-700) | Prominent dividers |
| `--color-border-brand` | `#F43F5E` (red-500) | Focus rings, active borders |
| `--color-text-primary` | `#F8FAFC` (slate-50) | Primary headings |
| `--color-text-secondary` | `#94A3B8` (slate-400) | Body text, descriptions |
| `--color-text-muted` | `#475569` (slate-600) | Captions, timestamps |
| `--color-text-disabled` | `#334155` (slate-700) | Disabled state text |
| `--color-text-on-brand` | `#FFFFFF` | Text on brand-colored backgrounds |
| `--color-brand` | `#F43F5E` (red-500) | Primary brand (lighter in dark mode for contrast) |
| `--color-brand-hover` | `#FB7185` (red-400) | Brand hover |
| `--color-brand-active` | `#E11D48` (red-600) | Brand active/pressed |
| `--color-brand-subtle` | `#4C0519` (red-950) | Brand tinted backgrounds |
| `--color-success` | `#4ADE80` | Success states |
| `--color-success-subtle` | `#14532D` | Success background |
| `--color-warning` | `#FCD34D` | Warning states |
| `--color-warning-subtle` | `#451A03` | Warning background |
| `--color-danger` | `#F87171` | Error/danger states |
| `--color-danger-subtle` | `#450A0A` | Error background |
| `--color-info` | `#60A5FA` | Informational states |
| `--color-info-subtle` | `#1E3A5F` | Info background |

---

### 4.2 Typography System

Typography is one of the most impactful tools available for elevating the perceived quality of a digital product. The redesign introduces a deliberate four-font system where each font family has a specific role and is never used outside that role.

#### Font Families

| Role | Font | Weights Used | CDN / Source |
|------|------|-------------|-------------|
| **Display** | `Playfair Display` | 700, 800 | Google Fonts |
| **Body** | `Inter` | 300, 400, 500 | Google Fonts |
| **UI** | `DM Sans` | 400, 500, 600 | Google Fonts |
| **Mono** | `JetBrains Mono` | 400, 500 | Google Fonts |

**Display (Playfair Display):** Used exclusively for hero headings, page titles on the public profile, and large feature text. Playfair Display's high contrast strokes convey prestige and academic authority. It is never used below `text-3xl` and never in body copy. Weight 700 for primary display, 800 for hero text on the profile page.

**Body (Inter):** The workhorse font. Used for all paragraph text, descriptions, card body content, form field values, and any running text longer than one sentence. Inter's exceptional legibility at small sizes and its extensive weight range make it the ideal choice. Weights 300 (light) for captions and supporting text, 400 (regular) for body, 500 (medium) for emphasis without using bold.

**UI (DM Sans):** Used for all interface elements: navigation labels, button text, form labels, tab labels, badge text, dropdown items, and any short single-line label. DM Sans has a slightly wider character spacing than Inter that makes it visually pop in small, dense UI contexts. Weights 400, 500 (medium), 600 (semibold).

**Mono (JetBrains Mono):** Used for student roll numbers, code snippets, timestamps in audit contexts, and any identifier that benefits from fixed-width rendering. Never used decoratively.

#### Type Scale

All sizes use a 1.25 modular scale anchored at 16px (1rem base).

| Token | Size | Line Height | Letter Spacing | Font | Usage |
|-------|------|-------------|----------------|------|-------|
| `text-xs` | 12px / 0.75rem | 1.5 (18px) | +0.025em | DM Sans | Micro labels, timestamps |
| `text-sm` | 14px / 0.875rem | 1.5 (21px) | +0.01em | DM Sans / Inter | Secondary labels, captions |
| `text-base` | 16px / 1rem | 1.6 (25.6px) | 0 | Inter | Body copy default |
| `text-lg` | 18px / 1.125rem | 1.55 (27.9px) | -0.01em | Inter | Lead paragraphs |
| `text-xl` | 20px / 1.25rem | 1.4 (28px) | -0.015em | DM Sans | Card headings, section subtitles |
| `text-2xl` | 24px / 1.5rem | 1.35 (32.4px) | -0.02em | DM Sans | Page section headings |
| `text-3xl` | 30px / 1.875rem | 1.3 (39px) | -0.025em | Playfair Display | Page titles |
| `text-4xl` | 36px / 2.25rem | 1.25 (45px) | -0.03em | Playfair Display | Hero section headings |
| `text-5xl` | 48px / 3rem | 1.2 (57.6px) | -0.035em | Playfair Display | Profile hero name |
| `text-6xl` | 60px / 3.75rem | 1.15 (69px) | -0.04em | Playfair Display | Landing hero (future) |
| `text-7xl` | 72px / 4.5rem | 1.1 (79.2px) | -0.045em | Playfair Display | Reserved |
| `text-8xl` | 96px / 6rem | 1.05 | -0.05em | Playfair Display | Reserved |
| `text-9xl` | 128px / 8rem | 1.0 | -0.055em | Playfair Display | Reserved |

#### Font Weight Meaning Guide

The font weight system is semantic — each weight communicates a specific level of importance and is used consistently across all components.

| Weight | Number | Meaning | Example Usage |
|--------|--------|---------|---------------|
| Light | 300 | Supporting, secondary | Timestamps, helper text, captions under images |
| Regular | 400 | Default, neutral | Body paragraphs, descriptions, dropdown items |
| Medium | 500 | Slightly elevated | Card titles in a list, form labels, nav items (inactive) |
| Semibold | 600 | Important, interactive | Button text, active nav item, badge text, column headers |
| Bold | 700 | Primary headings | Section headings, modal titles, card hero text |
| Extrabold | 800 | Display, brand moments | Profile hero name, landing page title |

#### Usage Rules Per Section

**Navigation:** DM Sans, weight 500 (inactive), 600 (active), size `text-sm` for sidebar labels, `text-xs` for bottom tab bar labels.

**Cards:** Title in DM Sans `text-xl` weight 600; body text in Inter `text-base` weight 400; meta (date, tag) in DM Sans `text-xs` weight 500.

**Forms:** Labels in DM Sans `text-sm` weight 500; inputs in Inter `text-base` weight 400; helper text in Inter `text-sm` weight 400 color `text-muted`; error text in Inter `text-sm` weight 500 color `danger`.

**Modals:** Title in DM Sans `text-2xl` weight 700; body in Inter `text-base`; actions in DM Sans `text-sm` weight 600.

**Profile Page Hero:** Name in Playfair Display `text-5xl` weight 800; tagline in Inter `text-xl` weight 300.

---

### 4.3 Spacing & Layout Grid

#### Base Grid

All spacing is derived from a **4pt base grid**. No value in the system is not a multiple of 4. Tailwind's default spacing scale already follows this convention (`space-1` = 4px, `space-2` = 8px, etc.), so the existing configuration is compatible.

| Token | px | rem | Use |
|-------|-----|-----|-----|
| `space-0` | 0 | 0 | — |
| `space-px` | 1px | — | Fine lines, dividers |
| `space-0.5` | 2px | 0.125rem | Tight micro-spacing |
| `space-1` | 4px | 0.25rem | Icon-to-label gap |
| `space-2` | 8px | 0.5rem | Badge padding, chip gap |
| `space-3` | 12px | 0.75rem | Input inner padding (top/bottom) |
| `space-4` | 16px | 1rem | Default component padding |
| `space-5` | 20px | 1.25rem | Card padding (compact) |
| `space-6` | 24px | 1.5rem | Card padding (default) |
| `space-8` | 32px | 2rem | Section gap |
| `space-10` | 40px | 2.5rem | Large section gap |
| `space-12` | 48px | 3rem | Page header padding |
| `space-16` | 64px | 4rem | Hero padding |
| `space-20` | 80px | 5rem | Large hero padding |
| `space-24` | 96px | 6rem | Extra-large spacing |

#### Breakpoints

| Name | Min Width | Max Width | Target Device |
|------|-----------|-----------|---------------|
| `xs` (default) | 0px | 479px | Small phones (iPhone SE) |
| `sm` | 480px | 639px | Large phones |
| `md` | 640px | 767px | Phablet / landscape phone |
| `lg` | 768px | 1023px | Tablet portrait |
| `xl` | 1024px | 1279px | Tablet landscape / small laptop |
| `2xl` | 1280px | 1535px | Desktop |
| `3xl` | 1536px | ∞ | Large desktop / ultrawide |

#### Container Widths

| Breakpoint | Container Max-Width | Side Padding |
|-----------|--------------------|-|
| xs | 100% | 16px (space-4) |
| sm | 100% | 20px (space-5) |
| md | 100% | 24px (space-6) |
| lg | 100% | 32px (space-8) |
| xl | 100% | 48px (space-12) |
| 2xl | 1280px | auto |
| 3xl | 1440px | auto |

#### Layout Zones

The desktop layout is divided into three zones:

1. **Sidebar** (240px expanded, 64px collapsed): Fixed left, full viewport height, `z-index: 40`.
2. **Top Bar** (56px height): Fixed top, right of sidebar, `z-index: 30`.
3. **Main Content Area**: Fills remaining space. Has `overflow-y: auto` and receives the page-level scroll container. Padding: `px-8 py-6` on desktop, `px-4 pb-24 pt-4` on mobile (bottom padding accounts for tab bar height).

Mobile bottom tab bar height: 56px. Content area receives `pb-[56px]` to avoid overlap.

---

### 4.4 Border Radius System

The border radius system uses consistent values that create a cohesive visual language. Rounded but not pill-shaped is the default for cards and containers; fully rounded for avatars and icons.

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0px | Data tables, strict grid elements |
| `rounded-sm` | 4px | Badges, tags, small inline elements |
| `rounded` | 6px | Buttons (small), chips |
| `rounded-md` | 8px | Input fields, small cards |
| `rounded-lg` | 12px | Cards (default), dropdowns |
| `rounded-xl` | 16px | Modal dialogs, large cards |
| `rounded-2xl` | 20px | Feature cards, bento grid items |
| `rounded-3xl` | 24px | Profile cover image corners |
| `rounded-full` | 9999px | Avatars, icon buttons, toggle pills |

---

### 4.5 Shadow & Elevation System

Shadows convey spatial elevation — a higher shadow means the element is "higher" above the page. In dark mode, elevation is conveyed through surface color lightness rather than drop shadows, though subtle shadows are still applied for context.

#### Light Mode Shadows

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `shadow-xs` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle card, input focus ring |
| `shadow-sm` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` | Cards (default) |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Cards (hover) |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | Dropdowns, modals |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | Bottom sheets, drawers |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Full-screen modals |
| `shadow-brand` | `0 4px 14px 0 rgba(225,29,72,0.35)` | Brand button glow on hover |
| `shadow-inner` | `inset 0 2px 4px 0 rgba(0,0,0,0.05)` | Input fields, inset areas |

#### Dark Mode Shadows

In dark mode, shadows are desaturated and very subtle. Elevation is primarily communicated through surface color:

- Base background: `slate-950`
- Surface (cards): `slate-900` — 1 level elevated
- Elevated (dropdowns): `slate-800` — 2 levels elevated
- Top overlay (modals): `slate-800` + `shadow-2xl` with `rgba(0,0,0,0.4)`

| Token | CSS Value (Dark) | Usage |
|-------|-----------------|-------|
| `shadow-sm` (dark) | `0 1px 3px 0 rgba(0,0,0,0.3)` | Cards |
| `shadow-md` (dark) | `0 4px 6px -1px rgba(0,0,0,0.4)` | Card hover |
| `shadow-lg` (dark) | `0 10px 15px -3px rgba(0,0,0,0.5)` | Dropdowns |
| `shadow-brand` (dark) | `0 4px 14px 0 rgba(244,63,94,0.4)` | Brand button glow |

---

### 4.6 Iconography Guidelines

All icons use **Lucide React** (`lucide-react`), already installed in the project. Lucide provides a consistent set of 2px-stroke icons with a clean, minimal aesthetic that pairs well with the Inter/DM Sans typography.

#### Icon Sizes

| Context | Size | Tailwind | Notes |
|---------|------|----------|-------|
| Inline text icon | 16px | `size-4` | Aligns with `text-sm` / `text-base` line height |
| Button icon | 18px | `size-[18px]` | Paired with button text |
| Navigation icon | 20px | `size-5` | Sidebar and bottom tab bar |
| Card icon | 24px | `size-6` | Feature icons on cards |
| Empty state icon | 48px | `size-12` | Empty state illustrations |
| Hero icon | 64px | `size-16` | Large decorative contexts |

#### Color Rules

- Default: `text-muted` (`slate-400` light / `slate-500` dark)
- Active/selected: `text-brand` (`red-600` light / `red-500` dark)
- Destructive: `text-danger` (`red-600` both modes)
- Success: `text-success` (`green-600` light / `green-400` dark)
- On colored backgrounds: `text-on-brand` (white)

#### Navigation Icon Assignments

| Page | Icon (Lucide) |
|------|--------------|
| Dashboard | `LayoutDashboard` |
| Profile | `User` |
| Portfolio | `Briefcase` |
| Intro Video | `Video` |
| Resume | `FileText` |
| Events | `Calendar` |
| Teams | `Users` |
| Voting | `ThumbsUp` |
| Notifications | `Bell` |
| Settings | `Settings` |
| Search (Command Palette) | `Search` |
| Theme Toggle (light) | `Sun` |
| Theme Toggle (dark) | `Moon` |
| Collapse Sidebar | `PanelLeftClose` / `PanelLeftOpen` |

#### Stroke Width

All Lucide icons maintain the default `strokeWidth={2}`. For display-size icons (48px+), `strokeWidth={1.5}` creates a more refined appearance. Never use `strokeWidth={1}` (too thin) or `strokeWidth={3}` (too heavy).

---

### 4.7 Motion Design System

#### Design Philosophy

The motion system is built on three constraints derived from Principle 3 (Motion with Meaning): every animation must be purposeful, every animation must respect `prefers-reduced-motion`, and every animation must be implementable without dropping below 60fps on a mid-range Android device.

Framer Motion (`framer-motion`) is the animation library. It is already present in the project. All page-level animations use `AnimatePresence` + `motion.div`. All micro-interactions use the Framer Motion `whileHover`, `whileTap`, and `animate` APIs.

#### Duration Tokens

| Token | Duration | Usage |
|-------|----------|-------|
| `duration-instant` | 0ms | State changes that should not be perceived as animated |
| `duration-fast` | 100ms | Button press feedback, toggle switches |
| `duration-quick` | 150ms | Hover state color transitions |
| `duration-normal` | 200ms | Most micro-interactions, badge popins |
| `duration-moderate` | 300ms | Card expansion, dropdown open |
| `duration-slow` | 400ms | Page transitions, modal open/close |
| `duration-deliberate` | 500ms | Skeleton to content swap |
| `duration-lazy` | 700ms | Scroll-reveal entrance animations |
| `duration-story` | 1000ms | Onboarding, splash screens |

#### Easing Tokens

| Token | CSS Cubic-Bezier | Framer Motion | Character |
|-------|-----------------|---------------|-----------|
| `ease-linear` | `linear` | `[0, 0, 1, 1]` | Constant velocity |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | `[0, 0, 0.2, 1]` | Decelerating — for entrances |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | `[0.4, 0, 1, 1]` | Accelerating — for exits |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | `[0.4, 0, 0.2, 1]` | Symmetric — for movement |
| `ease-spring` | N/A (spring physics) | `{ type: 'spring', stiffness: 400, damping: 30 }` | Snappy, physical feel |
| `ease-bounce` | N/A (spring physics) | `{ type: 'spring', stiffness: 300, damping: 15 }` | Playful bounce |
| `ease-gentle` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | `[0.25, 0.46, 0.45, 0.94]` | Smooth, premium feel |

#### Animation Catalogue

##### 1. Page Transitions

Route-level fade + slide. New page slides in from the right; previous page fades out. Back navigation reverses direction.

```tsx
// variants/pageTransition.ts
export const pageVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
};

export const pageTransition = {
  duration: 0.3,
  ease: [0, 0, 0.2, 1], // ease-out
};

// Usage in App.tsx with AnimatePresence
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
  >
    <Routes location={location}>...</Routes>
  </motion.div>
</AnimatePresence>
```

Reduced motion alternative: opacity fade only, no x-translation.

```tsx
const pageVariantsReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};
```

##### 2. Card Hover

Cards lift on hover with a subtle upward translation and shadow increase.

```tsx
// In card component
<motion.div
  className="card"
  whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.12)' }}
  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
>
```

##### 3. Button Press

Buttons scale slightly down on press to convey physical feedback.

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ duration: 0.1, ease: [0.4, 0, 1, 1] }}
>
```

Brand primary button also shows a glow effect on hover via `shadow-brand`.

##### 4. Skeleton Shimmer

Skeleton loaders use a CSS animation shimmer — not JavaScript-driven, to avoid main-thread cost.

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-inset) 25%,
    var(--color-bg-subtle) 50%,
    var(--color-bg-inset) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

##### 5. Swipe Gesture (Voting Page)

The voting swipe card uses Framer Motion's `drag` API with rotation and opacity feedback.

```tsx
const SWIPE_CONFIDENCE_THRESHOLD = 10000;

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(e, { offset, velocity }) => {
    const swipe = Math.abs(offset.x) * velocity.x;
    if (swipe < -SWIPE_CONFIDENCE_THRESHOLD) onVote('left');
    else if (swipe > SWIPE_CONFIDENCE_THRESHOLD) onVote('right');
  }}
  animate={{ rotate: x * 0.05 }}  // x from useMotionValue
  style={{ x, rotate }}
>
```

##### 6. Parallax Scroll (Profile Page)

The profile cover image scrolls at 0.5x the viewport scroll speed.

```tsx
const { scrollY } = useScroll({ target: containerRef });
const y = useTransform(scrollY, [0, 300], [0, -60]);

<motion.div style={{ y }} className="profile-cover" />
```

##### 7. Scroll Reveal (Portfolio, Events)

Cards animate in from below as they enter the viewport.

```tsx
// useInView hook from framer-motion
const ref = useRef(null);
const isInView = useInView(ref, { once: true, margin: '-100px' });

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 32 }}
  animate={isInView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.5, ease: [0, 0, 0.2, 1], delay: index * 0.08 }}
>
```

##### 8. Modal Entrance

Modals scale up from 95% with a fade, giving a sense of originating from the trigger element.

```tsx
const modalVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.95, y: 16 },
};

<motion.div
  variants={modalVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
>
```

The backdrop fades in/out independently:

```tsx
<motion.div
  className="fixed inset-0 bg-black/50 backdrop-blur-sm"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
/>
```

##### 9. Toast Notification

Toasts slide in from the bottom-right (desktop) or bottom (mobile), stack with spring physics.

```tsx
const toastVariants = {
  initial: { opacity: 0, y: 32, scale: 0.9 },
  animate: { opacity: 1, y: 0,  scale: 1   },
  exit:    { opacity: 0, y: 16, scale: 0.95 },
};

<motion.div
  layout
  variants={toastVariants}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>
```

##### 10. Stagger Children (Lists)

When a list of cards loads, they animate in with a staggered delay.

```tsx
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] } },
};
```

---

### 4.8 Component Library

This section specifies every shared UI component in detail — variants, states, sizes, Tailwind classes, and Framer Motion integration. These are the building blocks from which every page in Section 6 is assembled.

#### Button Component

The Button is the most fundamental interactive element. Five variants cover all use cases.

**Variants:**

| Variant | Background | Text | Border | Use Case |
|---------|-----------|------|--------|----------|
| `primary` | `bg-brand` | `text-on-brand` | None | Primary CTA, submit forms |
| `secondary` | `bg-surface` | `text-primary` | `border-base` | Secondary actions |
| `ghost` | `bg-transparent` | `text-secondary` | None | Tertiary actions, nav links |
| `danger` | `bg-danger` | `text-on-brand` | None | Destructive actions |
| `icon-only` | Any of the above | Icon only | Optional | Compact icon actions |

**Sizes:**

| Size | Height | Padding H | Font Size | Icon Size |
|------|--------|-----------|-----------|-----------|
| `sm` | 32px | 12px | `text-sm` (14px) | 16px |
| `md` | 40px | 16px | `text-sm` (14px) | 18px |
| `lg` | 48px | 20px | `text-base` (16px) | 20px |

**States:**

- **Default:** Base styles as above.
- **Hover:** `primary` → `bg-brand-hover` + `shadow-brand`; `secondary` → `bg-subtle`; `ghost` → `bg-subtle`; `danger` → darker red.
- **Active/Pressed:** Scale to 0.97, `active:brightness-90`.
- **Loading:** Text replaced with `<Loader2 className="animate-spin" />`, button disabled, `opacity-80`.
- **Disabled:** `opacity-50 cursor-not-allowed`, no hover effects.
- **Focus:** `ring-2 ring-brand ring-offset-2` — WCAG AA compliant on all backgrounds.

**Tailwind Classes (Primary MD):**

```tsx
className={cn(
  // Base
  "inline-flex items-center justify-center gap-2 font-ui font-semibold",
  "rounded-md transition-all duration-100",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
  // Size: md
  "h-10 px-4 text-sm",
  // Variant: primary
  "bg-brand text-on-brand hover:bg-brand-hover hover:shadow-brand",
  "active:scale-[0.97]",
  // Disabled
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
)}
```

#### Input Fields

Form inputs follow a consistent anatomy: label above, input field, helper/error text below.

**Text Input:**

```tsx
// Container
<div className="flex flex-col gap-1.5">
  <label className="font-ui text-sm font-medium text-primary">{label}</label>
  <div className="relative">
    <input
      className={cn(
        "w-full rounded-md border bg-inset px-3 py-2.5",
        "font-body text-base text-primary placeholder:text-muted",
        "transition-colors duration-150",
        "border-base focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
        error && "border-danger focus:border-danger focus:ring-danger"
      )}
    />
    {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
  </div>
  {error  && <p className="font-body text-sm font-medium text-danger">{error}</p>}
  {helper && <p className="font-body text-sm text-muted">{helper}</p>}
</div>
```

**States:** default → border-base; focus → border-brand + ring; error → border-danger + ring-danger; disabled → opacity-50 bg-subtle cursor-not-allowed.

**Textarea:** Same as text input but `min-h-[120px] resize-y`.

**Select:** Custom-styled using Radix UI `Select` primitive (already available or added as part of Phase 1). Chevron icon on the right, same input field styling.

**Date Input:** Native `<input type="date">` styled to match the design system.

#### Card Component

Cards are the primary content container across all pages.

**Variants:**

| Variant | Surface | Border | Shadow | Use Case |
|---------|---------|--------|--------|---------|
| `default` | `bg-surface` | `border-base` | `shadow-sm` | General content cards |
| `elevated` | `bg-surface` | None | `shadow-md` | Featured, important cards |
| `ghost` | `bg-transparent` | `border-base` | None | Subtle grouping |
| `brand` | `bg-brand-subtle` | `border-brand` | None | Brand-highlighted content |
| `interactive` | `bg-surface` | `border-base` | `shadow-sm` | Clickable/hoverable cards |

**Interactive Card Behavior:**

```tsx
<motion.div
  className="rounded-xl border border-base bg-surface p-6 shadow-sm cursor-pointer"
  whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.12)' }}
  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
  onClick={onClick}
/>
```

Focus state for keyboard navigation: `focus-visible:ring-2 focus-visible:ring-brand`.

#### Badge / Tag / Chip

Three distinct components serve different semantic needs:

**Badge:** Status indicator. Small, pill-shaped, no interaction.

```tsx
// Variants: success, warning, danger, info, neutral, brand
<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-ui text-xs font-semibold">
  <span className="size-1.5 rounded-full bg-current" /> {/* Status dot */}
  {label}
</span>
```

Colors: success → `bg-success-subtle text-success`; warning → `bg-warning-subtle text-warning`; danger → `bg-danger-subtle text-danger`; brand → `bg-brand-subtle text-brand`.

**Tag:** Taxonomy label. Small rounded-sm, optionally removable.

```tsx
<span className="inline-flex items-center gap-1 rounded-sm bg-subtle px-2 py-1 font-ui text-xs font-medium text-secondary">
  {label}
  {onRemove && <button onClick={onRemove}><X className="size-3" /></button>}
</span>
```

**Chip:** Interactive filter/toggle. Larger than tag, can be selected.

```tsx
<motion.button
  whileTap={{ scale: 0.96 }}
  className={cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-ui text-sm font-medium transition-colors",
    selected
      ? "bg-brand text-on-brand"
      : "bg-subtle text-secondary hover:bg-inset"
  )}
>
```

#### Avatar Component

**Sizes:**

| Size | Dimensions | Text Fallback | Usage |
|------|-----------|---------------|-------|
| `xs` | 24×24px | `text-[10px]` | Compact lists |
| `sm` | 32×32px | `text-xs` | Comment threads |
| `md` | 40×40px | `text-sm` | Default in cards |
| `lg` | 48×48px | `text-base` | Team member cards |
| `xl` | 64×64px | `text-lg` | Profile preview |
| `2xl` | 96×96px | `text-2xl` | Profile page header |
| `3xl` | 128×128px | `text-3xl` | Profile hero |

**Fallback:** If no image, show initials on a brand-colored background: `bg-brand text-on-brand`.

**Online Indicator:** Small dot, `size-2.5 rounded-full bg-success border-2 border-surface`, absolute positioned bottom-right.

**Group Avatar:** Overlapping stack for team members. Each subsequent avatar overlaps the previous by `ml-[-8px]`.

#### Modal / Dialog

Built on Radix UI `Dialog`. Renders a centered overlay on all screen sizes.

**Anatomy:** Backdrop (blur + dark overlay) → Dialog panel (rounded-xl, bg-surface, shadow-2xl) → Header (title + close button) → Body (scrollable if tall) → Footer (action buttons).

**Sizes:** `sm` (400px max), `md` (560px max), `lg` (720px max), `xl` (920px max), `full` (100vw - 48px, 100vh - 64px for very tall content).

**Mobile behavior:** On `< md` breakpoints, modals render as bottom sheets — full width, rounded only at top, slide up from bottom.

```tsx
// Desktop
className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[560px] rounded-xl"

// Mobile (applied via CSS, not JS)
// @apply sm:fixed sm:inset-x-0 sm:bottom-0 sm:top-auto sm:rounded-b-none sm:rounded-t-2xl sm:max-w-full sm:translate-x-0 sm:translate-y-0
```

#### Bottom Tab Bar (Mobile)

The bottom tab bar replaces the mobile drawer navigation entirely. It is fixed to the bottom of the viewport, always visible on mobile screens.

**Specification:**

- Height: 56px
- Background: `bg-surface` with `border-t border-base` and `shadow-xl`
- Safe area padding: `pb-[env(safe-area-inset-bottom)]` for iOS home indicator support
- Contains exactly 5 tabs (see Navigation Architecture, Section 5.2)
- Each tab: centered icon (20px) + label (`text-[10px]` DM Sans)
- Active tab: icon and label in `text-brand`; inactive: `text-muted`
- Active indicator: `bg-brand` dot above icon, `size-1 rounded-full`, animated with spring

```tsx
<nav className="fixed bottom-0 inset-x-0 z-40 flex h-14 border-t border-base bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
  {tabs.map((tab) => (
    <NavLink key={tab.path} to={tab.path} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="tab-indicator"
              className="absolute top-1 size-1 rounded-full bg-brand"
            />
          )}
          <tab.Icon className={cn("size-5", isActive ? "text-brand" : "text-muted")} />
          <span className={cn("font-ui text-[10px]", isActive ? "text-brand font-semibold" : "text-muted")}>
            {tab.label}
          </span>
        </>
      )}
    </NavLink>
  ))}
</nav>
```

The `layoutId="tab-indicator"` creates a Framer Motion shared layout animation — the indicator dot slides between tabs.

#### Sidebar (Desktop Collapsible)

The desktop sidebar is fixed on the left, 240px wide when expanded, 64px when collapsed. The toggle button is at the bottom of the sidebar.

**Expanded state:** Logo + wordmark at top; nav items with icon + label; user info at bottom.
**Collapsed state:** Logo icon only; nav items with icon only, Tooltip on hover showing label; user avatar at bottom.

Transition: `transition-[width] duration-300 ease-gentle` — smooth width animation.

Active nav item: `bg-brand-subtle text-brand font-semibold rounded-lg`.
Inactive: `text-secondary hover:bg-subtle hover:text-primary rounded-lg`.

#### Toast / Notification Toast

Toasts appear in a stack in the bottom-right corner (desktop) or bottom-center (mobile). Maximum 3 toasts visible simultaneously; older toasts are dismissed.

**Variants:** success, warning, danger, info.
**Anatomy:** Icon (left) + message text + optional action link + dismiss button (right).
**Duration:** Auto-dismiss after 5000ms. Progress bar shows remaining time.

```tsx
// Progress bar auto-dismiss
<motion.div
  className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
  initial={{ scaleX: 1 }}
  animate={{ scaleX: 0 }}
  transition={{ duration: 5, ease: 'linear' }}
  style={{ transformOrigin: 'left' }}
/>
```

#### Skeleton Loaders

Skeletons match the exact shape and size of the content they represent. This ensures zero layout shift when content loads.

**Types:**

- **Text skeleton:** `h-4 rounded bg-inset` for a single line; vary widths (60%, 80%, 100%) for multi-line.
- **Card skeleton:** Full card outline with header (avatar + two text lines) + body (three text lines) + footer (two button shapes).
- **Avatar skeleton:** `size-10 rounded-full bg-inset`.
- **Video skeleton:** `aspect-video w-full rounded-lg bg-inset`.
- **Bento grid skeleton:** Grid layout matching the actual bento grid, with varied cell sizes.

All skeletons apply the shimmer CSS animation defined in Section 4.7.

#### Progress Bar / Step Indicator

**Linear progress:** `h-2 rounded-full bg-inset overflow-hidden` with inner `bg-brand rounded-full` animated via `motion.div` with `animate={{ width: `${percent}%` }}`.

**Step indicator:** Horizontal steps (desktop) or vertical steps (mobile) for multi-step flows like onboarding.

```tsx
// Step indicator
<ol className="flex items-center gap-0">
  {steps.map((step, i) => (
    <li key={step.id} className="flex items-center">
      <div className={cn(
        "flex size-8 items-center justify-center rounded-full font-ui text-sm font-semibold",
        i < current  && "bg-brand text-on-brand",       // completed
        i === current && "border-2 border-brand text-brand", // active
        i > current  && "border-2 border-base text-muted"  // upcoming
      )}>
        {i < current ? <Check className="size-4" /> : i + 1}
      </div>
      {i < steps.length - 1 && (
        <div className={cn("h-0.5 w-16", i < current ? "bg-brand" : "bg-base")} />
      )}
    </li>
  ))}
</ol>
```

#### Tabs Component

Built on Radix UI `Tabs`. Two visual styles:

**Line tabs:** Underline indicator on active tab. Used within pages (Portfolio tabs, Settings tabs).

```tsx
<div className="flex border-b border-base">
  {tabs.map(tab => (
    <button className={cn(
      "relative px-4 py-2.5 font-ui text-sm font-medium transition-colors",
      active === tab.id ? "text-brand" : "text-muted hover:text-secondary"
    )}>
      {tab.label}
      {active === tab.id && (
        <motion.div layoutId="tab-line" className="absolute bottom-0 inset-x-0 h-0.5 bg-brand" />
      )}
    </button>
  ))}
</div>
```

**Pill tabs:** Filled background on active tab. Used for filter groups (Events filtering, Notifications filtering).

#### Command Palette

The command palette is a full-viewport overlay triggered by `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux). It is built on `cmdk` (a headless command palette library).

Full specification in Section 5.4.

#### File Upload Zone

The drag-and-drop file upload zone handles single or multiple file selections.

**States:**
- **Idle:** Dashed border `border-2 border-dashed border-base`, center icon + label + subtext.
- **Drag over:** `border-brand bg-brand-subtle`, scale 1.02 animation.
- **Uploading:** Linear progress bar, file name shown, cancel button.
- **Success:** Solid `border-success bg-success-subtle`, checkmark icon, file name + size.
- **Error:** `border-danger bg-danger-subtle`, error icon, error message, retry button.

```tsx
<motion.div
  animate={isDragging ? { scale: 1.02, borderColor: 'var(--color-border-brand)' } : {}}
  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-base p-10 transition-colors"
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
  <Upload className="size-8 text-muted" />
  <div className="text-center">
    <p className="font-ui text-sm font-medium text-primary">
      Drag & drop or <button className="text-brand underline">browse</button>
    </p>
    <p className="mt-1 font-body text-xs text-muted">{acceptLabel} · Max {maxMB}MB</p>
  </div>
</motion.div>
```

#### Video Player

Custom HTML5 video player skin over the native `<video>` element. Uses Radix UI primitives for the slider (seek bar, volume).

**Controls:** Play/Pause, current time / duration, seek bar, volume, fullscreen, download (if permitted), quality selector (if applicable).

**Skin:** Dark overlay at bottom of video with gradient fade. Controls auto-hide after 3 seconds of inactivity, appear on hover/tap.

```tsx
<div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
  <video ref={videoRef} className="h-full w-full object-contain" />
  <AnimatePresence>
    {showControls && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4"
      >
        {/* controls */}
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

#### Swipe Card (Voting Page)

The swipe card component is the centerpiece of the Voting page. It wraps a candidate profile card with drag mechanics.

```tsx
const x = useMotionValue(0);
const rotate = useTransform(x, [-200, 200], [-20, 20]);
const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  style={{ x, rotate, opacity }}
  onDragEnd={handleDragEnd}
  className="absolute cursor-grab active:cursor-grabbing"
>
  {/* Candidate card */}
  {/* Left/right vote indicators */}
  <motion.div
    style={{ opacity: useTransform(x, [-50, 0], [1, 0]) }}
    className="absolute left-4 top-4 rounded-md border-2 border-danger px-2 py-1 text-danger font-bold"
  >
    PASS
  </motion.div>
  <motion.div
    style={{ opacity: useTransform(x, [0, 50], [0, 1]) }}
    className="absolute right-4 top-4 rounded-md border-2 border-success px-2 py-1 text-success font-bold"
  >
    VOTE
  </motion.div>
</motion.div>
```


---

## 5. Navigation Architecture

### 5.1 Sidebar (Desktop)

The sidebar is the primary navigation for users on screens ≥ 768px. It occupies the full left edge of the viewport and is always visible (collapsible to icon-only, never hidden entirely on desktop).

#### Expanded State (240px)

```
┌────────────────────────┐
│  [ELITE Logo + text]   │  ← 56px height, px-6, border-b border-base
├────────────────────────┤
│                        │
│  [D] Dashboard         │  ← Active: bg-brand-subtle text-brand rounded-lg
│  [U] Profile           │  ← Inactive: text-secondary hover:bg-subtle
│  [B] Portfolio         │
│  [V] Intro Video       │
│  [F] Resume            │
│  [C] Events            │
│  [2] Teams             │
│  [T] Voting            │
│  [B] Notifications   3 │  ← Badge showing unread count
│  [S] Settings          │
│                        │
├────────────────────────┤
│  [Avatar] Name         │  ← User info section, 56px height
│           Roll Number  │
│  [⇠] Collapse          │  ← Toggle button, bottom of sidebar
└────────────────────────┘
```

**Nav item Tailwind classes:**

```tsx
<NavLink
  to={item.path}
  className={({ isActive }) => cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 font-ui text-sm transition-colors duration-150",
    isActive
      ? "bg-brand-subtle text-brand font-semibold"
      : "text-secondary hover:bg-subtle hover:text-primary"
  )}
>
  <item.Icon className="size-5 shrink-0" />
  <span className="truncate">{item.label}</span>
  {item.badge && (
    <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 font-ui text-[10px] font-bold text-on-brand">
      {item.badge}
    </span>
  )}
</NavLink>
```

#### Collapsed State (64px)

In collapsed state:
- Logo becomes icon-only (ELITE monogram, 32×32px)
- Nav item labels are hidden; icons remain centered
- Tooltip appears on hover showing the label: `group-hover:opacity-100`
- User info becomes avatar only (32×32px centered)
- Collapse button rotates icon 180°

**Width transition:**

```tsx
<motion.aside
  animate={{ width: collapsed ? 64 : 240 }}
  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
  className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-base bg-surface overflow-hidden"
>
```

**Persistence:** `collapsed` state stored in `localStorage` as `'sidebar-collapsed'`.

---

### 5.2 Bottom Tab Bar (Mobile)

On screens < 768px, the sidebar is replaced by a bottom tab bar. The sidebar is `hidden md:flex`.

**The 5 tabs (in order):**

| Position | Icon | Label | Route |
|----------|------|-------|-------|
| 1 | `LayoutDashboard` | Home | `/dashboard` |
| 2 | `Briefcase` | Portfolio | `/portfolio` |
| 3 | `User` | Profile | `/profile` |
| 4 | `Calendar` | Events | `/events` |
| 5 | `MoreHorizontal` | More | Opens bottom sheet with remaining nav items |

**"More" sheet:** A bottom sheet listing remaining pages: Intro Video, Resume, Teams, Voting, Notifications, Settings. Implemented as a Radix UI `Sheet` with slide-up animation.

**Badge support:** The Notifications tab (in More sheet) shows an unread badge. The "More" tab itself shows a badge if any page within it has an unread badge.

**Transition:** The active indicator dot slides between tabs using Framer Motion `layoutId="tab-indicator"`. Transition is `type: 'spring', stiffness: 380, damping: 28`.

---

### 5.3 Top Bar

The top bar is 56px tall, fixed, `z-30`, positioned to the right of the sidebar on desktop and full-width on mobile.

**Desktop layout (left to right):**

```
[ Search bar (flex-grow, max-w-xl) ]  ···  [ 🌙 Theme ]  [ 🔔 Bell (3) ]  [ Avatar ]
```

**Mobile layout (left to right):**

```
[ ELITE Logo ]  ···  [ 🔍 Search icon ]  [ 🌙 Theme ]  [ 🔔 Bell (3) ]
```

On mobile, tapping the search icon slides the search bar into the top bar with an animation, pushing the other icons to the right (or hiding them).

**Search bar (desktop):** A persistent `<input>` styled to look like a text field with a `Search` icon on the left and a `⌘K` shortcut badge on the right. Clicking it opens the Command Palette.

```tsx
<button
  onClick={openCommandPalette}
  className="flex h-9 w-full max-w-xl items-center gap-2 rounded-lg border border-base bg-inset px-3 text-left transition-colors hover:bg-subtle"
>
  <Search className="size-4 text-muted" />
  <span className="flex-1 font-body text-sm text-muted">Search anything…</span>
  <kbd className="rounded border border-base bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">⌘K</kbd>
</button>
```

**Notification bell:** Shows unread count badge (red, max "99+"). Clicking navigates to `/notifications`.

**User avatar:** 32×32px avatar. Clicking opens a small dropdown with links to Profile, Settings, and Logout.

**Theme toggle:** `Sun` icon in light mode, `Moon` in dark mode. Clicking toggles theme with a 200ms fade. The icon itself rotates 20° on click as a micro-interaction.

---

### 5.4 Command Palette (Cmd+K)

The command palette is a full-screen overlay that surfaces the entire application's functionality through keyboard-driven search. Built on `cmdk`.

#### Trigger

- Keyboard: `Cmd+K` (macOS), `Ctrl+K` (Windows/Linux)
- UI: Clicking the search bar in the top nav
- Mobile: Tapping the search icon in the mobile top bar

#### Interaction Spec

1. Palette opens with backdrop blur + fade (150ms).
2. Input is immediately focused.
3. As the user types, results update in real time (debounced 100ms).
4. Navigation: `↑` / `↓` arrows move selection. `Enter` executes selected item. `Esc` closes.
5. Mouse/touch: Click an item to execute.

#### Search Index Sources

| Category | Examples | Action |
|----------|---------|--------|
| **Pages** | "Dashboard", "Profile", "Resume", "Events" | Navigate to page |
| **Actions** | "Upload Video", "Add Project", "Edit Profile", "Download Resume" | Navigate + trigger action |
| **Events** | Event names pulled from API | Navigate to event detail |
| **Settings** | "Notification Settings", "Theme", "Account" | Navigate to settings section |
| **Recent** | Last 5 visited pages (from localStorage) | Navigate |

#### UI Structure

```
┌──────────────────────────────────────┐
│  🔍  Search anything…                │  ← Input, font-body text-base
├──────────────────────────────────────┤
│  RECENT                              │  ← Group heading, text-xs text-muted uppercase
│  ▷  Dashboard                        │
│  ▷  Portfolio                        │
├──────────────────────────────────────┤
│  PAGES                               │
│  ▷  Intro Video          Video       │
│  ▷  Resume               File        │
│  ▷  Teams                Users       │
├──────────────────────────────────────┤
│  ACTIONS                             │
│  ▷  Upload New Video     ⌘U          │
│  ▷  Add Project                      │
└──────────────────────────────────────┘
```

**Backdrop:** `fixed inset-0 bg-black/40 backdrop-blur-sm z-50`
**Panel:** `fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-xl rounded-xl bg-elevated shadow-2xl border border-base`

---

### 5.5 Page Transitions

Page transitions use Framer Motion `AnimatePresence` wrapping the `<Routes>` component. The transition type depends on navigation direction:

- **Forward navigation** (clicking sidebar/tab bar link deeper): slide in from right (`x: 24 to 0`)
- **Back navigation** (browser back, breadcrumb): slide in from left (`x: -24 to 0`)
- **Tab switch** (switching between sibling tabs within Portfolio): crossfade only (no x-translation)
- **Modal open**: not a route transition; handled by the Modal component's own animation

Direction tracking: use a custom `useNavigationDirection` hook that compares the depth of the previous and current paths.

All transitions: `duration: 0.3, ease: [0, 0, 0.2, 1]`. Reduced motion: `duration: 0.15`, opacity only.

---

## 6. Page-by-Page Design Specifications

---

### 6.1 Login / Sign In Page

#### Purpose

The Login page is the entry point for all students. It authenticates via Google Workspace SSO using the student's `@sasi.ac.in` email address. The page must convey the ELITE brand confidently, set a premium first impression, and reduce friction to zero — there is effectively one action: "Sign in with Google."

#### Layout Description

**Desktop (≥ 768px):** Full-viewport split layout. Left half (50vw) is a brand panel — a rich visual composition with the ELITE logo, a bold typographic statement, and a subtle animated background pattern (geometric red shapes that drift slowly). Right half is the auth panel — centered card with the sign-in form.

**Mobile (< 768px):** Single-column, full viewport. Top 40% is a condensed brand panel with just the logo and tagline. Bottom 60% is the auth card with padding to prevent keyboard occlusion.

#### UI Sections and Components

**Left Panel (desktop) / Top Panel (mobile):**
- Background: `bg-brand` (red-600 in light mode, red-700 in dark mode)
- Animated background: four large translucent circles (`bg-white/10`) that drift with a slow `@keyframes float` animation at different speeds and phases
- ELITE logo: SVG, white version, 80px tall on desktop, 48px on mobile
- Tagline: "Your Story. Your Skills. Your Future." — Playfair Display, `text-3xl` on desktop, `text-xl` on mobile, `text-on-brand`, font-weight 700
- Sub-tagline: "SASI Institute of Engineering & Technology" — Inter, `text-sm`, `text-on-brand/70`

**Right Panel / Auth Card:**
- Background: `bg-surface`
- Shadow: `shadow-2xl` on desktop; none (full-bleed) on mobile
- Padding: `p-10` desktop, `p-6` mobile
- Title: "Welcome back" — DM Sans, `text-2xl`, font-weight 700
- Subtitle: "Sign in with your SASI Google account" — Inter, `text-sm`, `text-muted`
- Google SSO Button:
  - Full width, height 48px
  - White background, `border border-base`, `rounded-lg`
  - Google `G` logo SVG on left (20px)
  - Text: "Continue with Google" — DM Sans, `text-base`, font-weight 500
  - On hover: `bg-subtle`, subtle lift animation
  - On click: button enters loading state (spinner replaces icon, text becomes "Signing in…", button disabled)
- Footer text: "By signing in, you agree to ELITE's Terms of Service. Only @sasi.ac.in accounts are permitted." — Inter, `text-xs`, `text-muted`, centered

#### Interactive States and Behaviors

- **Idle:** Static with drifting background animation on left panel.
- **Button hover:** `scale(1.01)`, slight shadow increase, `duration-150`.
- **Button click:** Spinner animation, button disabled. Redirect to Google OAuth.
- **Auth error (wrong account):** Error banner slides down below the button: `bg-danger-subtle border border-danger rounded-lg p-3 text-danger text-sm`. Auto-dismisses after 8 seconds or on retry.
- **Auth error (not on roster):** More prominent error: "Your account isn't registered in ELITE. Contact your department administrator." with a `mailto:` link.

#### Animation Details

- Entry: Left panel slides in from the left (`x: -40 to 0, opacity: 0 to 1, duration: 0.5s`) and right panel fades in (`opacity: 0 to 1, delay: 0.2s, duration: 0.4s`).
- Background circles: Each circle has `animation: float 12s ease-in-out infinite` with different `animation-delay` values.
- Error banner: Slides down and fades in from above (`y: -8 to 0, opacity: 0 to 1`).

#### Accessibility Notes

- Google button has `aria-label="Sign in with Google"`.
- Error messages are `role="alert"` so screen readers announce them immediately.
- Focus is set to the Google button on page load (`autoFocus`).
- All text meets WCAG AA contrast on both red background (left) and white surface (right).

#### Tailwind Class Examples

```tsx
// Left panel
<div className="hidden md:flex w-1/2 flex-col items-center justify-center bg-brand relative overflow-hidden px-12 py-16">

// Auth card
<div className="w-full max-w-md rounded-xl bg-surface p-10 shadow-2xl md:w-1/2 flex flex-col justify-center">

// Google button
<motion.button
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.99 }}
  className="flex w-full items-center justify-center gap-3 rounded-lg border border-base bg-surface h-12 font-ui text-base font-medium text-primary transition-colors hover:bg-subtle"
>
```

---

### 6.2 Dashboard

#### Purpose

The Dashboard is the student's home base — it provides at a glance: their profile completion status, pending tasks, recent activity, streaks, and upcoming events. It replaces passive reading with active, gamified engagement. The Kanban-style activity cards group tasks by status rather than listing them chronologically.

#### Layout Description

**Desktop:** Three-column layout at `2xl`. Center column (60%) is the main content: Kanban board + activity feed. Right column (25%) is a contextual sidebar: streak tracker, upcoming events mini-list, quick actions.

At `xl`, two columns: main + contextual sidebar.  
At `lg` and below: single column, contextual sidebar moves below main content.

**Mobile:** Single column. Streak tracker becomes a full-width card at the top, then the Kanban columns scroll horizontally (snap scroll), then the activity feed, then upcoming events.

#### UI Sections and Components

**1. Greeting Header:**
- "Good morning, Aravind 👋" — Playfair Display, `text-3xl` (desktop) / `text-2xl` (mobile), font-weight 700
- Subtitle: "Friday, 3 October · Semester 5" — DM Sans, `text-sm`, `text-muted`

**2. Profile Completion Banner (conditional — shown until 100%):**
- Brand-tinted card: `bg-brand-subtle border border-brand-subtle rounded-xl p-4`
- Progress bar showing % completion (e.g., "Profile 65% complete")
- Three most impactful missing items shown as chips with direct links

**3. Kanban Activity Board:**
- Three columns: "To Do", "In Progress", "Done"
- On desktop: three equal columns with a `gap-4`
- On mobile: horizontal scroll snap with `snap-x snap-mandatory`, each column `min-w-[80vw] snap-start`
- Each column has a header with title and count badge
- Cards within columns are the `interactive` Card variant
- Card anatomy: status icon + title + due date chip + action button

**4. Streak Tracker:**
- Shows "Login Streak" — current streak in days
- Visual: A row of 7 circles representing the last 7 days
- Large display number: streak count, Playfair Display `text-5xl font-bold text-brand`
- Subtext: "Day streak 🔥"
- Personal best shown below: "Best: 12 days"

**5. Quick Actions Panel:**
- Grid of 2×2 action buttons (icon + label):
  - Upload Video, Add Project, Browse Events, View Team
- Each button: `bg-subtle hover:bg-inset rounded-lg p-4 flex flex-col items-center gap-2`

**6. Recent Activity Feed:**
- Timeline-style list of recent events
- Maximum 8 items; "See all" link
- Skeleton: three skeleton rows while loading

**7. Upcoming Events Strip:**
- Mini list of next 3 upcoming events
- Each: event name + date badge + "Registered" or "Register" chip

#### Interactive States and Behaviors

- Clicking a Kanban card navigates to the relevant page.
- The "Complete" action on a Kanban card triggers an optimistic UI update: the card moves to "Done" with a checkmark animation and a success toast.
- Streak circles animate on first visit of the day: a scale-and-glow effect on the "today" circle.

#### Animation Details

- Page entrance: stagger children animation — greeting fades in first (0ms delay), profile banner (100ms), Kanban board (200ms), right sidebar (300ms).
- Kanban card hover: `y: -3` lift + `shadow-md`.
- Completing a task: Card gets a green checkmark overlay animation (scale from 0 to 1.2 to 1), then slides to the "Done" column with a `layout` animation.
- Streak number: Count-up animation from 0 to current streak.

#### Empty States

- **No tasks:** "All caught up! 🎉" with a small illustration.
- **No activity:** "Your activity will appear here as you use ELITE."
- **No upcoming events:** "No events coming up. Check the Events page for announcements."

#### Loading State

Full skeleton matching the layout: greeting skeleton (two text lines), three Kanban column skeletons (each with 2 card skeletons), streak card skeleton.

#### Accessibility Notes

- The Kanban board has `role="region" aria-label="Task board"`.
- Each Kanban column has `role="group" aria-label="To Do tasks"` etc.
- The greeting uses `<h1>`. Section headings use `<h2>`.

---

### 6.3 Profile View (Public Mini-Website)

#### Purpose

The public profile is the page a student shares with employers, faculty, or peers. It must function as a standalone mini-website — not a data form, but a narrative presentation of the student's identity. The URL is shareable: `/profile/:rollNumber` (public, no auth required for viewing).

#### Layout Description

**Desktop:** Full-width, single-column with a max-width of 900px centered. No sidebar visible on the public profile (or sidebar present if the student is viewing their own profile while logged in).

**Mobile:** Full-width, single-column. The cover image is full-width, rounded at the bottom edges. Avatar overflows the cover image at the bottom-center.

#### UI Sections and Components

**1. Cover Image:**
- Full-width banner, 320px tall on desktop, 200px on mobile
- Parallax scroll effect on desktop: `useTransform(scrollY, [0, 300], [0, -60])`
- If no cover image: gradient background from `red-950` to `red-800`
- Rounded bottom corners: `rounded-b-3xl`
- Share button (top-right): `bg-surface/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm`

**2. Profile Header:**
- Avatar: 128×128px, `rounded-full`, `border-4 border-surface`, overlaps cover image by 50% of avatar height
- Name: Playfair Display, `text-5xl font-extrabold text-primary`, centered
- Tagline/Bio first line: Inter, `text-xl font-light text-secondary`, centered
- Department + Year + Batch badges: horizontal flex, centered
- Social links: GitHub, LinkedIn, Portfolio URL — icon buttons in a row

**3. About Section:** Card with full bio text and skills tags.

**4. Featured Video:** The intro video embedded inline with the custom player.

**5. Projects / Portfolio Section:**
- Grid of top 3–4 project cards (condensed bento)
- "View all projects →" link below

**6. Achievements & Certificates:** Two-column grid (desktop), single column (mobile).

**7. Resume Download:** Prominent card with PDF icon, metadata, download button.

#### Interactive States and Behaviors

- **Scroll-reveal:** Each section fades in + slides up as it enters the viewport.
- **Cover parallax:** On scroll, cover image moves at 0.3x speed.
- **Share button:** Copies the current URL to clipboard. "Copied!" toast.

#### Loading State

Skeleton layout: cover image shimmer → header section (avatar circle + two text lines) → three section cards with skeleton content.

#### Error State

If the profile is not found: "This profile doesn't exist or hasn't been set up yet."

#### Accessibility Notes

- Cover image has `alt="[Name]'s profile cover"` or `alt=""` if decorative.
- Avatar has `alt="[Name]'s profile photo"`.
- Section heading hierarchy: `<h1>` for name, `<h2>` for each section.

---

### 6.4 Edit Profile

#### Purpose

The Edit Profile page lets students update all aspects of their public profile — personal info, contact details, social links, bio, skills, cover photo, and profile photo.

#### Layout Description

**Desktop:** Two-column layout. Left column (300px): sticky profile preview showing current saved state. Right column: the edit form, organized into sections.

**Mobile:** Single column. Preview at top (condensed), form sections below.

#### UI Sections and Components

**1. Photo Section:**
- Current avatar shown (96×96px) with overlay "Change Photo" button on hover
- After selection, `react-image-crop` modal for circular cropping
- Separate "Change Cover Photo" below

**2. Basic Information:**
- First Name, Last Name (two inputs in a row)
- Display Name (full name override)
- Roll Number, Batch, Department (all read-only)

**3. Bio & Tagline:**
- Tagline: single-line input, max 120 characters. Character count shown.
- Bio: `<textarea>`, min-h 160px, max 600 characters.
- Both auto-save on blur with a subtle "Saved" indicator.

**4. Skills:**
- Tag input: user types a skill and presses Enter to create a Tag chip. Maximum 15 skills.

**5. Social Links:**
- GitHub URL, LinkedIn URL, Portfolio/Website URL. Each validated on blur.

**6. Preferences:**
- Toggle: "Allow my profile to be viewed publicly"

#### Interactive States and Behaviors

- **Auto-save:** Text fields save 1500ms after the user stops typing (debounced).
- **Photo crop modal:** Circular crop with Confirm / Cancel.
- **Unsaved changes:** Browser `beforeunload` warning + React Router `prompt` for unsaved file changes.

#### Accessibility Notes

- All inputs have `<label htmlFor>` associations.
- Character counters have `aria-live="polite"`.
- The crop modal traps focus within it.
- Error messages are associated via `aria-describedby`.

---

### 6.5 Portfolio — Projects Tab

#### Purpose

The Projects tab shows all the student's projects in a bento grid layout. Featured projects get larger cells, creating visual hierarchy that mirrors the real importance of each piece of work.

#### Layout Description

**Desktop Bento Grid:** A CSS grid with `grid-cols-12`.
- Featured project: `col-span-8 row-span-2` — large, with cover image
- Secondary projects: `col-span-4 row-span-2` or `col-span-6 row-span-1`
- Remaining projects: `col-span-4 row-span-1`
- "Add Project" card: always the last cell, styled as a dashed ghost card

**Mobile:** Single-column list of cards with full width.

#### UI Sections and Components

**Project Card (large — featured):**
- Cover image: `aspect-video rounded-xl object-cover`
- Overlay on hover: dark gradient with external links (GitHub, Live Demo)
- Below image: project title (DM Sans `text-xl font-bold`), description (Inter `text-sm`, 3-line truncate), tech stack chips
- Action buttons on hover: Edit, Delete

**"Add Project" Ghost Card:**
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-base text-muted hover:border-brand hover:text-brand transition-colors"
>
  <Plus className="size-8" />
  <span className="font-ui text-sm font-medium">Add Project</span>
</motion.button>
```

#### Animation Details

- Initial load: scroll-reveal stagger (each card with `0.08s` delay, `y: 20 to 0`).
- Adding a project: New card slides in at top with spring scale animation.
- Deleting: Card scales out, grid re-flows via Framer Motion `layout`.

#### Accessibility Notes

- Each project card is a `<article>` element.
- Cover image alt describes the project.
- Delete confirmation dialog traps focus.

---

### 6.6 Portfolio — Achievements Tab

#### Purpose

Achievements are significant milestones — hackathon wins, academic recognitions, scholarships. Presented as a chronological timeline.

#### Layout Description

**Desktop:** Single column centered (max-width 640px), timeline-style layout.
**Mobile:** Same, timeline line hidden (replaced by top-border on each card).

#### UI Sections and Components

**Timeline Indicator:** `w-px bg-brand/30 absolute left-5 top-0 bottom-0` with circular nodes at each achievement.

**Achievement Card:**
- Icon (based on type: `Trophy`, `Award`, `Star`, `Zap`), colored by tier (gold/silver/bronze/brand)
- Title: DM Sans `text-base font-semibold`
- Date: DM Sans `text-xs text-muted`
- Description: Inter `text-sm text-secondary` (2-line truncate, expandable)

**Category Filter:** Pills — All, Academic, Extracurricular, Technical, Leadership. Animated active indicator.

#### Animation Details

Scroll-reveal: each card reveals from the left (`opacity + x: -20 to 0`) as it enters the viewport, staggered 0.1s.

---

### 6.7 Portfolio — Certificates Tab

#### Purpose

Certificates are proof of course completions, online learning, technical training. Shown in a grid with in-page lightbox viewing.

#### Layout Description

**Desktop:** 3-column grid (`grid-cols-3 gap-6`).  
**Mobile:** 2-column grid (`grid-cols-2 gap-3`).

#### UI Sections and Components

**Certificate Card:**
- Thumbnail preview (`aspect-[4/3]`)
- Title: DM Sans `text-sm font-semibold`
- Issuer: Inter `text-xs text-muted`
- On hover: overlay with "View" and "Download" buttons

**Lightbox:** Modal with full certificate image or inline PDF, keyboard navigation (`←` `→`).

---

### 6.8 Add / Edit Project Modal

#### Purpose

This modal is the form for creating and editing project entries. On edit, the form is pre-filled.

#### Layout Description

**Desktop:** Medium modal (`max-w-[640px]`). Two-column at the top (cover upload + text fields), full-width fields below.

**Mobile:** Bottom sheet (full-width, rounded top corners, slides up). Single-column form.

#### UI Sections and Components

- **Cover Image Upload:** `FileUploadZone`, accepts `image/*`, max 5MB
- **Project Name:** text input, required, max 100 chars
- **Short Description:** textarea, max 300 chars, character count
- **Project Type:** Select (`Academic`, `Personal`, `Hackathon`, `Open Source`, `Freelance`)
- **Tech Stack:** tag input (press Enter to add chip, max 10 tags)
- **GitHub URL / Live Demo URL:** URL inputs, optional, validated on blur
- **Start Date / End Date:** two date inputs (or "Ongoing" toggle)
- **Project Role:** text input
- **Team Size:** number input (1–20)
- **Detailed Description:** textarea, max 2000 chars, Preview tab available

**Action Buttons:**
- Cancel (ghost), Save / Update (primary), Delete (danger ghost, edit mode only)

#### Interactive States and Behaviors

- Tech stack tag input: typing and pressing `,` or `Enter` creates a chip.
- On submit: loading state on Save button. Success: modal closes, project appears with entrance animation.
- Delete: inline 3-second confirmation before executing.

---

### 6.9 Intro Video

#### Purpose

The Intro Video page is designed as a "studio" — professional, focused, and action-oriented. It communicates the importance of the intro video and provides a polished upload and management experience.

#### Layout Description

**Desktop:** Two-column. Left (60%): video player or upload zone. Right (40%): metadata panel — tips, action buttons, video details.

**Mobile:** Single column. Video player / upload zone at top, metadata panel below.

#### UI Sections and Components

**If video is uploaded:**

**Video Player:**
- Custom-skinned HTML5 `<video>` player, `aspect-video rounded-xl overflow-hidden`
- Controls: Play/Pause, Progress bar with scrubbing, Time, Volume (desktop), Fullscreen, Download

**Metadata Panel:**
- Title: "Your Intro Video" — DM Sans `text-2xl font-bold`
- Status badge: "Approved" (green), "Under Review" (yellow), "Rejected" (red)
- Upload date, Duration, File size
- Action buttons: "Replace Video" (secondary) and "Delete Video" (ghost danger)

**Tips Card:**
- Accordion-style recording tips: "Keep it under 3 minutes", "Look at the camera", "Good lighting", etc.

**If no video uploaded:**

**Upload Zone:**
- Large `FileUploadZone`, accepting `video/*`, max 25MB
- After file selection: video preview (muted autoplay loop)
- Upload progress: circular SVG `stroke-dashoffset` animation or linear progress bar
- Cancel button available while uploading

**Studio Header:**
- Full-width banner: dark red gradient, large `Video` icon, "Your Intro Video" heading, tagline in italic

#### Interactive States and Behaviors

- **Upload drag-over:** Zone border becomes `border-brand`, background `bg-brand-subtle`, scale 1.02.
- **Upload success:** Circle animation completes, morphs to checkmark. Toast: "Video uploaded! Under review."
- **Upload error (size exceeded):** "Your video exceeds the 25MB limit. Please compress it and try again."
- **Replace flow:** Modal with upload zone. Current video blurred in background.

#### Animation Details

- Studio header: headline slides in from left, subtext from right, icon fades in — orchestrated with `staggerChildren`.
- Upload success checkmark: Spring-based SVG draw animation.

#### Accessibility Notes

- Video player custom controls are keyboard-accessible: Space = play/pause, arrow keys = seek, `m` = mute.
- All control buttons have `aria-label`.
- Upload zone: `role="button" aria-label="Upload intro video"`.
- Progress bar: `role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}`.

---

### 6.10 Resume

#### Purpose

The Resume page allows students to upload, view (inline), download, and replace their resume. The inline PDF viewer eliminates the need to download just to verify the upload.

#### Layout Description

**Desktop:** Two-column. Left (55%): inline PDF viewer. Right (45%): file details + action buttons + upload zone (for replace).

**Mobile:** Single column. Action buttons as a sticky bar at top, PDF viewer below, upload zone below that.

#### UI Sections and Components

**If resume is uploaded:**

**Inline PDF Viewer (Left):**
- `react-pdf` component rendering the uploaded PDF
- Page navigation, zoom controls (fit-to-width, fit-to-height, +/-)
- Skeleton overlay on initial PDF render
- Contained in `rounded-xl border border-base overflow-hidden`

**File Details Panel (Right):**
- File name, file size, last modified date
- Status badge ("Visible on your profile" or "Hidden")
- Action buttons: "Download" (primary), "Replace Resume" (secondary), "Remove Resume" (ghost danger)
- Replace zone (slide-down on click): `FileUploadZone`, accept `.pdf`, max 10MB

**If no resume uploaded:**

Full page `FileUploadZone` centered with `FileText` icon, "Upload your Resume" heading, "PDF only · Max 10MB".

#### Interactive States and Behaviors

- **Drag over (whole page while resume exists):** Entire right panel highlights as a drop zone.
- **Replace warning:** "This will replace your current resume." shown before upload confirmation.
- **PDF viewer error:** "Preview unavailable. Download to view." with download button.

---

### 6.11 Events

#### Purpose

The Events page surfaces all upcoming events as visually rich cards with cover images, countdown timers, and registration status. Students can register directly from the card.

#### Layout Description

**Desktop:** Three-column card grid (`grid-cols-3 gap-6`). Filter bar at the top.  
**Mobile:** Single-column card list. Filter chips scroll horizontally above.

#### UI Sections and Components

**Filter Bar:**
- Chips: All, Upcoming, Registered, Past
- Department filter row: All, CSE, ECE, MECH, CIVIL, MBA
- Active chip: `bg-brand text-on-brand`; others: `bg-subtle text-secondary`
- Animated chip indicator via `layoutId`

**Event Card:**
- Cover image: `aspect-video rounded-xl object-cover`
- Countdown timer badge (red `font-mono`) below image if event is within 7 days
- Registration status badge: top-right corner of image
- Event title: DM Sans `text-lg font-bold` (2-line truncate)
- Date & time, Venue, Registrations count with progress bar
- Description: Inter `text-sm text-secondary`, 3-line truncate
- Action button: "Register Now" (primary) / "View Details" (secondary) / "Registered" (ghost)

**Countdown Timer:**
- Updates every second; seconds digit flips with a small vertical slide animation
- Stops updating when event starts

#### Interactive States and Behaviors

- **Filter:** Immediate filter with `AnimatePresence` on card grid. Cards exit (`scale: 0.9, opacity: 0`), enter, and reposition via `layout`.
- **Register from card:** Loading state on button, then changes to "Registered ✓" with confetti micro-burst.
- **Card click:** Navigates to event details page. Register button does NOT navigate — it registers inline.

#### Empty States

- **No events:** "No events scheduled right now. Check back soon!"
- **No registered events:** "You haven't registered for any events yet."

---

### 6.12 Event Details

#### Purpose

Full information about a single event — description, agenda, venue, registration status and count, and the ability to register or unregister.

#### Layout Description

**Desktop:** Full-width cover image (400px tall), then two-column: main content (60%) + sidebar (40%).  
**Mobile:** Full-width cover image (220px), then single column.

#### UI Sections and Components

**Cover Image Header:**
- Full-width with gradient overlay
- Event title overlaid in large text (Playfair Display `text-4xl font-bold text-white`)
- Registration status badge (top-right)

**Main Content Column:** Event description (full text), Agenda (numbered list with `font-mono` timestamps), optional Gallery.

**Sidebar:**
- Info card: Date & Time, Venue, Organizer, Category, Capacity with progress bar, Deadline
- Action button: "Register Now" (primary, full-width) or "Unregister" (ghost danger)

#### Interactive States and Behaviors

- **Register:** Loading state, then "Registration Confirmed ✓" + confetti burst + capacity counter increments.
- **Unregister:** Confirmation dialog, then reverts button.
- **Registration deadline passed:** Button disabled, "Registration Closed" badge.
- **Event past:** Banner: "This event has already taken place."

---

### 6.13 Registrations

#### Purpose

Shows all events the student has registered for, organized by status.

#### Layout Description

**Desktop and Mobile:** Two tabs at the top (Upcoming / Past). List of registration cards. Max-width 800px centered.

#### UI Sections and Components

**Registration Card:**
- Event cover image (80×80px, `rounded-lg`) on the left
- Event title, date, venue to the right
- Status badge: "Confirmed", "Cancelled", "Attended"
- Action button: "View Event" or "Cancel Registration" (ghost danger, upcoming only)

**Cancel Registration Flow:**
- Inline confirmation replaces button: "Yes, Cancel" (danger) + "Keep" (secondary)
- On confirm: card exits with slide-out animation, toast: "Registration cancelled."

#### Empty States

- **Upcoming (empty):** "No upcoming event registrations. Browse events to sign up."
- **Past (empty):** "No past events. Attend an event to see it here."

---

### 6.14 Teams

#### Purpose

Manages the student's team membership. Students can view their team, see member details, manage invitations, and invite new members.

#### Layout Description

**Desktop:** Two-column. Left (60%): My Team section. Right (40%): Pending Invitations panel.  
**Mobile:** Single column — Pending Invitations above My Team.

#### UI Sections and Components

**My Team Card:**
- Team name (DM Sans `text-2xl font-bold`) with edit icon (team creator only)
- Team description
- Member count badge: "4/6 members" with progress bar
- **Member avatars grid:** Each member 48×48px avatar with name and role badge
- Role badge: "Leader" (brand), "Member" (neutral)
- Remove button on hover (team leader only)
- "+ Invite Member" button

**Invite Member Modal:**
- Search input for name or roll number
- Live-filtering student list
- Each result: avatar + name + department
- "Send Invite" button (disabled until student selected)

**Pending Invitations Panel:**
- List of incoming invitations with team name, leader, invited date
- "Accept" (primary) and "Decline" (ghost) buttons
- Accepting: card exits with success animation, user added to team

**If no team:**
- "You're not in a team yet." CTA
- "Create a Team" → modal, or "Wait to be invited"

#### Animation Details

- Member avatar group: each avatar slides in with `0.06s` stagger.
- Invitation accept: card scales up, shows checkmark, slides out.
- Member remove: avatar exits with `scale: 0, opacity: 0`, remaining avatars slide via `layout`.

---

### 6.15 Voting

#### Purpose

Enables students to vote for classmates using a swipe-card mechanic that makes voting feel engaging rather than transactional.

#### Layout Description

**Desktop:** Centered card stack (max-width 480px). Vote instructions, card stack, action buttons below, progress indicator.

**Mobile:** Full-height swipe experience. Card fills 70% of viewport height. Large floating "Pass" and "Vote" buttons at bottom.

#### UI Sections and Components

**Header:** Category title + progress bar ("12 of 28 voted").

**Card Stack:** Stack of 3 visible cards with depth effect (0.95 and 0.9 scale for cards 2 and 3).

**Top Card (Interactive):**
- Student: avatar (64px), name, department, roll number, bio snippet
- Project section (if applicable): title, description, tech chips
- Left indicator: "PASS" in red (fades in on leftward drag)
- Right indicator: "VOTE ✓" in green (fades in on rightward drag)

**Vote Buttons:**
- "Pass": `size-14 rounded-full border-2 border-danger text-danger`
- "Vote": `size-14 rounded-full bg-brand text-on-brand`

**Empty State (all voted):** "You've voted for everyone! 🎉" + confetti animation.

#### Interactive States and Behaviors

- **Swipe right (>100px + momentum):** Card flies off-screen right. Vote cast. Next card animates up.
- **Swipe left:** Card flies left. Passed.
- **Button click:** Same as swipe animation.

#### Animation Details

- Framer Motion `drag`, `useMotionValue(x)`, `useTransform` for rotation, opacity, indicators.
- Card fly-off: spring on release, `stiffness: 200, damping: 20`.
- Stack depth: Next card animates from `scale: 0.95 to 1` as top card departs.
- Confetti on completion: particle burst animation.

#### Reduced Motion

In `prefers-reduced-motion` mode: swipe replaced by two choice buttons per candidate with no animation.

---

### 6.16 Notifications

#### Purpose

A full, filterable notifications page with smart routing — clicking a notification navigates directly to the relevant page and action.

#### Layout Description

**Desktop:** Two-column. Left: notification list with filters. Right: notification detail view on click.  
**Mobile:** Single column. Clicking a notification navigates to the relevant page.

#### UI Sections and Components

**Header:** "Notifications" + unread count badge + "Mark all as read" button.

**Filter Tabs:** All | Unread | Events | Teams | System | Announcements.

**Notification Item:**
- Left: source icon in a colored circle
- Middle: notification text with bold key noun + relative timestamp
- Right: unread dot + three-dot action menu
- On click: marks as read + navigates to relevant page

**Notification Types and Routing:**

| Type | Icon | Color | Destination |
|------|------|-------|-------------|
| Event Registration Confirmed | `Calendar` | Brand | `/events/:id` |
| Event Cancelled | `CalendarX` | Danger | `/events` |
| Team Invitation Received | `Users` | Info | `/teams` |
| Team Member Joined | `UserPlus` | Success | `/teams` |
| Admin Announcement | `Megaphone` | Warning | Full text in detail view |
| Video Approved | `Video` | Success | `/video` |
| Video Rejected | `VideoOff` | Danger | `/video` |
| Profile Reminder | `User` | Neutral | `/profile/edit` |

**Detail View (desktop right panel):** Full notification text + contextual action buttons + related metadata.

#### Interactive States and Behaviors

- **Unread notifications:** `bg-brand-subtle/30` background. On hover: `bg-subtle`.
- **Mark as read on click:** Unread dot fades out, background transitions.
- **Delete:** Three-dot menu → "Delete". Notification collapses with `height: 0, opacity: 0`.

#### Animation Details

- Notification list entrance: stagger fade-in.
- Unread dot: CSS `@keyframes ping` pulsing glow.
- Mark as read: dot opacity `1 to 0`, background color transition `duration-300`.

---

### 6.17 Settings

#### Purpose

Allows students to configure account preferences — notification settings, privacy controls, theme preference, and linked account details.

#### Layout Description

**Desktop:** Two-column. Left (220px): settings sections menu (secondary sidebar). Right: selected section's form.  
**Mobile:** Single column. Section menu as horizontal tabs or select dropdown at the top.

#### Settings Sections

**1. Account:**
- Display name (editable), Email (read-only), Google Account status, Student ID (read-only)

**2. Notifications:**
- Toggle list: Event Registration Confirmations, Team Invitations, Admin Announcements (locked on), Voting Results, Profile Reminders, Email Notifications (master toggle)

**3. Privacy:**
- Toggle: "Make my profile publicly visible"
- Toggle: "Show my resume on my public profile"
- Toggle: "Show my intro video on my public profile"

**4. Appearance:**
- Theme selector: Light / Dark / System — three card options, selected has brand outline

**5. Danger Zone:**
- "Request Account Data Export" — secondary button, separated by `border-t border-danger/30 mt-8 pt-8`

#### Interactive States and Behaviors

- Toggle switches: Radix UI `Switch` styled with brand colors. Immediate optimistic update + API call. Reverts on failure.
- Section navigation: anchor scroll to section via `id` attributes.
- Save button: appears only when a text field is dirty.

#### Animation Details

- Section transitions (desktop): crossfade when switching.
- Toggle: Radix UI's built-in smooth thumb-slide animation.

---

## 7. Light/Dark Mode Implementation

### 7.1 CSS Custom Property Strategy

All semantic color tokens are defined as CSS custom properties on the `:root` selector for light mode, and overridden in `.dark` class on the `<html>` element.

```css
/* shared/tokens.css */
:root {
  --color-bg-base:         #F8FAFC;
  --color-bg-surface:      #FFFFFF;
  --color-bg-elevated:     #FFFFFF;
  --color-bg-subtle:       #F1F5F9;
  --color-bg-inset:        #E2E8F0;
  --color-border-base:     #E2E8F0;
  --color-border-strong:   #CBD5E1;
  --color-border-brand:    #E11D48;
  --color-text-primary:    #0F172A;
  --color-text-secondary:  #475569;
  --color-text-muted:      #94A3B8;
  --color-brand:           #E11D48;
  --color-brand-hover:     #BE123C;
  --color-brand-subtle:    #FFE4E6;
}

.dark {
  --color-bg-base:         #020617;
  --color-bg-surface:      #0F172A;
  --color-bg-elevated:     #1E293B;
  --color-bg-subtle:       #1E293B;
  --color-bg-inset:        #334155;
  --color-border-base:     #1E293B;
  --color-border-strong:   #334155;
  --color-border-brand:    #F43F5E;
  --color-text-primary:    #F8FAFC;
  --color-text-secondary:  #94A3B8;
  --color-text-muted:      #475569;
  --color-brand:           #F43F5E;
  --color-brand-hover:     #FB7185;
  --color-brand-subtle:    #4C0519;
}
```

### 7.2 Tailwind Dark Mode Config

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // .dark class strategy
  theme: {
    extend: {
      colors: {
        'bg-base':        'var(--color-bg-base)',
        'bg-surface':     'var(--color-bg-surface)',
        'bg-elevated':    'var(--color-bg-elevated)',
        'bg-subtle':      'var(--color-bg-subtle)',
        'bg-inset':       'var(--color-bg-inset)',
        'border-base':    'var(--color-border-base)',
        'border-strong':  'var(--color-border-strong)',
        'border-brand':   'var(--color-border-brand)',
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted':     'var(--color-text-muted)',
        'brand':          'var(--color-brand)',
        'brand-hover':    'var(--color-brand-hover)',
        'brand-subtle':   'var(--color-brand-subtle)',
        'on-brand':       '#FFFFFF',
      },
    },
  },
};
```

By mapping Tailwind colors to CSS custom properties, the CSS variable automatically provides the dark value when the `.dark` class is on `<html>`. `dark:` variants are only needed for Tailwind-native colors not mapped to custom properties.

### 7.3 Theme Toggle Component Spec

```tsx
// components/ThemeToggle.tsx
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex size-9 items-center justify-center rounded-lg text-secondary hover:bg-subtle"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.div key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0,   opacity: 1 }}
            exit={{ rotate: 90,    opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="size-4" />
          </motion.div>
        ) : (
          <motion.div key="moon"
            initial={{ rotate: 90,  opacity: 0 }}
            animate={{ rotate: 0,   opacity: 1 }}
            exit={{ rotate: -90,   opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="size-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
```

### 7.4 Persistence (localStorage)

```tsx
// hooks/useTheme.ts
const THEME_KEY = 'elite-theme';

const useTheme = () => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | 'system' | null;
    setThemeState(stored ?? 'system');
  }, []);
  
  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  };
  
  return { theme, setTheme };
};
```

### 7.5 System Preference Detection

A small inline script in `<head>` reads `localStorage` and `prefers-color-scheme` synchronously, before React hydrates, to prevent flash-of-incorrect-theme:

```html
<!-- index.html <head> -->
<script>
  (function() {
    var stored = localStorage.getItem('elite-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((stored === 'system' || !stored) && prefersDark);
    if (dark) document.documentElement.classList.add('dark');
  })();
</script>
```

---

## 8. Responsive Design Specification

### 8.1 Breakpoint Behavior Table (Per Page)

| Page | xs (0–479px) | sm–md (480–767px) | lg (768–1023px) | xl+ (1024px+) |
|------|-------------|------------------|-----------------|---------------|
| Login | Single column (brand top, form bottom) | Single column (wider form) | Split 50/50 | Split 50/50 |
| Dashboard | Kanban horizontal scroll, sidebar hidden | Same + more padding | Sidebar visible, 2-col content | 3-col full layout |
| Profile View | Single column, full-width cover | Same | Same, max-width container | Centered 900px max |
| Edit Profile | Single col, no preview | Same | Two-col with sticky preview | Two-col |
| Portfolio (Projects) | 1-col list | 2-col list | Bento grid (6-col) | Bento grid (12-col) |
| Achievements | Single col timeline | Same | Same, wider | Max 640px centered |
| Certificates | 2-col grid | 2-col grid | 3-col grid | 3-col grid |
| Add/Edit Modal | Bottom sheet | Bottom sheet | Center modal md | Center modal |
| Intro Video | Stack (player top, actions bottom) | Same | 2-col | 2-col |
| Resume | Stack (actions sticky top, viewer below) | Same | 2-col | 2-col |
| Events | 1-col | 2-col | 3-col | 3-col |
| Event Details | Stack | Same | 2-col (content + sidebar) | 2-col |
| Registrations | 1-col list | Same | Max 800px | Max 800px |
| Teams | 1-col (invites top) | Same | 2-col | 2-col |
| Voting | Full-height swipe | Same | Centered 480px | Centered 480px |
| Notifications | 1-col list | Same | 2-col (list + detail) | 2-col |
| Settings | 1-col (tabs top) | Same | 2-col (nav + content) | 2-col |

### 8.2 Mobile-Specific Patterns

**Bottom Tab Bar:** Replaces sidebar on `< md`. Fixed 56px bottom bar with safe-area padding. The "More" tab opens a bottom sheet for secondary navigation.

**Bottom Sheets:** Modals on mobile become bottom sheets — `rounded-t-2xl`, no rounding at bottom, slides up from bottom with spring animation.

**Horizontal Scroll Lists:** Dashboard Kanban columns, event filter chips, certificate strips — all use `flex overflow-x-auto gap-3 snap-x snap-mandatory`.

**Touch Targets:** All interactive elements meet a minimum 44×44px touch target (WCAG 2.5.5).

**Sticky CTAs:** On long pages (Resume, Video, Event Details), primary action buttons are sticky at the bottom on mobile: `sticky bottom-4 px-4` with `backdrop-blur-sm bg-surface/90`.

### 8.3 Touch Targets and Gestures

| Gesture | Page | Implementation |
|---------|------|----------------|
| Horizontal swipe | Voting card | Framer Motion `drag="x"` |
| Horizontal scroll | Kanban, Certificates, Filter chips | Native `overflow-x: auto` with scroll-snap |
| Pull to refresh | Dashboard, Events, Notifications | Custom `usePullToRefresh` hook (Phase 3) |
| Long press | Portfolio cards | `onMouseDown` + `setTimeout` for context menu |
| Pinch to zoom | PDF viewer, Certificate lightbox | Native browser zoom |

---

## 9. Performance Strategy

### 9.1 Core Web Vitals Targets and How to Hit Them

#### Largest Contentful Paint (LCP) < 2.5s

LCP is the time until the largest visible element is painted.

**Strategies:**
- **Preload critical resources:** `<link rel="preload">` for the display font (Playfair Display) and above-fold cover image. `fetchpriority="high"` on hero images.
- **Route-level code splitting:** Each page is a separate chunk.
- **Image optimization:** All cover images served at WebP. Responsive images with `srcset` — 400w, 800w, 1200w variants.
- **No render-blocking fonts:** `font-display: swap` on all font-face declarations.
- **Public profile SSR (Phase 3):** Consider Vite SSR for `/profile/:roll` to improve initial load for shared links.

#### Cumulative Layout Shift (CLS) < 0.1

**Strategies:**
- **Explicit image dimensions:** All `<img>` elements have `width` and `height` attributes or use `aspect-ratio` CSS to reserve space.
- **Skeleton loaders:** Every async section has a skeleton placeholder matching exact dimensions of loaded content.
- **Font loading:** `font-display: swap` + preloading with `size-adjust` metric compensation on fallback fonts.
- **Fixed navigation:** Sidebar and top bar are `position: fixed`, never affecting document flow.
- **No top-inserting content:** Toasts appear at bottom. Banners have reserved space.

#### First Input Delay / Interaction to Next Paint (FID/INP) < 100ms

**Strategies:**
- **Defer non-critical JavaScript:** Framer Motion animations run after first contentful paint.
- **Web Workers for heavy computation:** PDF parsing in a Web Worker.
- **Virtualization:** Long lists (Notifications, large portfolios) use `react-virtual`.
- **Debounce search inputs:** 150ms debounce on Command Palette and filter inputs.
- **Avoid synchronous localStorage reads in render:** All localStorage access in `useEffect`.

### 9.2 Code Splitting Strategy

Each route is lazily loaded:

```tsx
const Dashboard = lazy(() => import('./pages/DashboardPage'));
const Profile   = lazy(() => import('./pages/ProfilePage'));
const Portfolio = lazy(() => import('./pages/PortfolioPage'));

<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

**Target chunk sizes:**
- Vendor chunk (React, React Router, Framer Motion): ~85KB gzip
- Per-route chunk: ≤ 30KB gzip
- Shared components chunk: ≤ 40KB gzip
- PDF viewer (lazy, Resume only): ~150KB gzip (acceptable — loaded on demand)

### 9.3 Image Optimization

- **Format:** WebP with JPEG fallback via `<picture>`.
- **Dimensions:** Serve 400w, 800w, 1600w variants with `srcset` and `sizes`.
- **Lazy loading:** `loading="lazy"` on images below the fold. `loading="eager" fetchpriority="high"` on hero images.
- **Blur-up placeholder:** Low-resolution base64 placeholder inline, replaced by full image on load.

### 9.4 Font Loading Strategy

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="font" type="font/woff2"
  href="[Inter woff2 URL]" crossorigin>
```

**Metric-adjusted fallback:**

```css
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
```

### 9.5 Animation Performance

All Framer Motion animations use only `transform` and `opacity` — never `width`, `height`, `top`, `left`, `margin`, or `padding` (these cause layout recalculations).

```css
.animated-card {
  will-change: transform, opacity;
}
```

Remove `will-change` after animation completes to free GPU memory.

**Scroll-reveal:** Uses `IntersectionObserver` via Framer Motion's `useInView` — not scroll event listeners. Zero scroll event performance impact.

### 9.6 Bundle Size Targets

| Chunk | Target (gzip) |
|-------|--------------|
| React + React DOM | ~42KB |
| Framer Motion | ~38KB |
| React Router | ~12KB |
| Lucide React (tree-shaken) | < 8KB |
| Design system components | < 25KB |
| Per-route average | < 20KB |
| **Total initial load** | **< 120KB gzip** |

---

## 10. Implementation Roadmap

### Phase 1 — Design System & Tokens

**Duration Estimate:** 3–4 weeks

**Goal:** Establish the foundational design system that all subsequent phases build on.

**Tasks:**

**Week 1 — Token foundation:**
- Create `shared/tokens.css` with all CSS custom properties for light mode and dark mode overrides
- Update `shared/tokens.mjs` to export all token values as JS constants
- Update `web/tailwind.config.js` to extend with token-mapped colors, fontFamily, borderRadius, boxShadow, transitionDuration, transitionTimingFunction
- Add inline theme-init script to `web/index.html`
- Add Google Fonts links to `web/index.html` (Playfair Display, Inter, DM Sans, JetBrains Mono)
- Add font-face fallback declarations with metric adjustments

**Weeks 2–3 — Base component library:**
- `Button` component — all 5 variants, 3 sizes, all states + Framer Motion press animation
- `Input`, `Textarea`, `Select` components with all states
- `Card` component — all variants + hover animation
- `Badge`, `Tag`, `Chip` components
- `Avatar` component — all sizes + group variant
- `Modal` / `Dialog` component (Radix UI `Dialog`) with desktop + mobile bottom-sheet variants
- `Toast` system (custom stack-based with Framer Motion, progress bar auto-dismiss)
- `Skeleton` loader components (text, card, avatar, video, bento grid)
- `Tabs` component (Radix UI `Tabs`) — line and pill variants
- `FileUploadZone` component (idle, drag-over, uploading, success, error states)
- `ProgressBar` and `StepIndicator` components
- `VideoPlayer` component (custom skin over HTML5 video)
- `SwipeCard` component (Framer Motion drag mechanic)

**Weeks 3–4 — Navigation infrastructure:**
- `Sidebar` component — expanded/collapsed, localStorage persistence, transition
- `BottomTabBar` component — 5 tabs, active indicator layoutId, "More" bottom sheet
- `TopBar` component — search bar, theme toggle, notification bell, user avatar
- `ThemeToggle` component + `useTheme` hook
- `CommandPalette` component — `cmdk` integration, keyboard shortcut listener (`Cmd+K`)
- `PageTransition` wrapper — `AnimatePresence` + `pageVariants`
- `AppLayout` component — assembles all navigation + `PageTransition`

**Week 4 — Motion system:**
- Create `web/src/lib/motion.ts` with all named variants and transitions
- Create `useReducedMotion` hook wrapping Framer Motion's `useReducedMotion`
- Test all animations in both motion modes
- All components implement reduced-motion variants

**Deliverable:** App shell with navigation, theme toggle, placeholder pages. Design system visually complete and consistent.

---

### Phase 2 — Core Pages

**Duration Estimate:** 4–5 weeks

**Goal:** Implement Dashboard, Profile View, and Portfolio — representing ~60% of student engagement.

**Week 1–2 — Dashboard:**
- Greeting header with dynamic time-of-day text and current date
- Profile completion banner with progress bar and action chips
- `KanbanBoard` + `KanbanCard` components
- Populate Kanban from API (student status endpoint)
- `StreakTracker` component — 7-day circles, count-up animation, best streak
- `QuickActions` 2×2 grid
- `ActivityFeed` timeline list
- `UpcomingEvents` mini-list
- All skeletons and empty states
- React Query data fetching with stale-while-revalidate

**Week 2–3 — Profile View (Public):**
- `ProfileHero` — cover image with parallax, avatar, name, bio, badges, social links
- `ProfileAbout` — bio section + skills tags
- `ProfileVideo` — embedded custom video player
- `ProfileProjects` — condensed bento grid (top 4)
- `ProfileAchievements` — condensed timeline
- `ProfileCertificates` — horizontal scroll strip
- `ProfileResume` — download card
- Public route (`/profile/:rollNumber`) without auth requirement
- `<meta>` OG tags for social sharing
- Scroll-reveal animations on all sections

**Weeks 4–5 — Portfolio:**
- `BentoGrid` layout component with `grid-cols-12` and variant span assignments
- `ProjectCard` — large (featured) and small variants + hover overlay
- `AddProjectModal` — full form (FileUploadZone, tag input, markdown preview tab)
- `AchievementsTimeline` — timeline component with scroll-reveal
- `CertificatesGrid` — grid + `Lightbox` component with keyboard navigation
- Integrate all tabs with `Tabs` component
- CRUD operations for projects, achievements, certificates
- All empty states, loading states, error states

**Deliverable:** Dashboard, Profile, and Portfolio fully functional and visually complete.

---

### Phase 3 — All Remaining Pages

**Duration Estimate:** 6–7 weeks

**Week 1:** Edit Profile page (photo crop modal with `react-image-crop`, auto-save debounce, skills tag input, social link validation, unsaved-changes protection)

**Week 2:** Intro Video page (custom video player skin, drag-and-drop upload, XHR progress with byte-level tracking, studio header with stagger animation, replace flow)

**Week 3:** Resume page (`react-pdf` viewer with page navigation and zoom, replace flow with warning, drag-and-drop, sticky mobile action bar)

**Week 4:** Events page (animated filter chips with `layoutId`, event cards with countdown timers, register-from-card with confetti, `AnimatePresence` on card grid for filter transitions)

**Week 4–5:** Event Details page (cover image header, agenda section, capacity progress bar, register/unregister) + Registrations page (tabs, registration cards, inline cancel confirmation)

**Week 5:** Teams page (member avatar grid, invite modal with student search, invitation accept/decline, create team flow)

**Week 5–6:** Voting page (swipe card stack with depth effect, Framer Motion drag mechanic, vote button animations, confetti completion state, reduced-motion fallback)

**Week 6:** Notifications page (filter tabs, notification item with routing, detail panel desktop, mark-as-read animation, delete with height collapse)

**Week 7:** Settings page (toggle switches with Radix UI, section navigation, appearance theme cards) + Login page (split layout, animated floating circles, error states)

**Week 7:** Polish pass — cross-page consistency audit, accessibility review (Lighthouse AA targets), reduced-motion verification, CLS audit with real data.

**Deliverable:** All 17 pages complete. Lighthouse Accessibility ≥ 95, Performance ≥ 85 on mobile.

---

### Phase 4 — Admin Client Token Sync

**Duration Estimate:** 1 week

**Goal:** Update the admin client to use the new red token palette. No UX changes.

**Tasks:**
- Update `admin-client/tailwind.config.js`: add the new red tonal scale values
- Import `shared/tokens.css` into the admin client's entry CSS
- Update any hardcoded hex colors in `admin-client/src/` to use token-mapped classes
- Visual regression check (manual walkthrough of all admin pages)

**Explicitly NOT in scope:** Layout changes, new components, animations, navigation changes.

**Timeline estimates per phase:**

| Phase | Duration | Dependencies |
|-------|---------|--------------|
| Phase 1 | 3–4 weeks | None |
| Phase 2 | 4–5 weeks | Phase 1 complete |
| Phase 3 | 6–7 weeks | Phase 1 complete; Phase 2 in parallel |
| Phase 4 | 1 week | Phase 1 complete |
| **Total** | **14–17 weeks** | |

---

## 11. File Structure & Code Organization

### New and Modified Files in `web/src/`

```
web/src/
├── lib/
│   ├── motion.ts               # All Framer Motion variants and transitions
│   ├── theme.ts                # Theme utility (applyTheme, getSystemTheme)
│   └── cn.ts                   # clsx + tailwind-merge utility
├── hooks/
│   ├── useTheme.ts             # Theme state, localStorage, system pref
│   ├── useCommandPalette.ts    # Command palette open/close, keyboard shortcut
│   ├── useReducedMotion.ts     # Wraps framer-motion's useReducedMotion
│   └── usePullToRefresh.ts     # Mobile pull-to-refresh (Phase 3)
├── components/
│   ├── ui/                     # Base component library
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Tag.tsx
│   │   ├── Chip.tsx
│   │   ├── Avatar.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── ToastProvider.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Tabs.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── StepIndicator.tsx
│   │   ├── FileUploadZone.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── SwipeCard.tsx
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomTabBar.tsx
│   │   ├── TopBar.tsx
│   │   ├── PageTransition.tsx
│   │   └── MoreSheet.tsx
│   └── navigation/
│       ├── CommandPalette.tsx
│       ├── NavItem.tsx
│       └── ThemeToggle.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   ├── EditProfilePage.tsx
│   ├── PortfolioPage.tsx
│   ├── VideoPage.tsx
│   ├── ResumePage.tsx
│   ├── EventsPage.tsx
│   ├── EventDetailPage.tsx
│   ├── RegistrationsPage.tsx
│   ├── TeamsPage.tsx
│   ├── VotingPage.tsx
│   ├── NotificationsPage.tsx
│   └── SettingsPage.tsx
```

### Token File Locations

```
shared/
├── tokens.css           # CSS custom properties (light + dark)
├── tokens.mjs           # JS/TS constants (colors, spacing, etc.)
└── tailwind-preset.mjs  # Extended Tailwind preset

web/
├── tailwind.config.js   # Imports shared preset + extends
└── index.html           # Theme-init script in <head>
```

### Component Folder Convention

Multi-file components use a folder:

```
components/ui/Modal/
├── index.tsx      # Main export
├── Modal.tsx      # Component logic
└── types.ts       # TypeScript types
```

Simple single-file components (Button, Badge) are single `.tsx` files.

---

## 12. Admin Client Minimal Update

The admin client (`admin-client/`) receives a token-only update. No layout, UX, animation, or navigation changes are made.

### What Changes

1. **`admin-client/tailwind.config.js`:** Extended with new red tonal scale token values. `red-600` → `#E11D48`, `red-700` → `#BE123C`, `red-500` → `#F43F5E`.

2. **CSS Custom Properties:** `shared/tokens.css` imported into admin client's entry CSS.

3. **Button colors:** Any hardcoded hex brand colors updated to token-mapped classes (`bg-brand`).

### What Does NOT Change

- Layout structure (sidebar, header, tables)
- Component architecture
- Animations (none added)
- Navigation
- Any page-level UX
- TypeScript code (unless a color class change requires it)

### Why Minimal

The admin client is used by administrative staff who depend on it daily for operational tasks. A token update ensures visual consistency (same red palette across both apps) without risking regressions in a tool that must remain stable.

---

## Appendix A — Design Token Reference

### Complete Color Token Tables

#### Light Mode — Full Table

| Token Name | CSS Variable | Hex Value | Tailwind Mapping |
|-----------|-------------|-----------|-----------------|
| Background Base | `--color-bg-base` | `#F8FAFC` | `bg-bg-base` |
| Background Surface | `--color-bg-surface` | `#FFFFFF` | `bg-bg-surface` |
| Background Elevated | `--color-bg-elevated` | `#FFFFFF` | `bg-bg-elevated` |
| Background Subtle | `--color-bg-subtle` | `#F1F5F9` | `bg-bg-subtle` |
| Background Inset | `--color-bg-inset` | `#E2E8F0` | `bg-bg-inset` |
| Border Base | `--color-border-base` | `#E2E8F0` | `border-border-base` |
| Border Strong | `--color-border-strong` | `#CBD5E1` | `border-border-strong` |
| Border Brand | `--color-border-brand` | `#E11D48` | `border-border-brand` |
| Text Primary | `--color-text-primary` | `#0F172A` | `text-text-primary` |
| Text Secondary | `--color-text-secondary` | `#475569` | `text-text-secondary` |
| Text Muted | `--color-text-muted` | `#94A3B8` | `text-text-muted` |
| Text Disabled | `--color-text-disabled` | `#CBD5E1` | `text-text-disabled` |
| Text On Brand | `--color-text-on-brand` | `#FFFFFF` | `text-on-brand` |
| Brand | `--color-brand` | `#E11D48` | `text-brand` / `bg-brand` |
| Brand Hover | `--color-brand-hover` | `#BE123C` | `bg-brand-hover` |
| Brand Active | `--color-brand-active` | `#9F1239` | `bg-brand-active` |
| Brand Subtle | `--color-brand-subtle` | `#FFE4E6` | `bg-brand-subtle` |
| Success | `--color-success` | `#16A34A` | `text-success` / `bg-success` |
| Success Subtle | `--color-success-subtle` | `#DCFCE7` | `bg-success-subtle` |
| Warning | `--color-warning` | `#D97706` | `text-warning` |
| Warning Subtle | `--color-warning-subtle` | `#FEF3C7` | `bg-warning-subtle` |
| Danger | `--color-danger` | `#DC2626` | `text-danger` / `bg-danger` |
| Danger Subtle | `--color-danger-subtle` | `#FEE2E2` | `bg-danger-subtle` |
| Info | `--color-info` | `#2563EB` | `text-info` |
| Info Subtle | `--color-info-subtle` | `#DBEAFE` | `bg-info-subtle` |
| Shadow Brand | — | `rgba(225,29,72,0.35)` | `shadow-brand` |

#### Dark Mode — Full Table

| Token Name | CSS Variable | Hex Value |
|-----------|-------------|-----------|
| Background Base | `--color-bg-base` | `#020617` |
| Background Surface | `--color-bg-surface` | `#0F172A` |
| Background Elevated | `--color-bg-elevated` | `#1E293B` |
| Background Subtle | `--color-bg-subtle` | `#1E293B` |
| Background Inset | `--color-bg-inset` | `#334155` |
| Border Base | `--color-border-base` | `#1E293B` |
| Border Strong | `--color-border-strong` | `#334155` |
| Border Brand | `--color-border-brand` | `#F43F5E` |
| Text Primary | `--color-text-primary` | `#F8FAFC` |
| Text Secondary | `--color-text-secondary` | `#94A3B8` |
| Text Muted | `--color-text-muted` | `#475569` |
| Text Disabled | `--color-text-disabled` | `#334155` |
| Brand | `--color-brand` | `#F43F5E` |
| Brand Hover | `--color-brand-hover` | `#FB7185` |
| Brand Active | `--color-brand-active` | `#E11D48` |
| Brand Subtle | `--color-brand-subtle` | `#4C0519` |
| Success | `--color-success` | `#4ADE80` |
| Success Subtle | `--color-success-subtle` | `#14532D` |
| Warning | `--color-warning` | `#FCD34D` |
| Warning Subtle | `--color-warning-subtle` | `#451A03` |
| Danger | `--color-danger` | `#F87171` |
| Danger Subtle | `--color-danger-subtle` | `#450A0A` |
| Info | `--color-info` | `#60A5FA` |
| Info Subtle | `--color-info-subtle` | `#1E3A5F` |
| Shadow Brand (dark) | — | `rgba(244,63,94,0.4)` |

### Duration Token Table

| Token | CSS Variable | Value |
|-------|-------------|-------|
| Instant | `--duration-instant` | 0ms |
| Fast | `--duration-fast` | 100ms |
| Quick | `--duration-quick` | 150ms |
| Normal | `--duration-normal` | 200ms |
| Moderate | `--duration-moderate` | 300ms |
| Slow | `--duration-slow` | 400ms |
| Deliberate | `--duration-deliberate` | 500ms |
| Lazy | `--duration-lazy` | 700ms |
| Story | `--duration-story` | 1000ms |

---

## Appendix B — Tailwind Config Extension

Complete `tailwind.config.js` for the `web` package:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (CSS custom property mappings)
        'bg-base':           'var(--color-bg-base)',
        'bg-surface':        'var(--color-bg-surface)',
        'bg-elevated':       'var(--color-bg-elevated)',
        'bg-subtle':         'var(--color-bg-subtle)',
        'bg-inset':          'var(--color-bg-inset)',
        'border-base':       'var(--color-border-base)',
        'border-strong':     'var(--color-border-strong)',
        'border-brand':      'var(--color-border-brand)',
        'text-primary':      'var(--color-text-primary)',
        'text-secondary':    'var(--color-text-secondary)',
        'text-muted':        'var(--color-text-muted)',
        'text-disabled':     'var(--color-text-disabled)',
        'on-brand':          '#FFFFFF',
        'brand':             'var(--color-brand)',
        'brand-hover':       'var(--color-brand-hover)',
        'brand-active':      'var(--color-brand-active)',
        'brand-subtle':      'var(--color-brand-subtle)',
        'success':           'var(--color-success)',
        'success-subtle':    'var(--color-success-subtle)',
        'warning':           'var(--color-warning)',
        'warning-subtle':    'var(--color-warning-subtle)',
        'danger':            'var(--color-danger)',
        'danger-subtle':     'var(--color-danger-subtle)',
        'info':              'var(--color-info)',
        'info-subtle':       'var(--color-info-subtle)',
        // Raw red tonal scale
        'red': {
          50:  '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
          950: '#4C0519',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        ui:      ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'sm':    '4px',
        DEFAULT: '6px',
        'md':    '8px',
        'lg':    '12px',
        'xl':    '16px',
        '2xl':   '20px',
        '3xl':   '24px',
      },
      boxShadow: {
        'xs':    '0 1px 2px 0 rgba(0,0,0,0.05)',
        'sm':    '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'md':    '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        'lg':    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        'xl':    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        '2xl':   '0 25px 50px -12px rgba(0,0,0,0.25)',
        'brand': '0 4px 14px 0 rgba(225,29,72,0.35)',
        'inner': 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
      },
      screens: {
        'xs':  '480px',
        '3xl': '1536px',
      },
      transitionDuration: {
        'instant':    '0ms',
        'fast':       '100ms',
        'quick':      '150ms',
        'normal':     '200ms',
        'moderate':   '300ms',
        'slow':       '400ms',
        'deliberate': '500ms',
        'lazy':       '700ms',
        'story':      '1000ms',
      },
      transitionTimingFunction: {
        'ease-out':    'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in':     'cubic-bezier(0.4, 0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-gentle': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};
```

---

## Appendix C — Framer Motion Variants Reference

Complete reference of all named animation variants. Import from `web/src/lib/motion.ts`.

```typescript
// web/src/lib/motion.ts
import { Variants, Transition } from 'framer-motion';

// ─── Transitions ─────────────────────────────────────────────────────────────

export const transitionFast: Transition     = { duration: 0.1, ease: [0.4, 0, 1, 1] };
export const transitionNormal: Transition   = { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] };
export const transitionModerate: Transition = { duration: 0.3, ease: [0, 0, 0.2, 1] };
export const transitionSlow: Transition     = { duration: 0.4, ease: [0, 0, 0.2, 1] };
export const transitionSpring: Transition   = { type: 'spring', stiffness: 400, damping: 30 };
export const transitionBounce: Transition   = { type: 'spring', stiffness: 300, damping: 15 };
export const transitionTabSpring: Transition = { type: 'spring', stiffness: 380, damping: 28 };

// ─── Page Transitions ─────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
};

export const pageVariantsBack: Variants = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: 24 },
};

export const pageFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

// ─── Modal ───────────────────────────────────────────────────────────────────

export const modalBackdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
};

export const modalPanelVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.95, y: 16 },
};

export const bottomSheetVariants: Variants = {
  hidden:  { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: 0      },
  exit:    { opacity: 0, y: '100%' },
};

// ─── Cards ───────────────────────────────────────────────────────────────────

export const cardHoverProps = {
  whileHover: { y: -4 },
  transition: transitionNormal,
};

export const buttonPressProps = {
  whileHover: { scale: 1.02 },
  whileTap:   { scale: 0.97 },
  transition: transitionFast,
};

export const iconButtonProps = {
  whileHover: { scale: 1.1 },
  whileTap:   { scale: 0.9 },
  transition: transitionFast,
};

// ─── Stagger Lists ────────────────────────────────────────────────────────────

export const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren:   0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0,  transition: transitionModerate },
};

export const staggerFastContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren:   0.05,
    },
  },
};

export const staggerFastItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0, 0, 0.2, 1] } },
};

// ─── Scroll Reveal ────────────────────────────────────────────────────────────

export const scrollRevealVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0,  transition: transitionSlow },
};

export const scrollRevealLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  show:   { opacity: 1, x: 0,   transition: transitionModerate },
};

export const scrollRevealRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  show:   { opacity: 1, x: 0,  transition: transitionModerate },
};

// ─── Toast ───────────────────────────────────────────────────────────────────

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 32, scale: 0.9 },
  animate: { opacity: 1, y: 0,  scale: 1   },
  exit:    { opacity: 0, y: 16, scale: 0.95, transition: transitionFast },
};

// ─── Chips ───────────────────────────────────────────────────────────────────

export const chipEnterVariants: Variants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1,   opacity: 1, transition: transitionSpring },
  exit:    { scale: 0.8, opacity: 0, transition: transitionFast },
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_EXPANDED_WIDTH  = 240;

export const sidebarTransition: Transition = {
  duration: 0.3,
  ease:     [0.25, 0.46, 0.45, 0.94],
};

// ─── Swipe Card ──────────────────────────────────────────────────────────────

export const SWIPE_POWER_REQUIRED = 10000;

export function getSwipePower(offset: number, velocity: number): number {
  return Math.abs(offset) * velocity;
}

export const swipeCardStackVariants = (index: number): object => ({
  scale:   1 - index * 0.05,
  y:       index * 8,
  zIndex:  10 - index,
  opacity: index < 3 ? 1 : 0,
});

// ─── Profile Parallax ────────────────────────────────────────────────────────

// Usage:
// const { scrollY } = useScroll({ target: containerRef });
// const y = useTransform(scrollY, [0, 300], [0, -60]);
// <motion.div style={{ y }} className="profile-cover" />

// ─── Reduced Motion Variants ─────────────────────────────────────────────────

export const reducedPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.1 } },
};

export const reducedStaggerItemVariants: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.2 } },
};

export const reducedScrollRevealVariants: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3 } },
};

export const reducedModalPanelVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.1 } },
};

// ─── Usage Helper ────────────────────────────────────────────────────────────

/**
 * Returns the appropriate variants based on the user's motion preference.
 *
 * @example
 * const shouldReduce = useReducedMotion();
 * const variants = selectVariants(shouldReduce, pageVariants, reducedPageVariants);
 * <motion.div variants={variants} initial="initial" animate="animate" exit="exit">
 */
export function selectVariants<T>(
  shouldReduce: boolean,
  full: T,
  reduced: T
): T {
  return shouldReduce ? reduced : full;
}

/**
 * Hook: resolves the correct set of page transition variants based on
 * navigation direction and motion preference.
 *
 * @example
 * const { pageV, transition } = usePageTransitionVariants();
 */
export function usePageTransitionVariants(direction: 'forward' | 'back' | 'tab' = 'forward') {
  // This is a utility function — in actual implementation, import useReducedMotion
  // from framer-motion and use selectVariants.
  const fullVariant =
    direction === 'tab' ? pageFadeVariants
    : direction === 'back' ? pageVariantsBack
    : pageVariants;

  return {
    fullVariant,
    reducedVariant: reducedPageVariants,
    transition:     transitionModerate,
  };
}
```

---

*End of ELITE Student Portal Comprehensive Redesign Plan*

*Document maintained by: Engineering Lead / Design Lead*  
*Review cycle: Per phase completion*  
*Last updated: October 2026*  
*Total sections: 15 | Total pages (page specs): 17*

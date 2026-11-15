# ELITE Student Portal — Dashboard Redesign Specification

> **Target Surface:** `web/src/features/dashboard/pages/DashboardPage.tsx`  
> **Evaluation Mode:** Operate (Student Engineering Cockpit)  
> **Primary Objective:** Deliver a high-efficiency, zero-clutter dashboard driven 100% by live student data—eliminating static values, broken grid layouts, redundant calls-to-action, and awkward horizontal carousels.

---

## 1. Core Principles & Architecture Rules

1. **Zero Static Data (`QUAL-1`, `UI-9`)**:
   - Every metric, completion score, status badge, timestamp, and card is strictly fed by reactive hooks ([`useDashboard`](file:///home/candy/Projects/self-intro-portal/web/src/features/dashboard/hooks/useDashboard.ts), [`useLearningHomeQuery`](file:///home/candy/Projects/self-intro-portal/web/src/features/learning/hooks/useLearningHome.ts)) and backed by Prisma database entities.
   - No mock numbers (`14 Days`, `88/100`), fake hackathons (`Microservices & Cloud Hackathon`), or static fallback dates.
2. **True Student Cockpit (`Operate` Mode)**:
   - Designed for daily academic efficiency: resume current course lesson in 1 click, view registered events, track unread notifications, and access student utility tools.
   - Avoid entertainment/streaming patterns (no nested horizontal carousels with fade masks; use stable, predictable vertical flow and responsive static grids).
3. **Intentional CTA Hierarchy (`ERR-17`, `UI-7`)**:
   - Eliminate triple-redundant `/learning` buttons.
   - The Hero action directly drives the student's next life-cycle priority (profile onboarding if `< 100%`, public showcase if complete). Course resumption is exclusively owned by the Learning Spotlight card.
4. **Zero Cumulative Layout Shift (`PERF-3`)**:
   - [`DashboardSkeleton.tsx`](file:///home/candy/Projects/self-intro-portal/web/src/features/dashboard/components/DashboardSkeleton.tsx) mirrors the exact DOM geometry and dimensions of the loaded page to eliminate layout popping during network hydration.

---

## 2. Page Anatomy & Wireframe

```
+-----------------------------------------------------------------------------------------+
| [1. HERO SPOTLIGHT CARD]                                                                |
| (O) 83% Profile Complete   Welcome back, Hemanth                                       |
|     Profile Completeness    Year 3 · Computer Science & Engineering                     |
|                            [ Complete Profile: Upload Resume -> ]  [ Public showcase ^ ] |
+-----------------------------------------------------------------------------------------+
| [2. DYNAMIC METRIC COCKPIT - 2 BALANCED TILES]                                          |
| +------------------------------------+ +----------------------------------------------+ |
| | (Clock) Course Progress            | | (Calendar) Registered Events                 | |
| | 8 Modules Active                   | | 2 Upcoming                                   | |
| | 2 in progress, 6 completed         | | Next: Web Dev Bootcamp (Nov 5)               | |
| +------------------------------------+ +----------------------------------------------+ |
+-----------------------------------------------------------------------------------------+
| [3. RESUME LEARNING SPOTLIGHT CARD]                                                     |
| (Play) Java + DSA + Interview Preparation Course                                        |
| [Thumbnail] Next: Binary Search Trees · 45%                                             |
|             [ Resume Lesson -> ]  [ Course Syllabus ]                                  |
+-----------------------------------------------------------------------------------------+
| [4. QUICK TOOLS GRID - RESPONSIVE STATIC GRID (NO CAROUSEL)]                           |
| [Resources] [Upload Video] [Add Project] [Browse Events] [View Team] [Edit Profile]    |
+-----------------------------------------------------------------------------------------+
| [5. SETUP CHECKLIST - COLLAPSIBLE ONBOARDING WIDGET]                                    |
| [v] Your Setup Progress (5 of 6 steps completed)                           [83% bar]    |
|   (Check) Photo  (Check) Bio  (Check) Skills  (Check) Project  (Check) Video  (!) Resume|
+-----------------------------------------------------------------------------------------+
| [6. TWO-COLUMN SPLIT: RECENT ACTIVITY & SIDEBAR]                                        |
| MAIN COLUMN (Col-span 2/3):           | SIDEBAR COLUMN (Col-span 1/3):                  |
| - Recent Activity Feed                | - Upcoming Department Events (Live API)         |
|   [Clear all]                         | - Active Campus Elections / Voting (Live API)   |
|   - Real UNREAD notifications only    |                                                 |
|   - Empty: "You're all caught up"     |                                                 |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Section-by-Section Engineering Breakdown

### Section 1: Hero Spotlight Card (`DashboardHero`)

* **Current Defect**:
  - Radial ring displays an ambiguous `83%` with no label explaining what it measures.
  - Primary button points to "Continue Learning", disconnecting the button from the 83% completion ring it sits next to.
  - Subtitle falls back to leaked draft copy: `"Welcome to engineering edtech student portal dashboard!"`.
* **Redesign Implementation**:
  - **Radial Ring Clarity**: Add an inner/adjacent semantic label:
    ```tsx
    <RadialRing value={completionPercentage} size={104} strokeWidth={8} className="text-brand">
      <span className="font-heading text-headline-md font-bold text-ink tabular-nums">
        {completionPercentage}%
      </span>
      <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
        Complete
      </span>
    </RadialRing>
    ```
  - **Dynamic Context Subtitle**:
    Display real academic student metadata derived from profile:
    `"Year {year} · {branch} · {currentDate}"` (e.g. *"Year 3 · Information Technology · Saturday, Oct 31"*). Fallback to polished greeting: *"Here is your academic and career overview for today."*
  - **Smart Lifecycle Action Button**:
    - **If `completionPercentage < 100`**:
      Primary button dynamically routes to the first incomplete onboarding task:
      `{nextMissing ? `Complete: ${nextMissing.label}` : 'Complete Profile'} →` (e.g., links directly to `/resume` or `/video`).
      Secondary button: `Public showcase ↗` (if `rollNo` exists).
    - **If `completionPercentage === 100`**:
      Primary button: `View Public Showcase ↗`.
      Secondary button: `Share Portfolio Link`.

---

### Section 2: Rebalanced Dynamic Metric Cockpit

* **Current Defect**:
  - The metrics row sets `grid grid-cols-1 sm:grid-cols-3 gap-4`, but renders only a single `Course Progress` tile. Columns 2 and 3 sit 100% empty on desktop viewports.
* **Redesign Implementation**:
  - Transition from an incomplete 3-column placeholder to a **balanced 2-column dynamic cockpit** (`grid grid-cols-1 md:grid-cols-2 gap-4`):
    1. **Tile 1: Course Progress** (from live LearningHub enrollments):
       - Icon: `Clock`
       - Label: `"Course Progress"` (clean, no trailing colon)
       - Value: `{courseProgress.value} Modules Active` (or `"0 Enrolled"` if new student)
       - SubLabel: `{courseProgress.subLabel}` (e.g. `2 in progress, 6 completed` or `Explore catalog`)
       - Link: `/learning`
    2. **Tile 2: Department Engagements** (from live student registrations & events):
       - Icon: `CalendarCheck`
       - Label: `"Campus Engagements"`
       - Value: `{activeRegistrationsCount} Registered`
       - SubLabel: Next upcoming event title & date, or `"Explore events"`
       - Link: `/events`
  - **Strict Constraint**: Both tiles are 100% dynamic. If a student has zero registrations, it shows `0 Registered · Browse upcoming events`—zero fake demo hackathons.

---

### Section 3: Learning Spotlight (`DashboardLearningCard`)

* **Current State**:
  - Strong, already connected to `useLearningHomeQuery`.
* **Refinements**:
  - Occupies a full-width spotlight row cleanly below the metric cards.
  - Left: Responsive aspect-video course thumbnail with play badge.
  - Right: Course Title, "Next up: {lastLessonTitle}", real percentage progress bar, and two distinct action buttons:
    - Primary: `Resume Lesson →` (routes directly to `/learning/lessons/{lastLessonId}`).
    - Secondary: `Course syllabus` (routes to `/learning/courses/{courseSlug}`).
  - If 0 courses enrolled: Displays clean empty state with direct link to browse the curated department courses.

---

### Section 4: Quick Actions Grid (`DashboardQuickActions`)

* **Current Defect**:
  - Uses a horizontal scroll carousel with hidden items (the 7th item "Resume" is hidden off-screen requiring clicking right-arrow scroll buttons).
* **Redesign Implementation**:
  - Kill the horizontal carousel wrapper and scroll arrows entirely.
  - Replace with a **clean, responsive static grid**:
    ```tsx
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {quickActions.map((action) => (
        <QuickActionCard key={action.to} action={action} />
      ))}
    </div>
    ```
  - Touch targets minimum 48px (`UI-4`).
  - All 6 core student tools always visible at a glance:
    1. `Resources` (Semester notes & materials)
    2. `Upload Video` (Self-intro pitch)
    3. `Add Project` (Portfolio showcase)
    4. `Browse Events` (Department hackathons & workshops)
    5. `View Team` (Student team workspace)
    6. `Resume` (PDF builder & ATS verification)

---

### Section 5: Profile Onboarding Checklist (`DashboardSetupChecklist`)

* **Current Defect**:
  - Uses an agile software sprint Kanban board ("To Do", "In Progress", "Done") with 3 nested columns and horizontal carousels.
  - Permanently dominates the middle of the screen even for senior students who finished all tasks years ago.
* **Redesign Implementation**:
  - Replace the Kanban board with a **compact, collapsible Onboarding Widget**:
    - **Header**: `"Profile Verification Checklist"` with a progress badge (`5 of 6 completed`) and a subtle toggle button (`Collapse` / `Expand`).
    - **Auto-State Rule**:
      - If `completionPercentage < 100`: Defaults to expanded so the student can easily see what remains.
      - If `completionPercentage === 100`: Automatically collapses into a sleek, celebratory completion bar:
        *"🎉 Profile 100% verified & recruiter-ready — [View public profile]"*, eliminating visual clutter for upperclassmen.
    - **Item Layout**: Simple, horizontal checklist chips or a single-row status pill group (`Photo`, `Bio`, `Skills`, `Resume`, `Project`, `Intro Video`).

---

### Section 6: Activity Feed & Sidebar Lower Cockpit

* **Left (Col-span 2 on large screens)**:
  - [`DashboardActivityFeed`](file:///home/candy/Projects/self-intro-portal/web/src/features/dashboard/components/DashboardActivityFeed.tsx):
    - Fetches only `status: 'UNREAD'` notifications from backend.
    - "Clear all" button marks all notifications read with immediate optimistic cache update.
    - Displays friendly, honest empty state: *"You're all caught up! No unread notifications."*
* **Right (Col-span 1 on large screens)**:
  - [`DashboardSidebar`](file:///home/candy/Projects/self-intro-portal/web/src/features/dashboard/components/DashboardSidebar.tsx):
    - **Upcoming Events**: Real events from database query (`status: 'PUBLISHED'`, sorted by date ascending).
    - **Campus Elections / Voting**: Real active voting campaigns if open (`status: 'ACTIVE'`). If none open, renders a clean, quiet empty card.

---

### Section 7: Skeleton Synchronization (`DashboardSkeleton`)

* **Current Defect**:
  - `DashboardSkeleton.tsx` renders an obsolete 4-cell layout that does not match the active page, causing heavy Cumulative Layout Shift (CLS).
* **Redesign Implementation**:
  - Re-author `DashboardSkeleton.tsx` to match the exact geometric hierarchy:
    1. Hero Skeleton: `rounded-2xl` card with circular ring cutout on left, two text bar placeholders, and button pill.
    2. Metric Row Skeleton: 2 identical `rounded-xl` cards with icon and value placeholders.
    3. Learning Card Skeleton: `rounded-2xl` card with aspect-video thumbnail placeholder and text lines.
    4. Quick Actions Skeleton: 6-item static grid of rounded square buttons.
    5. Split Column Skeleton: 2-column grid representing Activity Feed and Sidebar cards.

---

## 4. Implementation Phasing & Task Matrix

| Phase | Tasks | Target Files | Verification Method |
|---|---|---|---|
| **Phase 1: Layout & Metrics** | Rebalance metric row into 2-column dynamic grid; anchor Hero CTA to `nextMissing` task; remove leaked developer fallback text | `DashboardPage.tsx`, `useDashboard.ts` | Visual inspection, mobile & desktop responsive checks |
| **Phase 2: Quick Actions & Setup** | Replace carousel with 6-col static grid; replace agile Kanban board with compact collapsible checklist widget | `DashboardQuickActions.tsx`, `DashboardTaskBoard.tsx`, `DashboardSetupChecklist.tsx` | Touch interaction, keyboard accessibility (`tabIndex`), 100% completion state test |
| **Phase 3: Activity & Feedback** | Add confirmation/undo feedback to "Clear all" notifications; polish trailing colons & badge styling | `DashboardActivityFeed.tsx`, `students.repository.ts` | Clear all click, unread refresh test |
| **Phase 4: Zero-CLS Skeleton** | Re-engineer `DashboardSkeleton.tsx` to mirror new DOM geometry | `DashboardSkeleton.tsx` | Throttled network inspection (Vite dev server) |
| **Phase 5: Verification & Cleanup** | Delete dead `DashboardBanner.tsx`; run `impeccable critique` to verify score jump from 24/40 to >= 34/40 | Monorepo cleanup, test suites | `npm test -- --run`, `tsc --noEmit`, `npm run build` |

---

## 5. Verification Checklist

- [ ] Zero static placeholder numbers or hardcoded hackathons in code.
- [ ] No empty columns or lopsided metric rows across any screen size (360px mobile to 1920px desktop).
- [ ] All 6 Quick Action tools accessible without horizontal scroll gestures.
- [ ] Profile setup checklist collapses automatically when profile is 100% complete.
- [ ] Page transition from skeleton loader to live data produces zero visible layout shift.
- [ ] Full automated test suite passes with zero regressions (`npm test`).

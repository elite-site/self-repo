# Project File Guide: What Every File Does

Welcome to the **Self-Intro Portal** codebase!

This guide explains **every folder and file in this project** using very simple, plain English. You do not need to be an expert to understand this guide.

---

## Table of Contents

1. [Big Picture: What is this project?](#1-big-picture-what-is-this-project)
2. [How the Project is Organized](#2-how-the-project-is-organized)
3. [Files in the Main Folder (Root)](#3-files-in-the-main-folder-root)
4. [Backend (`backend/`): The Engine & Database](#4-backend-backend-the-engine--database)
   - [Core Files & Folders](#backend-core-files--folders)
   - [Database & Prisma (`backend/prisma/`)](#backend-database--prisma)
   - [Utility Scripts (`backend/scripts/`)](#backend-utility-scripts)
   - [Backend Features (`backend/src/modules/`)](#backend-features-modules)
   - [Backend Helpers & Middleware](#backend-helpers--middleware)
   - [Backend Tests (`backend/tests/`)](#backend-tests)
5. [Student & Public Website (`web/`)](#5-student--public-website-web)
   - [Core Files](#web-core-files)
   - [Feature Folders (`web/src/features/`)](#web-features)
   - [Public Pages (`web/src/pages/`)](#web-public-pages)
   - [Shared UI & Helpers (`web/src/shared/`)](#web-shared-code)
6. [Admin Control Panel (`admin-client/`)](#6-admin-control-panel-admin-client)
   - [Core Files](#admin-core-files)
   - [Admin Features (`admin-client/src/features/`)](#admin-features)
   - [Shared Admin Tools (`admin-client/src/shared/`)](#admin-shared-tools)
7. [Shared Design & Styling (`shared/`)](#7-shared-design--styling-shared)
8. [Helper Tools (`tools/`)](#8-helper-tools-tools)
9. [Documentation (`docs/`)](#9-documentation-docs)
10. [Brand Assets (`assets/`)](#10-brand-assets-assets)
11. [Quick Summary: How It All Works Together](#11-quick-summary-how-it-all-works-together)

---

## 1. Big Picture: What is this project?

The **Self-Intro Portal** is a web platform for college students.
- **Students** use it to create a profile, upload a 60-second video introducing themselves, upload their resume, show their GitHub projects, and sign up for college events or hackathons.
- **Visitors and Recruiters** can view student profiles and search for students by skills.
- **College Admins** use an admin dashboard to review videos, manage events, invite students, and approve submissions.

---

## 2. How the Project is Organized

The project is divided into three main software parts:

```
self-intro-portal/
├── backend/          → The server: handles logins, talks to the database, stores files
├── web/              → The main website: used by students and public visitors
├── admin-client/     → The admin panel: used by teachers and college administrators
├── shared/           → Colors, fonts, and styles used by both websites
├── tools/            → Helper scripts that help developers build icons and check code
├── docs/             → Written explanations, plans, and design records
└── scripts/          → Quick scripts to run the project
```

---

## 3. Files in the Main Folder (Root)

These files control the whole project and how it starts up.

| File Name | What It Is | What It Does (In Simple Words) |
| :--- | :--- | :--- |
| `package.json` | Project Recipe File | Lists all tools and libraries used across the whole project. Also contains commands like `npm run dev` to start everything. |
| `AGENTS.md` | Rule Book for Developers & AI | Contains rules and standards so that code stays clean, safe, and organized. |
| `render.yaml` | Cloud Setup File (Render) | Instructions for the Render cloud hosting service on how to build and run the backend server. |
| `vercel.json` | Cloud Setup File (Vercel) | Instructions for the Vercel hosting service on how to display the website. |
| `Students_Master_List.xlsx` | Sample Student List | An Excel spreadsheet template used to test importing a whole batch of students at once. |
| `skills-lock.json` | Coding Assistant Settings | Keeps track of settings and extensions for coding helper tools. |
| `git.env` | Git Environment Settings | Template settings for Git version control commands. |
| `github-portfolio-prompt.md` | AI Prompt Template | A set of instructions for AI to help generate nice descriptions of GitHub projects. |
| `FILE_GUIDE.md` | This Document | Explains every single file and folder in the project. |

---

## 4. Backend (`backend/`): The Engine & Database

The **backend** is the background engine. It runs on Node.js and Express. It connects to the database, sends emails, uploads files to Google Drive, and checks if users are logged in.

### Backend Core Files & Folders

| File / Folder | What It Does |
| :--- | :--- |
| `backend/package.json` | Lists the libraries the backend needs (like Express, Prisma, and JWT). |
| `backend/tsconfig.json` | Settings for TypeScript (turns TypeScript into standard JavaScript). |
| `backend/vitest.config.ts` | Settings for running backend automated tests. |
| `backend/eslint.config.mjs` | Settings that check backend code for errors and clean style. |
| `backend/src/server.ts` | The starting door of the server. It turns on the server, sets up security, and connects all routes. |
| `backend/src/README.md` | A quick note describing how the backend folders are structured. |

### Backend Database & Prisma (`backend/prisma/`)

Prisma is the tool the backend uses to talk to the SQL database.

| File / Folder | What It Does |
| :--- | :--- |
| `backend/prisma/schema.prisma` | **The database blueprint.** Defines all database tables: students, events, submissions, teams, votes, and settings. |
| `backend/prisma/seed.ts` | Adds starter data (like test students and test events) into a fresh database. |
| `backend/prisma/seedSkillsData.ts` | Seeds a list of technical skills (like Python, React, Java) so students can select them on their profile. |
| `backend/prisma/migration-diff.sql` | Notes showing differences between database updates. |
| `backend/prisma/migrations/` | History of all database changes over time. Never edit these directly. |

### Backend Utility Scripts (`backend/scripts/`)

These are helper scripts that administrators or developers can run in the terminal:

| Script File | What It Does |
| :--- | :--- |
| `backend/scripts/db-setup.ts` | Checks that the database connection is working properly. |
| `backend/scripts/import-roster.ts` | Reads an Excel file of students and adds them into the database automatically. |
| `backend/scripts/roster-parser.ts` | Reads rows and columns from student Excel spreadsheets. |
| `backend/scripts/get-oauth-token.ts` | Helps get permission from Google to store files in Google Drive. |
| `backend/scripts/verify-drive-folder.ts`| Checks if the Google Drive folder for uploads exists and works. |
| `backend/scripts/transfer-drive-folder.ts` | Moves stored files to a different Google Drive folder if needed. |
| `backend/scripts/clear-copy-protection.ts` | Fixes file sharing permissions on Google Drive. |
| `backend/scripts/cleanup-internal-event.ts` | Removes temporary test events from the database. |
| `backend/scripts/internalEventCleanup.ts` | Helper function for removing test event data. |
| `backend/scripts/migrate-if-configured.js` | Automatically updates the database when deploying to the cloud. |
| `backend/scripts/verify-env-guard.js` | Checks that important secret keys (like passwords and tokens) are set up. |
| `backend/scripts/verify-esm-interop.js` | Verifies that JavaScript module imports work properly. |
| `backend/scripts/verify-skills-seed.ts` | Verifies that the list of skills exists in the database. |

### Backend Features (`backend/src/modules/`)

The backend splits its work into clean **modules**. Each module handles one business area.

Inside each module, you will find these standard files:
- `*.routes.ts`: Sets up the web addresses (URLs) you can visit.
- `*.controller.ts`: Reads what the user sent and decides what to do.
- `*.service.ts`: Does the real work and applies business rules.
- `*.repository.ts`: Directly reads or writes to the database.
- `*.schemas.ts`: Checks that input data is correct (for example: valid email, right file format).
- `*.types.ts`: Describes the shapes of data in TypeScript.
- `index.ts`: The front door of the module that lets other modules talk to it.

Here is what each module does:

| Module Folder | What It Does |
| :--- | :--- |
| `backend/src/modules/auth/` | **Login & Security:** Handles student login, Google Single Sign-On (SSO), passwords, and session cookies. |
| `backend/src/modules/students/` | **Student Profile:** Saves student bio, technical skills, profile photo, resume, and personal links. |
| `backend/src/modules/portfolio/` | **Portfolio Items:** Lets students add personal coding projects, certificates, and achievements. |
| `backend/src/modules/events/` | **Events & Hackathons:** Manages college competitions, rules, and student sign-ups. |
| `backend/src/modules/media/` | **Media & Files:** Manages file uploads (photos, videos, resumes) and streams them safely from Google Drive. |
| `backend/src/modules/github/` | **GitHub Integration:** Fetches student GitHub repositories, languages used, and activity. |
| `backend/src/modules/moderation/` | **Review Queue:** Allows admins to watch student videos, read their resumes, and approve or reject them. |
| `backend/src/modules/announcements/` | **Notices:** Lets staff send important news and alerts to students. |
| `backend/src/modules/voting/` | **Voting:** Allows judges or students to vote for the best project in an event. |
| `backend/src/modules/email/` | **Email Sending:** Sends welcome emails, verification codes, and notification alerts. |
| `backend/src/modules/public/` | **Public Endpoints:** Gives information to public visitors who are not logged in (home page search, public profiles). |
| `backend/src/modules/admin/` | **Admin Super-Controller:** Connects admin actions (student accounts, event settings, database stats, role permissions). |

### Backend Helpers & Middleware

| Folder / File | What It Does |
| :--- | :--- |
| `backend/src/config/env.ts` | Reads environment settings (like database URL and secret keys) and makes sure none are missing. |
| `backend/src/config/constants.ts` | Important fixed numbers and words (like maximum file size, default page limits). |
| `backend/src/infrastructure/database.ts` | The single Prisma connection shared by the whole backend. |
| `backend/src/infrastructure/drive.ts` | Connects the backend to Google Drive to store videos and photos. |
| `backend/src/infrastructure/email.ts` | Connects the backend to the email service to send emails. |
| `backend/src/middleware/auth.ts` | Checks if a visitor is logged in before letting them see private pages. |
| `backend/src/middleware/errorHandler.ts` | Catches errors nicely so the server does not crash, and sends friendly error messages. |
| `backend/src/middleware/rateLimit.ts` | Prevents attackers or bots from spamming the server too fast. |
| `backend/src/middleware/upload.ts` | Safely accepts file uploads from forms. |
| `backend/src/jobs/cron.ts` | Runs scheduled tasks in the background at set times (like cleaning up old files). |
| `backend/src/utils/appError.ts` | Defines clean error types (like `NotFoundError`, `UnauthorizedError`). |
| `backend/src/utils/asyncHandler.ts` | Wraps web requests so errors are caught automatically. |
| `backend/src/utils/logger.ts` | Writes clean logs to the terminal so developers know what happened. |
| `backend/src/utils/rangeParser.ts` | Helps video players buffer and stream videos smoothly in pieces. |
| `backend/src/utils/ttlCache.ts` | Temporarily saves data in computer memory so the server answers faster. |

### Backend Tests (`backend/tests/`)

These 38 files are automated checks that test the backend code to make sure nothing is broken.
- Examples include `smoke.test.ts` (basic health check), `student.video.lifecycle.test.ts` (tests video upload and streaming), and `auth.service.test.ts` (tests login security).

---

## 5. Student & Public Website (`web/`)

The **web** folder is the main website that students, judges, and recruiters use. It is built using **React**, **Vite**, **Tailwind CSS**, and **TypeScript**.

### Web Core Files

| File / Folder | What It Does |
| :--- | :--- |
| `web/index.html` | The main HTML web page where the React application is loaded. |
| `web/src/main.tsx` | The first code file that runs in the browser. It attaches React to `index.html`. |
| `web/src/App.tsx` | The main routing map. It decides which page to show when a user visits different URLs (like `/login`, `/dashboard`, `/profile`). |
| `web/src/index.css` | The master styling file. Includes Tailwind CSS rules and design tokens. |
| `web/package.json` | Lists the libraries used by the web app (React, Lucide icons, React Query, etc.). |
| `web/vite.config.ts` | Configuration for the Vite build tool (makes the website fast to develop and fast to load). |
| `web/tailwind.config.js` | Configuration for Tailwind CSS styles. |
| `web/public/` | Static images, icons, and logos that the browser can load directly (like `favicon.svg`, `intro.svg`, logos). |

### Web Features (`web/src/features/`)

Each folder inside `web/src/features/` represents one specific section of the website:

| Feature Folder | What It Does |
| :--- | :--- |
| `web/src/features/auth/` | **Login Screen:** Login with college email, OTP entry, and sign-out buttons. |
| `web/src/features/dashboard/` | **Student Dashboard:** The student home screen showing announcements, next events, profile checklist, and video status. |
| `web/src/features/profile/` | **Edit Profile:** Where students enter their bio, upload their profile picture, choose skills, and add LinkedIn/GitHub links. |
| `web/src/features/public-profile/` | **Public Profile Page:** The clean showcase page that recruiters and outside visitors see when they open a student's public link. |
| `web/src/features/video/` | **Self-Intro Video:** Lets students record or upload their 60-second video, watch it back, and see if it was approved by the college. |
| `web/src/features/resume/` | **Resume Upload:** Lets students upload their PDF resume and view it in an online reader. |
| `web/src/features/portfolio/` | **Portfolio Tab:** Shows student projects, awards, and certificates with nice cards. |
| `web/src/features/events/` | **Events & Hackathons:** Shows upcoming college events, event details, and register buttons. |
| `web/src/features/teams/` | **Team Formation:** Lets students create a team for an event, send invite links, and accept teammate invites. |
| `web/src/features/voting/` | **Voting Page:** Shows cards for event entries where students or judges can cast their votes. |
| `web/src/features/directory/` | **Student Directory:** Search bar and filters to look up other students in the college. |
| `web/src/features/notifications/` | **Notifications:** A notification center showing news, alerts, and submission feedback. |
| `web/src/features/github/` | **GitHub Sync:** Shows repositories and coding stats pulled from the student's GitHub account. |

### Web Public Pages (`web/src/pages/`)

| File / Folder | What It Does |
| :--- | :--- |
| `web/src/pages/public/HomePage.tsx` | The front landing page of the entire website. Displays a hero greeting, featured students, search bar, and upcoming events. |
| `web/src/pages/public/components/` | Small pieces of the home page: `HomeHero.tsx` (top banner), `HomeSearchBand.tsx` (search bar), `HomeSpotlightCard.tsx` (featured student card), `HomeEventsBand.tsx` (events list). |

### Web Shared Code (`web/src/shared/`)

Reusable tools used by all pages in the website:

| Folder / File | What It Does |
| :--- | :--- |
| `web/src/shared/api/client.ts` | The HTTP helper (Axios) that talks to the backend to get and save data. |
| `web/src/shared/api/upload.ts` | Handles file uploading with progress bars (for photos, resumes, and videos). |
| `web/src/shared/layout/` | Website layout frames: `Navbar.tsx` (top navigation), `Sidebar.tsx` (side menu), `Footer.tsx` (bottom credits), `BottomTabBar.tsx` (mobile bottom navigation bar), `CommandPalette.tsx` (quick search popup). |
| `web/src/shared/ui/` | Reusable building blocks: `Button.tsx`, `Input.tsx`, `Modal.tsx`, `Card.tsx`, `Toast.tsx` (popup alerts), `Avatar.tsx`, `Skeleton.tsx` (loading placeholders), `VideoPlayer.tsx` (custom video viewer). |
| `web/src/shared/utils/` | Small helper functions: `formatDate.ts` (formats dates nicely), `cropImage.ts` (crops profile pictures), `safeUrl.ts` (checks links for safety). |
| `web/src/context/AuthContext.tsx` | Remembers if the student is currently logged in across all pages. |
| `web/src/context/ThemeContext.tsx` | Remembers if the user prefers Dark Mode or Light Mode. |

---

## 6. Admin Control Panel (`admin-client/`)

The **admin-client** is a separate, private website used only by college teachers, department heads, and administrators to manage the portal.

### Admin Core Files

| File / Folder | What It Does |
| :--- | :--- |
| `admin-client/index.html` | The main HTML page for the admin panel. |
| `admin-client/src/main.tsx` | Starts the React app for the admin panel. |
| `admin-client/src/App.tsx` | Sets up routes for admin pages (like `/moderation`, `/students`, `/analytics`). |
| `admin-client/src/index.css` | Admin styling rules. |
| `admin-client/package.json` | Lists libraries needed for the admin panel. |
| `admin-client/vite.config.ts` | Vite settings for building the admin panel. |
| `admin-client/public/` | Admin icons, logos, and security lock symbols. |

### Admin Features (`admin-client/src/features/`)

| Feature Folder | What It Does |
| :--- | :--- |
| `admin-client/src/features/moderation/` | **Review Queue:** The most important admin screen. Admins watch student intro videos, check their profiles, give feedback, and approve or reject submissions. |
| `admin-client/src/features/students/` | **Student Management:** View the master list of all students, search by roll number or branch, view details, and disable accounts if needed. |
| `admin-client/src/features/events/` | **Event Management:** Create new hackathons or workshops, write guidelines, set deadlines, and open registration. |
| `admin-client/src/features/registrations/`| **Registration & Exports:** View student teams registered for events, manage rosters, and download lists to Excel or CSV. |
| `admin-client/src/features/analytics/` | **Charts & Reports:** Shows graphs of active students, video completion rates, and event statistics. |
| `admin-client/src/features/announcements/`| **Announcements Manager:** Create and post campus-wide notices to the student dashboard. |
| `admin-client/src/features/email-automation/` | **Automated Emails:** Send reminder emails to students who haven't uploaded their videos or resumes yet. |
| `admin-client/src/features/roles/` | **Roles & Permissions:** Manage staff roles (e.g. Super Admin, Reviewer, Teacher) and choose what each person is allowed to see or change. |
| `admin-client/src/features/settings/` | **Portal Settings:** Change college name, logo, maximum upload sizes, and security options. |
| `admin-client/src/features/storage/` | **Storage Health:** Shows how much Google Drive space has been used and checks system file storage. |
| `admin-client/src/features/activity-log/` | **Audit Log:** Records a history of which admin approved which video or made changes, for accountability. |
| `admin-client/src/features/github/` | **GitHub Monitor:** Checks that GitHub student integration is working correctly. |

### Admin Shared Tools (`admin-client/src/shared/`)

| Folder / File | What It Does |
| :--- | :--- |
| `admin-client/src/shared/api/client.ts` | The API connector that talks to backend admin endpoints (`/api/admin/...`). |
| `admin-client/src/shared/layout/` | Admin layout pieces: `AdminHeader.tsx` (top bar with profile and logout), `Sidebar.tsx` (admin menu links). |
| `admin-client/src/shared/ui/` | Reusable admin elements: `LoginPage.tsx`, `Dialog.tsx`, `ConfirmDialog.tsx`, `BrandedLoading.tsx`. |
| `admin-client/src/context/AdminAuthContext.tsx` | Stores the logged-in admin's session and permissions. |

---

## 7. Shared Design & Styling (`shared/`)

Instead of duplicating colors and styles between the student website and the admin website, shared styles live in this folder:

| File Name | What It Does |
| :--- | :--- |
| `shared/tokens.css` | A file filled with CSS color variables (like `--color-primary`, `--color-background`) and font sizes. |
| `shared/tokens.mjs` | The exact same design tokens in JavaScript format so code can use them. |
| `shared/tailwind-preset.mjs` | Preset settings for Tailwind CSS that ensure both websites look consistent and share the exact same style theme. |

---

## 8. Helper Tools (`tools/`)

These are scripts created for developers to maintain and inspect the project:

| Tool File | What It Does |
| :--- | :--- |
| `tools/build-tokens.mjs` | Automatically reads the design colors and outputs `shared/tokens.css` and `shared/tokens.mjs`. |
| `tools/build-icons.py` | Python script that creates all sizes of web icons and favicons from one high-quality image. |
| `tools/vendor-fonts.py` | Downloads website fonts locally so the website loads fast without needing internet access to Google Fonts. |
| `tools/check-contrast.mjs` | Checks that text color is easy to read against background colors (good for eyesight and accessibility). |
| `tools/check-bundle-size.mjs` | Checks the file size of the built website so the website never becomes too slow or heavy to download. |
| `tools/check-migrations.mjs` | Checks that database migration files were not accidentally modified. |
| `tools/check-utilities.mjs` | Scans for duplicate utility code. |
| `tools/migrate-classes.mjs` | Helper that helps update old CSS class names to modern design token classes. |

---

## 9. Development Scripts (`scripts/`)

| File Name | What It Does |
| :--- | :--- |
| `scripts/dev.js` | **One-click developer runner.** Runs the backend, the student website, and the admin website simultaneously in your terminal with one simple command (`npm run dev`). |

---

## 10. Documentation (`docs/`)

The `docs/` folder contains in-depth documentation and engineering records:

| File / Folder | What It Does |
| :--- | :--- |
| `docs/architecture/ARCHITECTURE.md` | Explains the detailed technical design of the entire platform. |
| `docs/architecture/REFACTOR_LOG.md` | A diary of past code cleanups and structural improvements. |
| `docs/decisions/` | **Architecture Decision Records (ADRs):** Explains why certain technical choices were made (like how errors are handled, how folders are structured). |
| `docs/openapi.yaml` | The official API specification. Lists all backend endpoints and their inputs/outputs in standard OpenAPI format. |
| `docs/perf/BASELINE.md` | Speed, memory, and performance benchmark records. |
| `docs/runbooks/github-sync.md` | Step-by-step instructions for troubleshooting and running the GitHub sync job. |
| `docs/DELIVERY.md` | Deployment and delivery checklist. |

---

## 11. Brand Assets (`assets/`)

| File Name | What It Does |
| :--- | :--- |
| `assets/elite logo.png` | Official high-resolution logo for the Elite club / program. |
| `assets/sasi logo.png` | Official high-resolution logo for SASI Institute of Technology and Engineering. |

---

## 12. Quick Summary: How It All Works Together

Here is a quick example of what happens when a student uses the website:

1. **Student opens the browser:** The browser loads `web/index.html` and runs `web/src/main.tsx`.
2. **Student logs in:** `web/src/features/auth/` sends a request to the backend at `/api/auth/login`.
3. **Backend checks credentials:** `backend/src/modules/auth/auth.service.ts` looks up the student using Prisma (`backend/prisma/schema.prisma`).
4. **Student uploads video:** `web/src/features/video/` sends the video file to `backend/src/modules/media/`. The backend saves it safely to Google Drive (`backend/src/infrastructure/drive.ts`).
5. **Admin reviews video:** A teacher logs into `admin-client/`, opens `admin-client/src/features/moderation/`, watches the video, and clicks **Approve**.
6. **Student's profile goes live:** Anyone can now visit the student's public link (`web/src/features/public-profile/`) and watch their video!

---
*Created for the Self-Intro Portal team. Keep this file updated whenever adding new folders or major components.*

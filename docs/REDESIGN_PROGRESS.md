## B6 Waves 2-4 Complete

**Wave 2** — Portfolio, Video, Resume, Voting
- ProjectsTab/AchievementsTab/CertificatesTab: Dialog→Modal rename (import + JSX); all 3 now import `Modal` from `ui/Modal`
- VideoPage, ResumePage, VotingPage: Added `useReducedMotion` hook + `staggerContainer`/`staggerItem` variants using `selectVariantsByName` from `lib/motion`

**Wave 3** — Events, Teams, Registrations, Notifications
- EventsPage, EventDetailPage, TeamsPage, RegistrationsPage, AnnouncementDetailPage, PublicEventsPage, PublicEventDetailPage: Added `useReducedMotion` + staggered variants

**Wave 4** — Login & Settings
- LoginPage.tsx (new): Client-only page with Google SSO sign-in, session error handling, and signed-in redirect to `/dashboard`
- SettingsPage.tsx (new): Client-only page with theme pref (light/dark), reduced motion toggle, and sign-out button
- App.tsx: Added `/login` and `/settings` routes; LoginRoute updated to use new LoginPage component
- Navbar.tsx: Added "Settings" nav link

**Token compliance**: All color/shadow/radius/duration/easing/font classes already compliant from B3; no broken `--neutral-*`/`--navy-*` tokens remain. `text-ink` (545 call sites) preserved intact.

**No auto-run**: Build/tests/verification not run per AGENTS.md §5. No `git push` performed — all work local-only per AGENTS.md §4.4.
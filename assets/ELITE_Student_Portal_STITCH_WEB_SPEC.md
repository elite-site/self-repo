# ELITE Student Portal — Stitch Web Specification

## Purpose

This document is the screen-by-screen design and interaction specification for generating the ELITE Student Portal in Google Stitch.

The goal is to prevent missing screens, invented workflows, inconsistent navigation, and incomplete dialog behavior.

The product is a professional department portal for current IT students. It includes a student portal, a public student directory/profile experience, and an administrative control center.

The design direction is clean, minimal, professional, spacious, and modern. It should feel like a polished academic SaaS product, not a social-media clone.

**Explicitly removed:** social feed, student posts, comments, follows, direct messages, public intro-video display, public voting, public liking.

---

# 1. Product Structure

## 1.1 User surfaces

### Student surface
Authenticated with institutional Google account.

Primary areas:
- Dashboard
- Profile
- Portfolio
- Intro Video
- Resume
- Events
- Teams
- Voting
- Notifications
- My Registrations

### Public surface
Available without login.

Primary areas:
- Public Home
- Student Directory
- Public Student Profile
- Public Resume Viewer
- Public Events / Public Results where enabled

### Admin surface
Authenticated administrative accounts.

Primary areas:
- Dashboard
- Students
- Moderation
- Events
- Event Registrations
- Voting
- Communications
- Email Automation
- Analytics
- Exports
- Storage
- Roles & Permissions
- Audit Logs
- Settings

---

# 2. Global Design System

## 2.1 Visual personality

Use:
- White or very light neutral background.
- One restrained ELITE brand accent.
- Dark text with clear hierarchy.
- Subtle borders.
- Soft card elevation, not heavy glassmorphism.
- Medium corner radius.
- Generous spacing.
- Clean data tables.
- Simple status badges.
- Professional typography.
- Very limited decorative gradients.
- Minimal animations.
- Clear hover/focus states.
- Strong accessibility contrast.

Avoid:
- Social-media layouts.
- Infinite feeds.
- Excessive neon.
- Excessive glass effects.
- Overly rounded cartoon UI.
- Dense dashboards where a simpler card would work.
- Giant hero illustrations that consume functional space.

## 2.2 Layout

Desktop:
- Student portal: 240px-ish left sidebar.
- Admin portal: compact but expandable left sidebar.
- Main content has max-width and generous horizontal padding.
- Header contains page title, contextual action, notifications, and account control.

Mobile:
- Student portal uses bottom navigation.
- Admin portal uses a menu drawer.
- Primary actions remain reachable without horizontal scrolling.
- Tables become cards or horizontally scrollable data regions where necessary.
- Dialogs become near-full-screen sheets for complex forms.

## 2.3 Components

Create a shared component language for:
- Buttons.
- Inputs.
- Selects.
- Search.
- Multi-select.
- Tabs.
- Chips.
- Status badges.
- Cards.
- Tables.
- Pagination.
- Date pickers.
- File upload zones.
- Progress bars.
- Alerts.
- Toast notifications.
- Dialogs.
- Drawers.
- Tooltips.
- Confirmation prompts.
- Empty states.
- Skeleton loading states.

## 2.4 Status colors

Do not rely on color alone. Pair status with icon and text.

Suggested semantic states:
- Draft.
- Pending.
- Under review.
- Approved.
- Rejected.
- Changes requested.
- Published.
- Hidden.
- Archived.
- Open.
- Closed.
- Active.
- Inactive.
- Failed.

---

# 3. Global Navigation

## 3.1 Student desktop navigation

Sidebar:
1. Dashboard
2. My Profile
3. Portfolio
4. Intro Video
5. Resume
6. Events
7. My Registrations
8. Voting
9. Notifications

Footer:
- Help / policy link
- Account
- Sign out

## 3.2 Student mobile navigation

Bottom navigation:
- Home
- Profile
- Portfolio
- Events
- Notifications

Use a More sheet for:
- Intro Video
- Resume
- My Registrations
- Voting
- Account

## 3.3 Public navigation

Header:
- ELITE logo
- Home
- Students
- Events
- Search
- Optional Sign In

Footer:
- ELITE information
- Department information
- Contact
- Policies

## 3.4 Admin navigation

Sidebar:
1. Dashboard
2. Students
3. Moderation
4. Events
5. Registrations
6. Voting
7. Communications
8. Analytics
9. Exports
10. Storage
11. Roles & Permissions
12. Audit Logs
13. Settings

Admin account menu:
- Profile
- Security
- Sign out

---

# 4. SCREEN INVENTORY

## Student Screens

### STU-01 Login

Purpose:
Allow current IT students to authenticate through institutional Google SSO.

Layout:
- ELITE logo.
- Portal name.
- Brief description.
- Large “Continue with College Google Account” button.
- Institution-domain note.
- Help/support text.

States:
- Default.
- Loading.
- Authentication error.
- Account not eligible.
- Account inactive.
- Session expired.

Do not show:
- Roll-number/password fields.
- Password recovery flow.

Dialogs:
- None in the normal flow.
- Optional account-not-eligible alert dialog.

---

### STU-02 First-Time Onboarding

Purpose:
Introduce the student to the portal after first successful authentication.

Content:
- Welcome message.
- Student name and authoritative academic identity.
- Profile completion summary.
- Required vs optional sections.
- “Complete Profile” CTA.
- “Go to Dashboard” secondary action.

Dialog:
**Profile information notice**
Explain that name, roll number, year, section, and college email come from the student record and can only be corrected through a change request.

---

### STU-03 Dashboard

Purpose:
Primary student home.

Sections:
1. Greeting and profile photo.
2. Profile completion card.
3. Action-required section.
4. Upcoming events.
5. Current voting campaigns if eligible.
6. Recent notifications.
7. Portfolio summary.
8. Submission statuses.

Example cards:
- Profile: 72% complete.
- Intro video: Approved.
- Resume: Under review.
- Projects: 2 of 3 configured limit.
- Certificates: 4 verified.

Dialogs:
- Required action detail.
- Notification preview.
- Event quick-view.

Empty states:
- No upcoming events.
- No active voting.
- No pending actions.

---

### STU-04 My Profile

Purpose:
Read-only presentation of the student's own full profile.

Header:
- Profile photo.
- Name.
- Roll number.
- Year / section.
- Biography.
- Social links.

Sections:
- About.
- Skills.
- Projects.
- Achievements.
- Certificates.
- Resume summary.
- Profile completion.

Primary action:
“Edit Profile”

Secondary actions:
- Manage projects.
- Manage achievements.
- Manage certificates.
- Manage resume.

Dialogs:
- Profile photo preview.
- Resume viewer.
- Certificate preview.

---

### STU-05 Edit Profile

Use section cards, not one massive form.

Cards:
1. Profile photo.
2. Basic professional information.
3. Biography.
4. Skills.
5. Professional links.
6. Academic information change request.

Profile photo behavior:
- Replace photo.
- JPG / PNG / WebP.
- 5 MB maximum.
- Upload preview.
- Crop or simple framing if supported.

Biography:
- Maximum 300 characters.
- Live character count.

Skills:
- Search predefined skill list.
- Selected chips.
- “Request new skill” action.

Professional links:
- GitHub.
- LinkedIn.
- Portfolio.

Dialog:
**Request Academic Information Change**
Fields:
- Field to change.
- Current value.
- Requested value.
- Reason.
- Submit request.

Confirmation:
“Submit this change request?”

Success:
“Request submitted for admin review.”

---

### STU-06 Portfolio

Purpose:
Central portfolio management page.

Top tabs:
- Projects
- Achievements
- Certificates

Project card:
- Title.
- Description preview.
- Technologies.
- GitHub link.
- Google Drive video link.
- Approval status if applicable.
- Drag handle / reorder control.

Actions:
- Add.
- Edit.
- Reorder.
- Remove.

Achievement card:
- Title.
- Category.
- Organization.
- Date.
- Status.
- Proof indicator.

Certificate card:
- Title/issuer metadata.
- Verification status.
- File preview.

Dialogs:
- Add/edit project.
- Delete project confirmation.
- Add/edit achievement.
- Upload certificate.
- Certificate preview.
- Reorder confirmation only if needed.

---

### STU-07 Add / Edit Project Dialog

Fields:
- Project title.
- Description.
- Technologies used.
- GitHub URL.
- Google Drive video URL.

Actions:
- Save.
- Cancel.

Validation:
- Required title.
- Clear URL error.
- Description length guidance.
- Project count limit notice.

Do not:
- Add comments.
- Add likes as a creation field.
- Add social-feed publishing.

---

### STU-08 Add / Edit Achievement Dialog

Fields:
- Achievement title.
- Description.
- Date.
- Organization.
- Category.
- Proof upload.

Show:
- Category management source.
- Moderation requirement.
- Current status.

Actions:
- Save draft.
- Submit for review.

---

### STU-09 Certificate Upload Dialog

Fields:
- Certificate title.
- Issuer.
- Date if required.
- Upload file.

States:
- Drag/drop.
- Uploading.
- Validation error.
- Uploaded.
- Review pending.

Confirmation:
“Submit certificate for verification?”

---

### STU-10 Intro Video

Purpose:
Manage one active introduction video.

Layout:
- Large video area.
- Current status badge.
- Upload/replacement action.
- Submission history summary.
- Review message.

States:
1. No video.
2. Uploading.
3. Uploaded / pending.
4. Under review.
5. Approved.
6. Rejected.
7. Changes requested.
8. Replacing existing approved video.

Important behavior:
- One active video.
- Student may replace it.
- Student can download their own video.
- Public profile does not show the intro video.

Dialogs:
**Replace video confirmation**
Explain whether previous approved version remains active during review.

**Reject / changes reason view**
Read-only for student.

**Delete video confirmation**
Only if deletion policy permits.

---

### STU-11 Resume

Purpose:
Manage one student resume.

States:
- No resume.
- Uploading.
- Pending review.
- Approved.
- Rejected.
- Replacement pending.

Main card:
- Resume filename.
- Uploaded date.
- Status.
- View.
- Replace.

Viewer:
- Embedded PDF viewer.
- No intentional download button.

Dialogs:
- Replace resume confirmation.
- Submit for review confirmation.
- Rejection reason.

---

### STU-12 Events

Purpose:
Browse relevant department events.

Card:
- Event title.
- Banner/thumbnail.
- Date.
- Registration status.
- Eligibility.
- Registration deadline.
- Team requirement.
- CTA.

Filters:
- Open.
- Upcoming.
- Registered.
- Completed.

Search:
- Event name.

Empty states:
- No events available.
- No active registrations.

---

### STU-13 Event Details

Layout:
- Event title.
- Banner.
- Description.
- Important dates.
- Eligibility.
- Registration fields summary.
- Team requirement.
- Rules.
- Registration status.
- Register CTA.

Dialogs:
**Registration confirmation**
Summary of fields before submit.

**Event registration success**
Registration ID/status.

**Ineligible**
Show reason without exposing hidden administrative logic.

---

### STU-14 Event Registration Dialog

This is an important complex dialog.

Sections:
1. Personal details.
2. Event-specific custom fields.
3. Team details when enabled.
4. Consent/confirmation if required.

Custom fields may include:
- Team name.
- Contact number.
- Role.
- Questions.
- Participation category.

Footer:
- Back.
- Continue.
- Submit Registration.

Validation:
- Required fields.
- Team limits.
- Duplicate registration.
- Registration deadline.

Error dialog:
“Registration could not be completed.”

---

### STU-15 Team Management

Only visible when a registered event uses teams.

Views:
- My teams.
- Pending invitations.
- Team details.

Team card:
- Event.
- Team name.
- Owner.
- Members.
- Status.

Actions:
- Create team.
- Add member.
- Invite.
- Accept invitation.
- Decline invitation.
- Leave team if policy permits.

Dialogs:
**Create Team**
- Team name.
- Member identifiers.

**Invite Member**
- Student search.
- Selected student.
- Send invitation.

**Accept invitation**
Confirmation.

**Decline invitation**
Confirmation with optional reason.

**Remove member**
Permission-based confirmation.

---

### STU-16 My Registrations

Table/list:
- Event.
- Registration date.
- Status.
- Team.
- Last updated.
- View details.

Click opens:
Registration detail drawer or page.

Dialog:
- Cancel registration if event rules allow.

---

### STU-17 Voting

Purpose:
Show active eligible campaigns.

Campaign card:
- Event/campaign title.
- Time remaining.
- Eligibility.
- Rule summary.
- Enter voting CTA.

States:
- Not started.
- Active.
- Closed.
- No eligible campaigns.

No public voting.

---

### STU-18 Voting Details

Layout:
- Campaign header.
- Voting rule explanation.
- Candidate cards.
- Vote state.
- Remaining voting capacity if applicable.
- Submit vote.

Candidate card:
- Profile photo.
- Name.
- Year/section.
- Approved public-profile information.
- Vote action.

Dialog:
**Confirm vote**
Clearly state the candidate(s) being selected and the rule.

Error:
- Already voted.
- Vote limit reached.
- Voting closed.
- Not eligible.

Success:
“Your vote was recorded.”

---

### STU-19 Notifications

Layout:
- Header.
- Filter chips.
- Categories.
- Priority.
- Unread count.

Notification row:
- Icon.
- Title.
- Short message.
- Time.
- Read/unread state.
- Action link when useful.

Actions:
- Mark as read.
- Mark all as read.
- Filter.

Dialog:
- Notification detail.

---

# 5. PUBLIC SCREENS

## PUB-01 Public Home

Purpose:
Explain the ELITE student portal.

Hero:
- ELITE branding.
- Department/student showcase message.
- Browse Students CTA.
- Events CTA.

Sections:
- Student showcase.
- Portfolio concept.
- Events.
- Department information.

Do not:
- Show a social feed.
- Show student videos.

---

## PUB-02 Student Directory

Purpose:
Discover public student profiles.

Header:
- Search.
- Filters.
- Sort.

Search:
- Name.
- Roll number.

Filters:
- Year.
- Section.
- Skills.

Sort:
- Latest profiles.

Student card:
- Profile photo.
- Name.
- Year/section.
- Bio preview.
- Skills.
- Portfolio indicators.
- Open Profile CTA.

Do not:
- Auto-play videos.
- Embed intro videos.
- Provide public vote/like controls.

States:
- Loading.
- No results.
- Error.
- Filtered results.

---

## PUB-03 Public Student Profile

Public header:
- Profile photo.
- Name.
- Year / section.
- Bio.
- Skills.
- GitHub.
- LinkedIn.
- Portfolio.

Sections:
- About.
- Projects.
- Achievements.
- Certificates.
- Resume.

Resume:
- Embedded PDF viewer if approved and public.

Do not display:
- Intro video.
- Private contact details.
- Admin notes.
- Moderation states.
- Voting controls.
- Like controls.
- Internal IDs.

Dialog:
- Certificate viewer.
- Resume full-screen viewer on mobile.

---

## PUB-04 Public Resume Viewer

Full-screen or focused document viewer.

Header:
- Student name.
- Resume title.
- Close/back.

Body:
- Embedded PDF.

No intentional download CTA.

---

## PUB-05 Public Events

Show public events where enabled by event settings.

Card:
- Event name.
- Date.
- Description.
- Status.
- Public rules.

Registration:
- Requires authenticated student when appropriate.

---

# 6. ADMIN SCREENS

## ADM-01 Admin Login

Institution/admin authentication.

Show:
- ELITE admin branding.
- Secure admin sign-in.
- Account status.

Do not show student password workflow unless a separate administrator identity system exists.

---

## ADM-02 Admin Dashboard

Purpose:
Operational command center.

KPI cards:
- Active students.
- Profile completion.
- Pending moderation.
- Upcoming events.
- Active voting.
- Votes.
- Email delivery.
- Storage.

Action queues:
- Pending videos.
- Pending resumes.
- Pending achievements.
- Pending certificates.
- Student change requests.
- Failed automations.

Charts:
- Submissions over time.
- Event registrations.
- Voting participation.
- Email delivery.
- Profile completion.

Alerts:
- Failed emails.
- Storage threshold.
- Upcoming deadlines.
- Open moderation queue.

Click-through:
Every KPI should open its corresponding filtered module.

---

## ADM-03 Students

Purpose:
Manage student population.

Table columns:
- Photo.
- Name.
- Roll number.
- Year.
- Section.
- Profile completion.
- Status.
- Public visibility.
- Last activity.

Filters:
- Year.
- Section.
- Status.
- Completion range.
- Public/private.
- Has/does not have intro video.
- Has/does not have resume.

Actions:
- Open student.
- Change status.
- View profile.
- Review submissions.

Bulk actions where permitted:
- Export.
- Change status.
- Visibility action.

Dialog:
**Change student status**
- Current status.
- New status.
- Consequences summary.
- Reason.
- Confirm.

---

## ADM-04 Student Details

Use a detailed page/drawer.

Header:
- Student identity.
- Status.
- Public profile link.
- Featured state.
- Last activity.

Tabs:
- Overview.
- Profile.
- Portfolio.
- Submissions.
- Events.
- Voting.
- Notifications.
- Audit.

Actions:
- Feature/unfeature.
- Manage visibility.
- Change status.
- Review content.
- View change requests.

Dialogs:
**Feature student**
- Explain featured placement.

**Unfeature student**
- Confirmation.

**Manage public visibility**
- Field/category toggles.

**Status change**
- Same status control as Students page.

---

## ADM-05 Moderation

Purpose:
Review student-submitted content.

Tabs:
- Intro Videos.
- Resumes.
- Achievements.
- Certificates.
- Other configurable content.

Filters:
- Pending.
- Under review.
- Approved.
- Rejected.
- Changes requested.
- Student.
- Date.
- Event/category.

Review layout:
Left/main: content.
Right: student metadata and moderation controls.

Actions:
- Approve.
- Reject.
- Request changes.
- Hide.
- Publish if separately controlled.

Dialog:
**Approve**
- Optional note.
- Confirm.

Dialog:
**Reject**
- Required reason.
- Optional internal note.
- Confirm.

Dialog:
**Request Changes**
- Required explanation.
- Student-facing message.
- Confirm.

Dialog:
**Hide**
- Reason.
- Confirm.

---

## ADM-06 Events

List:
- Event name.
- Status.
- Registration window.
- Voting window if enabled.
- Target audience.
- Registrations.
- Teams.
- Owner.

Actions:
- Create event.
- Edit.
- Duplicate.
- Archive.
- Publish.
- Close.

Dialog:
**Create Event**

Sections:
1. Basics.
2. Dates.
3. Eligibility.
4. Registration.
5. Teams.
6. Notifications.
7. Voting.
8. Public visibility.

The event form should not become one giant unstructured dialog. Use a multi-step or tabbed dialog with progress.

---

## ADM-07 Event Configuration

Dedicated configuration screen after event creation.

Tabs:
- Overview.
- Registration Form.
- Eligibility.
- Teams.
- Notifications.
- Voting.
- Public Presentation.
- History.

Registration Form:
- Add field.
- Required/optional.
- Reorder.
- Delete.

Dialog:
**Add Registration Field**
Field types:
- Text.
- Number.
- Phone.
- Select.
- Multi-select.
- Checkbox.
- Text area.
- Student identifier.

---

## ADM-08 Event Registrations

Purpose:
Operational registration management.

Views:
- Table.
- Team view.

Filters:
- Status.
- Year.
- Section.
- Team.
- Registration date.

Row actions:
- View.
- Approve/reject if configured.
- Cancel.
- Export.

Drawer:
Registration detail with:
- Student.
- Answers.
- Team.
- Status history.

---

## ADM-09 Team Administration

Team detail:
- Team name.
- Event.
- Leader.
- Members.
- Invitation states.
- Team status.

Actions:
- Add/remove member.
- Change leader if policy allows.
- Mark complete.
- Reject team if event rules allow.

Dialog:
**Remove member**
- Confirmation.
- Reason.

---

## ADM-10 Voting Management

Campaign list:
- Campaign.
- Event.
- Status.
- Start.
- End.
- Eligible voters.
- Candidate count.
- Vote count.

Create campaign wizard:
1. Basics.
2. Candidates.
3. Voter eligibility.
4. Voting rule.
5. Schedule.
6. Results.
7. Notifications.
8. Review and activate.

Voting rule examples shown conceptually:
- One vote total.
- Vote once per candidate.
- Fixed number of selections.

Do not hard-code one rule.

Dialog:
**Activate voting**
Show:
- Voter audience.
- Rule.
- Opening time.
- Closing time.
- Candidate count.
- Result visibility.

Require clear final confirmation.

---

## ADM-11 Voting Results

Sections:
- Live or final state.
- Total valid votes.
- Participation rate.
- Candidate totals.
- Timeline.

Actions:
- Export.
- Finalize results where policy permits.

Dialog:
**Finalize results**
Warn that the campaign will enter a final-results state.

---

## ADM-12 Communications

Combine:
- Announcements.
- Notifications.
- Audience targeting.

Tabs:
- Announcements.
- Notifications.
- Scheduled.
- History.

Create announcement:
- Title.
- Message.
- Audience.
- Priority.
- Channels.
- Schedule.

Audience selector:
- All IT students.
- Year.
- Section.
- Event participants.
- Specific students.
- Custom groups.

Dialog:
**Preview announcement**
Show effective audience count.

Confirmation:
“Publish to X recipients?”

---

## ADM-13 Email Automation

Purpose:
Visual automation management.

List:
- Automation name.
- Trigger.
- Condition summary.
- Recipient group.
- Schedule.
- Status.
- Last run.

Actions:
- Create.
- Edit.
- Duplicate.
- Test.
- Activate.
- Pause.
- Archive.

Automation builder:
Step 1: Trigger.
Step 2: Conditions.
Step 3: Audience.
Step 4: Template.
Step 5: Schedule if needed.
Step 6: Review.

Triggers:
- Student action.
- Admin action.
- Event action.
- Voting action.
- Scheduled.
- Condition-based.

Condition examples:
- Student incomplete.
- Content approved.
- Event approaching.
- Registration pending.
- Voting opening.
- Voting closing.

---

## ADM-14 Email Template Editor

Sections:
- Template name.
- Subject.
- Body.
- Variables/placeholders.
- Sender identity.
- Status.

Actions:
- Save draft.
- Preview.
- Send test.
- Activate.

Dialog:
**Send test email**
- Test recipient.
- Preview.
- Confirm.

Dialog:
**Activate template**
- Show trigger/automation relationships.
- Confirm.

---

## ADM-15 Email History

Columns:
- Recipient.
- Automation.
- Template.
- Event.
- Sent date.
- Status.
- Error if failed.

Filters:
- Delivered.
- Failed.
- Pending.
- Date.
- Event.
- Automation.

Drawer:
Email detail and delivery event history.

---

## ADM-16 Analytics

Dashboard:
- Student activity.
- Profile completion.
- Content submissions.
- Moderation.
- Events.
- Voting.
- Likes where enabled.
- Public views where tracked.
- Email delivery.

Controls:
- Date range.
- Event.
- Year.
- Section.
- Content type.

Charts should be visually simple.

---

## ADM-17 Exports

Purpose:
Build custom data exports.

Step 1:
Select dataset.

Step 2:
Select fields.

Step 3:
Filters.

Step 4:
Preview rows/count.

Step 5:
Export.

Supported datasets:
- Students.
- Profiles.
- Projects.
- Achievements.
- Certificates.
- Submissions.
- Events.
- Registrations.
- Teams.
- Votes.
- Likes.
- Notifications.
- Emails.
- Analytics.
- Audit.

Dialog:
**Export confirmation**
Show:
- Dataset.
- Filters.
- Selected columns.
- Estimated row count.

---

## ADM-18 Storage

Tabs:
- Providers.
- Content mapping.
- File policies.
- Retention.
- Cleanup.

Provider management:
- Choose provider.
- Connection status.
- Test connection.

Content mapping:
- Intro videos.
- Resumes.
- Certificates.
- Profile photos.
- Project videos.
- Other configured media.

File policy:
- Allowed formats.
- Size limit.
- Destination.
- Visibility.
- Retention.

Dialog:
**Change storage provider**
Warn about impact.

Dialog:
**Test provider**
Show success/failure.

---

## ADM-19 Roles & Permissions

Role list:
- Super Admin.
- Admin.
- Event Manager.
- Moderator.
- Custom roles.

Role detail:
Permission groups:
- Students.
- Profiles.
- Portfolio.
- Moderation.
- Events.
- Voting.
- Communications.
- Analytics.
- Exports.
- Storage.
- Audit.
- System.

Permission levels may include:
- View.
- Create.
- Edit.
- Approve.
- Publish.
- Delete/archive.
- Export.
- Configure.

Dialog:
**Create Role**
- Name.
- Description.
- Permission selection.

Dialog:
**Change Permissions**
- Current access.
- New access.
- Impact summary.
- Confirm.

---

## ADM-20 Audit Logs

Purpose:
Complete administrative audit history.

Columns:
- Timestamp.
- Actor.
- Role.
- Action.
- Entity.
- Entity ID/identifier where appropriate.
- Result.

Filters:
- Actor.
- Role.
- Action.
- Module.
- Student.
- Event.
- Date.

Detail drawer:
- Full event.
- Before state.
- After state.
- Reason.
- Context.

No editing of audit records.

---

## ADM-21 Settings

Grouped settings:
- Portal identity.
- Student policy.
- Profile requirements.
- Visibility policy.
- Skills.
- Categories.
- Approval rules.
- Event defaults.
- Voting defaults.
- Notification defaults.
- Email defaults.
- Storage defaults.
- Retention.
- Public directory.
- Student inactive-status behavior.

Danger zone:
- Disable module.
- Archive configuration.
- System-level changes.

Dialog:
**Save global settings**
Show affected modules.

---

# 7. GLOBAL DIALOG INVENTORY

The following dialogs must be explicitly considered in Stitch designs.

## DLG-01 Session Expired
Message: Your session has expired. Sign in again to continue.
Action: Sign in.

## DLG-02 Account Not Eligible
Message: This account is not currently eligible for the IT student portal.
Action: Contact support.

## DLG-03 Sign Out
Confirm sign out.

## DLG-04 Request Academic Change
Fields: field, current value, new value, reason.

## DLG-05 Request New Skill
Fields: requested skill name, reason/category.

## DLG-06 Replace Profile Photo
Show current/new preview and confirmation.

## DLG-07 Add Project
Project fields.

## DLG-08 Edit Project
Project fields prefilled.

## DLG-09 Delete Project
Confirm deletion.

## DLG-10 Add Achievement
Achievement fields.

## DLG-11 Edit Achievement
Achievement fields prefilled.

## DLG-12 Upload Certificate
Certificate file and metadata.

## DLG-13 Delete Certificate
Confirm.

## DLG-14 Replace Intro Video
Explain active/pending version behavior.

## DLG-15 Delete Intro Video
Confirm, if deletion is enabled.

## DLG-16 Upload Resume
Resume file upload.

## DLG-17 Replace Resume
Explain review implications.

## DLG-18 View Review Reason
Read-only detail.

## DLG-19 Register for Event
Registration summary.

## DLG-20 Add Team
Team name and members.

## DLG-21 Invite Team Member
Search and invite.

## DLG-22 Accept Team Invitation
Confirm acceptance.

## DLG-23 Decline Team Invitation
Confirm decline.

## DLG-24 Remove Team Member
Confirm and reason.

## DLG-25 Cancel Registration
Confirm.

## DLG-26 Confirm Vote
Show exact selection and voting rule.

## DLG-27 Vote Success
Success result.

## DLG-28 Notification Detail
Full message and deep link.

## DLG-29 Admin Approve
Optional reviewer note.

## DLG-30 Admin Reject
Required reason.

## DLG-31 Admin Request Changes
Student-facing required explanation.

## DLG-32 Hide Content
Reason and confirmation.

## DLG-33 Feature Student
Confirm featured status.

## DLG-34 Unfeature Student
Confirm.

## DLG-35 Change Student Status
Current state, new state, consequences, reason.

## DLG-36 Create Event
Use multi-step event configuration.

## DLG-37 Publish Event
Preview audience and event settings.

## DLG-38 Close Event
Confirm closure and effect on registration.

## DLG-39 Archive Event
Confirm archival.

## DLG-40 Add Registration Field
Field label, type, required state, options.

## DLG-41 Delete Registration Field
Explain existing registration impact.

## DLG-42 Approve Registration
Confirm.

## DLG-43 Reject Registration
Reason.

## DLG-44 Create Voting Campaign
Wizard rather than flat dialog.

## DLG-45 Activate Voting
Final campaign summary.

## DLG-46 Close Voting
Confirm.

## DLG-47 Finalize Results
Strong warning and final confirmation.

## DLG-48 Create Announcement
Message + targeting + channels.

## DLG-49 Preview Announcement
Effective audience and rendered message.

## DLG-50 Publish Announcement
Confirm recipient count.

## DLG-51 Create Email Automation
Wizard.

## DLG-52 Test Email
Recipient + rendered preview.

## DLG-53 Activate Automation
Show trigger, audience, schedule.

## DLG-54 Pause Automation
Confirm.

## DLG-55 Archive Automation
Confirm.

## DLG-56 Create Email Template
Template editor.

## DLG-57 Activate Template
Confirm.

## DLG-58 Create Storage Provider
Provider details.

## DLG-59 Change Storage Provider
Impact warning.

## DLG-60 Test Storage Connection
Success/failure state.

## DLG-61 Create Role
Role name + permissions.

## DLG-62 Change Role Permissions
Impact summary.

## DLG-63 Save System Settings
Affected-area summary.

## DLG-64 Export Confirmation
Dataset, filters, fields, count.

---

# 8. DRAWERS

Use drawers for dense but contextual information.

Student drawers:
- Student quick details.
- Notification detail.
- Registration detail.
- Submission history.
- Email detail.

Admin drawers should preserve the underlying list so an operator can close the drawer and continue working.

Complex forms should use full pages or large dialogs rather than narrow drawers.

---

# 9. REQUIRED UI STATES

Every major screen must be generated with:

1. Default.
2. Loading.
3. Empty.
4. Success.
5. Validation error.
6. Permission denied.
7. Network/server failure.
8. No results.
9. Filtered results.
10. Destructive-action confirmation where applicable.

Content workflows additionally require:
- Draft.
- Pending.
- Under review.
- Approved.
- Rejected.
- Changes requested.
- Hidden.
- Archived.

Event workflows additionally require:
- Draft.
- Scheduled.
- Open for registration.
- Closed for registration.
- Active.
- Completed.
- Archived.

Voting workflows additionally require:
- Not started.
- Active.
- Closed.
- Finalized.

---

# 10. MOBILE REQUIREMENTS

## Student mobile

Must provide:
- Bottom navigation.
- Compact header.
- Sticky primary action where useful.
- Full-screen file upload.
- Full-screen resume viewer.
- Full-screen video player for student-owned intro video.
- Bottom-sheet dialogs for simple actions.
- Full-screen wizard for event registration.
- Full-screen wizard for complex voting.

Do not:
- Force desktop-style tables.
- Place critical actions in inaccessible overflow menus.
- Create horizontal scrolling for ordinary profile content.

## Public mobile

- Simple header.
- Directory filter sheet.
- Profile stacked sections.
- Resume viewer optimized for vertical use.
- No video on public profiles.

## Admin mobile

The admin experience can prioritize desktop, but must remain responsive enough for quick approvals, review actions, notifications, and basic operations.

---

# 11. RESPONSIVE BREAKPOINT BEHAVIOR

Desktop:
- Full sidebar.
- Multi-column cards.
- Data tables.
- Large moderation workspace.

Tablet:
- Collapsible sidebar.
- Two-column content where space allows.
- Table-to-card transformations for dense data.

Mobile:
- Bottom navigation for students.
- Drawer navigation for admin.
- One-column content.
- Full-screen dialogs for complicated tasks.

---

# 12. SCREEN-TO-SCREEN FLOW

## Student onboarding
Login → Onboarding → Dashboard → Edit Profile

## Student profile
Dashboard → My Profile → Edit Profile → Save → Profile

## Project
Profile → Portfolio → Projects → Add Project → Save → Project Card

## Intro video
Dashboard → Intro Video → Upload → Review Status → Approval/Rejection

## Resume
Profile → Resume → Upload → Review → Approved → Public viewer if enabled

## Event
Events → Event Details → Register → Registration Dialog → Success → My Registrations

## Team
Event Registration → Team Management → Create Team / Invite → Invitation response → Team status

## Voting
Dashboard/Voting → Campaign → Voting Details → Confirm Vote → Success

## Public directory
Public Home → Student Directory → Student Profile → Resume

## Admin moderation
Admin Dashboard → Moderation → Submission → Review → Approve/Reject/Request Changes → Notification/Email

## Admin event
Admin Dashboard → Events → Create Event → Configure → Publish → Registrations

## Admin voting
Admin Dashboard → Voting → Create Campaign → Configure → Activate → Monitor → Close → Finalize

## Admin email
Communications → Email Automation → Create → Trigger → Conditions → Audience → Template → Schedule → Review → Test → Activate

---

# 13. IMPORTANT DESIGN RULES FOR STITCH

1. Generate the entire product as one coherent design system.
2. Do not independently style each page.
3. Keep the same header, sidebar, cards, buttons, typography, spacing, and status badges everywhere.
4. Keep student and admin information architecture distinct.
5. Do not invent a social feed.
6. Do not add comments, follows, DMs, or public likes/votes.
7. Do not put intro videos on public profiles.
8. Do not add a public resume download button.
9. Keep public profiles professional and structured.
10. Make dialogs explicit and consistent.
11. Use real-looking but clearly fictional sample student data.
12. Preserve the difference between public, authenticated, and admin views.
13. Make permissions visible in admin UX.
14. Show reason fields for rejection/change requests.
15. Use confirmation dialogs before destructive or high-impact actions.
16. Use previews before publishing announcements and automations.
17. Use multi-step configuration for complex event and voting flows.
18. Always show status.
19. Always show the next action where one exists.
20. Never hide a critical state behind unexplained icons.

---

# 14. STITCH GENERATION ORDER

Generate in this order so the visual system stays coherent:

### Phase 1
- Login
- Student Dashboard
- My Profile
- Edit Profile
- Portfolio
- Intro Video
- Resume

### Phase 2
- Events
- Event Details
- Event Registration
- Team Management
- My Registrations
- Voting
- Notifications

### Phase 3
- Public Home
- Public Directory
- Public Student Profile
- Public Resume Viewer
- Public Events

### Phase 4
- Admin Dashboard
- Students
- Student Details
- Moderation
- Events
- Event Registrations
- Voting
- Results

### Phase 5
- Communications
- Email Automation
- Email Template Editor
- Email History
- Analytics
- Exports
- Storage
- Roles & Permissions
- Audit Logs
- Settings

### Phase 6
Generate all modal/dialog states and mobile variants.

---

# 15. MASTER STITCH PROMPT

Create a complete, high-fidelity responsive web application design for the “ELITE Student Portal”, a professional IT-department student platform.

Use a clean, minimal academic SaaS visual language: light neutral background, restrained ELITE brand accent, excellent typography, clear cards, subtle borders, strong spacing, professional tables, accessible status badges, restrained animation, and consistent components.

The platform has three surfaces:

1. Authenticated Student Portal.
2. Public Student Directory and Profile Showcase.
3. Administrative Control Center.

Students authenticate only with institutional Google SSO. Students can manage their professional profile, profile photo, 300-character biography, ELITE-managed skills, skill requests, GitHub/LinkedIn/portfolio links, projects, achievements, certificates, one active intro video, and one resume. Students can replace their intro video and resume. Intro videos are never displayed on public student profiles. Students can download their own intro video. Public resumes use an embedded view and must not expose an intentional download action.

Students can browse ELITE events, register using administrator-defined forms, create or join teams through manual or invitation-based team flows, view registration history, receive targeted notifications, participate in administrator-configured voting campaigns, and use likes only where enabled. No social feed, comments, follows, direct messages, public voting, or public liking.

Public users can browse a searchable and filterable student directory. Public filtering includes name, roll number, year, section, skills, and latest-profile sorting. Public student profiles show approved photo, name, year/section, bio, skills, professional links, projects, achievements, certificates, and approved public resume. Do not show intro videos publicly.

Administrators have a full control center with students, moderation, events, registrations, teams, voting, communications, email automation, analytics, exports, storage, roles/permissions, audit logs, and global settings.

Roles:
- Super Admin
- Admin
- Event Manager
- Moderator
- Custom roles via granular RBAC

Make permissions granular by module and action. Include view/create/edit/approve/publish/archive/export/configure where relevant.

Create a complete coherent information architecture. Include desktop and mobile behavior. Include every normal, loading, empty, error, permission-denied, pending, approved, rejected, changes-requested, published, hidden, archived, open, closed, active, and finalized state.

Include all dialogs, confirmations, drawers, upload states, multi-step wizards, previews, test-email dialogs, event registration dialogs, team invitation dialogs, voting confirmation, moderation reason dialogs, status-change dialogs, storage-provider dialogs, role-permission dialogs, and export confirmation dialogs.

Do not omit modal workflows. Do not invent social features. Do not turn the product into a social network.

Use fictional student names and data for visual examples, but keep the Indian college context and academic fields such as roll number, year, section, IT department, GitHub, LinkedIn, Google Drive project video, PDF resume, and institutional email.

The result must look like one finished product, not a collection of unrelated mockups.

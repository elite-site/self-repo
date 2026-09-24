# ELITE Student Portal – Software Requirements Specification (SRS)

> **Functional and Access Specification**
> Theory only. No code.

## Table of Contents

1. Document Control
2. 1. Executive Summary
3. 2. Product Vision and Objectives
4. 3. Scope
5. 4. Guiding Functional Principles
6. 5. User Classes
7. 6. Student Identity and Authentication
8. 7. Student Master Identity
9. 8. Student Portal Information Architecture
10. 9. Student Dashboard
11. 10. Student Profile
12. 11. Profile Photo Management
13. 12. Skills Management
14. 13. Social Links
15. 14. Project Portfolio
16. 15. Project Video Handling
17. 16. Achievements
18. 17. Certificates
19. 18. Introduction Video
20. 19. Resume Management
21. 20. Profile Completion
22. 21. Visibility Model
23. 22. Public Student Profiles
24. 23. Public Resume Viewer
25. 24. Public Student Directory
26. 25. Public Profile URLs
27. 26. Student-to-Student Interaction
28. 27. Likes
29. 28. Event Management Overview
30. 29. Event Discovery
31. 30. Configurable Event Registration
32. 31. Event Registration Status
33. 32. Team Registration
34. 33. Team Invitations
35. 34. Event Eligibility
36. 35. Event Announcements
37. 36. Voting Overview
38. 37. Voting Eligibility
39. 38. Configurable Voting Rules
40. 39. Vote Integrity
41. 40. Voting Periods
42. 41. Voting Results
43. 42. Notification Center
44. 43. Notification Categories
45. 44. Notification Targeting
46. 45. Automated Email System
47. 46. Email Automation Builder
48. 47. Email Templates
49. 48. Email Preview and Testing
50. 49. Scheduled Email Triggers
51. 50. Email Delivery History
52. 51. Admin Dashboard Overview
53. 52. Student Administration
54. 53. Content Moderation
55. 54. Configurable Approval Rules
56. 55. Moderation States
57. 56. Change Requests
58. 57. Featured Students
59. 58. Event Administration
60. 59. Event Form Builder
61. 60. Event Participant Management
62. 61. Voting Administration
63. 62. Announcement Management
64. 63. Storage Management
65. 64. File Policy Management
66. 65. Access Control Model
67. 66. Role Definitions
68. 67. Granular Permissions
69. 68. Role and Permission Administration
70. 69. Audit Log
71. 70. Data Status and Inactive Students
72. 71. Administrative Analytics
73. 72. Export Management
74. 73. Data Retention and Cleanup
75. 74. Student Activity History
76. 75. Administrative Home Page
77. 76. Student Status Management
78. 77. Public versus Authenticated Access
79. 78. Student Self-Service Rules
80. 79. Admin Override Rules
81. 80. Error and Exception Behavior
82. 81. Empty States
83. 82. Search and Filtering
84. 83. Status Communication
85. 84. Student Experience of Moderation
86. 85. Event Experience of Moderation
87. 86. Notification and Email Coordination
88. 87. Public Directory Safety
89. 88. Profile Discoverability
90. 89. Content Ownership
91. 90. Content Versioning
92. 91. Operational Workflows
93. 92. Workflow: Student Onboarding
94. 93. Workflow: Intro Video Submission
95. 94. Workflow: Resume Submission
96. 95. Workflow: Project Submission
97. 96. Workflow: Achievement Submission
98. 97. Workflow: Certificate Submission
99. 98. Workflow: Event Registration
100. 99. Workflow: Voting
101. 100. Workflow: Automated Email
102. 101. Workflow: Announcement
103. 102. Workflow: Change Request
104. 103. Workflow: Student Inactive Status
105. 104. Functional Requirements: Identity
106. 105. Functional Requirements: Profile
107. 106. Functional Requirements: Portfolio
108. 107. Functional Requirements: Intro Video
109. 108. Functional Requirements: Resume
110. 109. Functional Requirements: Public Profiles
111. 110. Functional Requirements: Events
112. 111. Functional Requirements: Voting
113. 112. Functional Requirements: Likes
114. 113. Functional Requirements: Notifications
115. 114. Functional Requirements: Email
116. 115. Functional Requirements: Administration
117. 116. Functional Requirements: Audit
118. 117. Role Access Matrix – Overview
119. 118. Student Access
120. 119. Super Admin Access
121. 120. Admin Access
122. 121. Event Manager Access
123. 122. Moderator Access
124. 123. Public Visitor Access
125. 124. Access to Student Contact Information
126. 125. Access to Resumes
127. 126. Access to Intro Videos
128. 127. Access to Portfolio Moderation
129. 128. Access to Events
130. 129. Access to Voting
131. 130. Access to Announcements
132. 131. Access to Analytics
133. 132. Access to Exports
134. 133. Access to Storage Configuration
135. 134. Access to Audit Logs
136. 135. Access to Role Management
137. 136. Administrative Email Access
138. 137. Access to Skill Management
139. 138. Access to Category Management
140. 139. Access to Featured Student Controls
141. 140. Access to Visibility Controls
142. 141. Functional Dependencies
143. 142. Governance Rules
144. 143. Moderation Governance
145. 144. Voting Governance
146. 145. Communication Governance
147. 146. Storage Governance
148. 147. Administrative Exception Handling
149. 148. User Experience Quality Requirements
150. 149. Mobile Behavior
151. 150. Accessibility Expectations
152. 151. Reporting and Operational Review
153. 152. Data Quality Controls
154. 153. Administrative Search
155. 154. Archive Behavior
156. 155. Deletion Behavior
157. 156. Replacement Behavior
158. 157. Notification Examples
159. 158. Email Automation Examples
160. 159. Student Journey Summary
161. 160. Administrator Journey Summary
162. 161. Functional Acceptance Themes
163. 162. Acceptance: Student Profile
164. 163. Acceptance: Portfolio
165. 164. Acceptance: Resume
166. 165. Acceptance: Introduction Video
167. 166. Acceptance: Events
168. 167. Acceptance: Voting
169. 168. Acceptance: Notifications and Email
170. 169. Acceptance: RBAC
171. 170. Acceptance: Audit
172. 171. Future Expansion Boundaries
173. 172. Removed Social Feed Decision
174. 173. Consolidated Student Function List
175. 174. Consolidated Super Admin Function List
176. 175. Consolidated Admin Function List
177. 176. Consolidated Event Manager Function List
178. 177. Consolidated Moderator Function List
179. 178. Consolidated Public Visitor Function List
180. 179. Final Functional Blueprint
181. 180. Final Requirements Summary


---

<!-- LOGICAL PAGE 001 -->

## Document Control

**Document title:** ELITE Student Portal – Software Requirements Specification  
**Version:** 2.0 Functional Specification  
**Purpose:** Define the users, access rights, business functions, workflows, controls, notifications, moderation rules, event management, voting, portfolio management, and administrative capabilities of the redesigned ELITE Student Portal.  
**Document type:** Theory-only Software Requirements Specification.  
**Implementation constraint:** No source code, schema definitions, API code, deployment commands, or implementation snippets are included in this document.  
**Audience:** ELITE leadership, department administrators, event managers, moderators, student users, product designers, project reviewers, testers, and future maintainers.


<!-- LOGICAL PAGE 002 -->

## 1. Executive Summary

The ELITE Student Portal is a digital platform for the Information Technology department of SASI Institute of Technology and Engineering. The system evolves the existing self-introduction submission application into a broader student portal centered on verified student identity, personal profiles, portfolio information, introductory video submission, resume management, projects, achievements, certificates, event registration, voting, notifications, public student discovery, and configurable administration.

The portal has two principal experiences: the authenticated student portal and the administrative control center. Students authenticate only with their institutional Google accounts using the college domain. Administrators control student status, content review, visibility, event rules, voting rules, announcements, storage policy, notification policy, email automation, analytics, exports, and role permissions.

The redesign deliberately removes the previously considered social-feed model. There is no general-purpose social timeline, public posting stream, commenting system, student following system, direct messaging system, or feed-based content discovery. Instead, the portal emphasizes structured student profiles and portfolio content.

The system must support a lifecycle in which students build their profiles, submit content for review, receive status notifications, participate in department events, and interact with configured voting experiences. Administrators require strong controls, granular role permissions, full auditability, configurable approval workflows, targeted communications, and operational analytics.


<!-- LOGICAL PAGE 003 -->

## 2. Product Vision and Objectives

The product vision is to provide one trusted digital home for IT students to represent their academic identity, portfolio, participation, and verified achievements while giving ELITE administrators centralized operational control.

Primary objectives are to provide a dependable student identity layer; allow students to create a professional profile; enable controlled submission of introduction videos; enable controlled resume viewing; allow structured projects, achievements, and certificates; provide configurable event registration; support configurable voting; centralize notifications; automate administrative communication; provide public student discovery for approved profile information; and provide administrators with measurable, auditable control over content and system behavior.

The system should reduce repetitive administrative work without weakening moderation. Where an administrative decision is required, the system should expose a clear workflow, record who made the decision, record when it was made, and communicate the result.

The system should be reusable across multiple ELITE activities rather than being designed around one single intro-video campaign.


<!-- LOGICAL PAGE 004 -->

## 3. Scope

In scope are student authentication, student profiles, profile photo management, biography, skills, social links, projects, achievements, certificates, intro video submission, resume upload and approval, event browsing and registration, team registration, voting configuration and execution, likes where enabled by the relevant portal rules, public student profiles, public student directory, notifications, announcements, admin dashboard functions, student and content management, moderation, event configuration, voting configuration, email automation, storage administration, activity auditing, analytics, exports, role-based access control, student status management, approval policies, visibility management, and administrative settings.

Out of scope for the baseline specification are a social feed, free-form social posts, comments, student-to-student messaging, following systems, public video display on student profile pages, uncontrolled public voting, public resume downloading, or direct access to private administrative data.

The system may be extended in future, but any new module should preserve the principle that access is explicit, auditable, and configurable.


<!-- LOGICAL PAGE 005 -->

## 4. Guiding Functional Principles

The platform shall follow several functional principles. Identity should come from a trusted institutional account. Sensitive college-master data should not be directly editable by students. Student-submitted content should be subject to configurable moderation. Public exposure should be deliberate rather than accidental. Administrative permissions should be granular. Automation should be configurable and testable. Every material administrative change should be traceable. Every event should have its own operational rules. Every voting campaign should have explicit eligibility, counting, timing, and restriction rules. Every uploaded file should be governed by a known storage and access policy.

A function is considered complete only when its normal flow, permission checks, status handling, user feedback, and audit implications are defined.


<!-- LOGICAL PAGE 006 -->

## 5. User Classes

The platform defines five principal user classes.

**Student:** The primary authenticated portal user. A student can maintain an approved profile, submit portfolio content, register for events, participate in configured voting, manage allowable personal information, receive notifications, and view eligible content.

**Super Admin:** The highest administrative role. A Super Admin has broad platform control and can manage roles, permissions, configuration, security-sensitive settings, automation, storage policy, and system-wide controls.

**Admin:** A general administrative role with access to the operational modules granted by the role's permission set.

**Event Manager:** A specialized administrative role focused on event creation, event registration, participation configuration, team workflows, event announcements, and event-level operations.

**Moderator:** A specialized administrative role focused on content review, verification, visibility, moderation actions, and approval or rejection of submitted student content.

Additional custom roles may be introduced through the granular role-based access control system.


<!-- LOGICAL PAGE 007 -->

## 6. Student Identity and Authentication

Student authentication shall use the institutional Google account only. The permitted identity domain is the college domain used by the IT department. Authentication is therefore account-based rather than password-based.

The system shall not expose roll-number/password login as a normal student authentication method. A student's authenticated identity is linked to the corresponding master student record.

The system shall verify that the authenticated account is eligible for student access. Eligibility is established using the student master data and current student status. A successful sign-in should lead the student to the authenticated portal without requiring a second password.

Authentication success does not automatically imply full content access. Every protected function remains subject to role, status, event, visibility, and approval rules.


<!-- LOGICAL PAGE 008 -->

## 7. Student Master Identity

The student master identity is the authoritative source for core college information such as student name, roll number, academic year, section, branch or department, and institutional email.

Students shall not directly overwrite authoritative master data. When a student believes a core detail is incorrect, the portal shall provide a change-request path. The request shall record the requested correction, current value, proposed value, supporting explanation when needed, requester identity, request timestamp, and administrative decision.

An accepted change updates the authoritative student-facing value according to administrative policy. A rejected request preserves the authoritative record and may generate a notification to the student.

Student-created portfolio information remains distinct from authoritative academic identity information.


<!-- LOGICAL PAGE 009 -->

## 8. Student Portal Information Architecture

The student portal shall use a desktop left-side navigation concept combined with mobile bottom navigation. The navigation should provide predictable access to profile, portfolio sections, events, voting, notifications, and account-related settings without exposing administrative features.

A modern, clean, professional visual language is required. The interface should emphasize readability, clear cards, strong hierarchy, consistent status badges, and simple actions. The student portal should feel like a professional academic product rather than a social media platform.

The portal homepage should provide a personalized dashboard containing profile progress, recent relevant activity, event information, notifications, and other useful portal-level summaries. Because the social feed has been removed, the dashboard should not contain an endless timeline or post stream.


<!-- LOGICAL PAGE 010 -->

## 9. Student Dashboard

The dashboard is the student's primary landing experience after authentication. It should summarize the student's current state rather than reproduce every module.

The dashboard should show profile completion based on administrator-defined required and optional sections. It may include the current review status of the introduction video, resume, achievements, certificates, and other content that requires moderation. It may also show upcoming registered events, recent notifications, pending team invitations, and current voting eligibility where relevant.

The dashboard should surface tasks that require student action, such as completing a required profile section, responding to a team invitation, updating a rejected submission, or acknowledging a notification.

The dashboard should not expose administrative statistics or other students' private information merely because the student can access the portal.


<!-- LOGICAL PAGE 011 -->

## 10. Student Profile

Each student shall have a structured profile containing basic college identity information and professional self-description.

The profile supports profile photo, name, roll number, academic year, section, institutional email, biography, skills, LinkedIn, GitHub, portfolio link, projects, achievements, and certificates. The student can maintain editable professional information while authoritative identity fields remain governed by the master student record.

The biography is limited to 300 characters. The short format encourages a concise professional introduction. The profile should display missing information clearly so that students can improve completeness without confusion.

Administrators can control whether individual profile fields or content categories are visible in public contexts.


<!-- LOGICAL PAGE 012 -->

## 11. Profile Photo Management

Students may upload and change their profile photo. Supported image formats are JPG, PNG, and WebP. The maximum upload size is 5 MB.

The profile photo is treated as a student-controlled portfolio element rather than a fixed Google identity photograph. Administrators may retain the ability to moderate or remove a photo where policy requires.

The portal should provide clear upload status, replacement behavior, validation feedback, and a visible current-image state. Replacing a profile photo should not unintentionally alter the student's other profile content.


<!-- LOGICAL PAGE 013 -->

## 12. Skills Management

Students select skills from a predefined ELITE-managed skill list. The system should avoid uncontrolled duplication caused by spelling variations and inconsistent naming.

If a student needs a skill that is not present, the student can submit a request for a new skill. The request should be visible to authorized administrators who can approve or reject it.

When approved, the new skill becomes available for selection according to the administrator's configuration. The student should not be required to rewrite the entire profile after a skill request is approved.


<!-- LOGICAL PAGE 014 -->

## 13. Social Links

Students may provide professional external links such as GitHub, LinkedIn, and a personal portfolio link. These links are profile attributes and not social-interaction mechanisms.

Administrators may define validation expectations and visibility policy. A link can be shown on authenticated and public profiles where allowed, without creating a student follow, messaging, or social-feed relationship.


<!-- LOGICAL PAGE 015 -->

## 14. Project Portfolio

Students can maintain project entries. Each project contains a project title, project description, technologies used, GitHub link, and Google Drive video link.

The number of projects a student may maintain is configurable by an administrator. This allows ELITE to set a reasonable limit for a particular portal period or event while avoiding permanent hard-coded assumptions.

Students can add, edit, reorder, or remove projects according to their permissions. The selected display order is student-controlled, as decided for the portal.

Project visibility follows administrator-controlled profile visibility rules and any project-specific moderation requirement.


<!-- LOGICAL PAGE 016 -->

## 15. Project Video Handling

Project video references are intended to demonstrate project work. The project model uses a Google Drive video link rather than treating every project video as an automatically managed upload.

The system should verify that the submitted link is structurally acceptable for the configured policy and should provide a clear status if a project video is missing or inaccessible.

Project video access is governed by visibility and content policy. The portal should not expose unrelated private Drive content simply because a student provides a link.


<!-- LOGICAL PAGE 017 -->

## 16. Achievements

Students can add structured achievements. Each achievement contains a title, description, date, organization, category, and proof upload.

Achievement categories are managed by administrators. Administrators may create, rename, archive, or remove categories according to policy. Categorization should help students organize achievements and should help administrators filter and review them.

Approval behavior is configurable. Some achievement categories may require review while others may use automatic approval rules. The student should always be able to identify whether an achievement is pending, approved, rejected, or hidden.


<!-- LOGICAL PAGE 018 -->

## 17. Certificates

Students can upload certificate files. The certificate function is intentionally separate from free-form achievements so that verified evidence is easier to manage.

The portal should support certificate upload, replacement, review status, and administrator verification. Certificates can be governed by configurable moderation requirements.

Certificate visibility is controlled by administrator policy. A certificate should not become public simply because the student uploaded it if its content category requires review.


<!-- LOGICAL PAGE 019 -->

## 18. Introduction Video

The introduction video remains an important feature, but it is now one module within the larger student portal.

A student can maintain one active introduction video at a time and may replace it. The video submission should have a lifecycle such as draft, submitted, under review, approved, rejected, or withdrawn according to operational requirements.

The public profile must not display the introduction video. Introductory videos are available only within the permitted authenticated or administrative contexts defined by the portal's access policy.

Students should be able to download their own introduction video. Other users should not receive unrestricted download access unless a future event-specific rule explicitly provides it.


<!-- LOGICAL PAGE 020 -->

## 19. Resume Management

Each student may maintain one active resume in PDF form and may replace it. A resume is submitted for administrator approval before it becomes publicly viewable under the configured policy.

The resume is viewable in an embedded PDF viewer. The platform must not provide a download action to the viewer.

The resume lifecycle should distinguish the current approved resume from a newly uploaded replacement that is still under review. A replacement should not automatically erase the last approved resume unless the business rule explicitly requires it.


<!-- LOGICAL PAGE 021 -->

## 20. Profile Completion

Profile completion is configurable by administrators. The administrator may determine which profile sections are required and which are optional.

The completion system should show the student what remains incomplete without treating every optional element as mandatory. Required and optional statuses should be visually distinct.

Required sections can vary according to portal configuration, event needs, or student group. A student's completion percentage is therefore a reflection of the active configuration rather than a permanently fixed checklist.


<!-- LOGICAL PAGE 022 -->

## 21. Visibility Model

Visibility is administrator-controlled. Students do not independently decide public visibility for profile fields when the administrator has configured those fields as controlled.

Administrators should be able to manage visibility at the profile field, content type, or broader policy level. This allows, for example, an administrator to expose approved professional information publicly while keeping internal participation details private.

Visibility control should be independent from editing rights. A student may be allowed to edit an item while still lacking the ability to make it public.


<!-- LOGICAL PAGE 023 -->

## 22. Public Student Profiles

Approved public profiles are accessible without login. The public profile is intended to present structured professional student information rather than an authenticated student dashboard.

The public profile may display profile photo, name, academic year and section, biography, skills, social links, projects, achievements, certificates where approved, and a viewable resume according to administrator visibility policy.

The public profile must not display the introduction video. The public visitor experience is view-oriented and does not expose student-to-student interaction functions.


<!-- LOGICAL PAGE 024 -->

## 23. Public Resume Viewer

Publicly visible resumes are presented through an embedded PDF viewer. The viewer is read-only from the visitor's perspective.

No direct download action should be presented in the public profile. If the underlying browser or environment provides unavoidable generic document controls, the portal should still avoid intentionally exposing a download workflow.

The platform should treat public resume visibility as an explicit administrative decision rather than a side effect of uploading a resume.


<!-- LOGICAL PAGE 025 -->

## 24. Public Student Directory

The public directory allows visitors to discover approved public student profiles.

The directory should provide search and filtering capabilities. Name, roll number, year, section, skills, and latest-profile sorting are part of the defined discovery behavior.

The directory itself should not autoplay or embed student videos. A visitor opens a student's profile to view the information that has been approved for public presentation. The directory therefore remains a discovery surface rather than a media-consumption surface.


<!-- LOGICAL PAGE 026 -->

## 25. Public Profile URLs

Each student profile uses a roll-number-based public URL. The URL is deterministic and associated with the authoritative student identifier.

Student-created custom usernames are not required. This reduces ambiguity and simplifies identity mapping.

The public URL should lead only to the profile's publicly approved representation. A public URL must not expose authenticated controls, private content, moderation states, internal identifiers, or administrative information.


<!-- LOGICAL PAGE 027 -->

## 26. Student-to-Student Interaction

The platform intentionally keeps social interaction limited. There is no general social feed, no comments, no follows, no direct messages, and no general-purpose posting feature.

Where configured, authenticated portal users may like eligible profiles or portfolio items, subject to the active rules. A student may like an eligible item once and may undo that like.

Voting is a separate governed activity and must not be conflated with a generic like.


<!-- LOGICAL PAGE 028 -->

## 27. Likes

Likes are optional interaction records that may be enabled for eligible profile or portfolio content. A student can like an item once and can unlike it.

The system should prevent duplicate likes for the same student and target item. Like counts should be visible only where configured.

Administrative controls may determine which content types support likes. Likes should not be interpreted as official competition results unless an event explicitly defines them as such.


<!-- LOGICAL PAGE 029 -->

## 28. Event Management Overview

Events are configurable administrative objects. Each event can define its title, description, dates, registration window, eligibility, registration fields, team behavior, notification targets, and other participation rules.

Students can view active and relevant events and register according to event eligibility. Events may exist independently of the portfolio, allowing the portal to serve broader ELITE participation needs.

The event model should support reuse across academic years and recurring annual activities without requiring a separate application for each event.


<!-- LOGICAL PAGE 030 -->

## 29. Event Discovery

Students should be able to browse events relevant to them. The event list should distinguish upcoming, open-for-registration, closed, active, and completed events.

The portal should clearly communicate important dates and whether registration is currently possible. An event that has closed registration should not continue to present an active registration action.

Event visibility can be targeted to year, section, or other administrative groups.


<!-- LOGICAL PAGE 031 -->

## 30. Configurable Event Registration

Event registration is administrator-configurable. An administrator can define which questions and fields are required for a particular event.

Custom registration fields may include team name, team member details, contact information, participation choices, and other event-specific questions.

The student should see the exact fields configured for the event and should receive clear validation and confirmation after successful registration.


<!-- LOGICAL PAGE 032 -->

## 31. Event Registration Status

A student should be able to view the status of each event registration. Status may include registered, pending review, waitlisted, cancelled, rejected, accepted, or other configured states.

The history should remain visible to the student according to policy so that they can understand what happened to their registration.

Administrators should be able to filter registrations by event, status, academic group, and configured registration fields.


<!-- LOGICAL PAGE 033 -->

## 32. Team Registration

Team events support two participation methods: manual team entry and invitation-based team formation.

In manual mode, a student can provide a team name and enter the participating students using the identifiers required by the event.

In invitation mode, a student can create a team and invite eligible students. Invited students should be able to accept or decline invitations. A team should not be treated as complete until required members or fields satisfy the event's rules.

An event manager can configure which team method is available.


<!-- LOGICAL PAGE 034 -->

## 33. Team Invitations

Team invitations should include the event name, inviting student's identity, team name, response deadline where applicable, and available actions.

The invited student should receive an in-portal notification and, where configured, an email.

Accepted invitations should update the team membership state. Declined or expired invitations should not create active team membership.


<!-- LOGICAL PAGE 035 -->

## 34. Event Eligibility

Event eligibility is controlled by administrators. Eligibility may depend on year, section, department, student status, event membership rules, or custom administrator-defined criteria.

Eligibility must be checked before registration and again when necessary during event operations. A student should not gain access to restricted registration solely by manipulating visible interface controls.

Event managers should be able to preview the intended audience before publishing a restricted event.


<!-- LOGICAL PAGE 036 -->

## 35. Event Announcements

Administrators can publish event announcements and target specific groups. Supported targeting includes all IT students, specific years, specific sections, event participants, specific students, and custom groups.

Announcements can be delivered through the channels selected in the administration settings for that announcement. The platform should retain an announcement record including author, audience, publication status, and timing.

Students should not receive announcements targeted at groups to which they do not belong.


<!-- LOGICAL PAGE 037 -->

## 36. Voting Overview

Voting is an event-level capability. Voting is not globally active merely because the portal has a voting module.

An administrator defines which event or campaign is being voted on, who is eligible, what content can receive votes, when voting opens, when voting closes, and what voting restrictions apply.

Voting outcomes should be generated from validated vote records rather than from client-side counters or manually editable display values.


<!-- LOGICAL PAGE 038 -->

## 37. Voting Eligibility

Administrators decide who can vote for a particular event. Eligibility may be configured by year, section, event membership, custom group, or other supported criteria.

Voting access should be rejected when the voter is outside the configured audience or when the voting period is closed.

Eligibility should be evaluated using authoritative student identity and current event rules.


<!-- LOGICAL PAGE 039 -->

## 38. Configurable Voting Rules

Voting rules are administrator-configurable. An event may define a one-vote-per-candidate rule, a limited number of total votes, a one-vote-only rule, or another supported policy.

The configuration should clearly state the rule to students before they vote. The system must distinguish between votes for one candidate and total voting capacity where the event has more than one candidate.

Administrators should be able to review the configured rule before the voting period opens.


<!-- LOGICAL PAGE 040 -->

## 39. Vote Integrity

Vote integrity is a core business function. The system must prevent a student from creating duplicate valid votes when the event rule forbids them.

The vote record should be tied to the authenticated voter, the target candidate or submission, the event, and the time of voting. Administrative dashboards should provide enough information to investigate anomalies without exposing private audit information to students.

Deleting or altering validated votes should be restricted to authorized administrators and should create an audit record.


<!-- LOGICAL PAGE 041 -->

## 40. Voting Periods

Each voting campaign has an explicit opening and closing period. Before opening, eligible students should see that voting is not yet available. During the period, eligible voters can use the configured ballot rules. After closing, new votes must not be accepted.

Administrators should be able to schedule reminder notifications and emails relative to the voting window.

A closed campaign remains available for reporting and historical analysis according to retention policy.


<!-- LOGICAL PAGE 042 -->

## 41. Voting Results

Voting results should be presented according to event policy. The portal may show current counts, final counts, or no public counts while voting is active.

Administrators should be able to inspect vote totals and export result data according to their permissions.

The system should distinguish live operational counts from finalized official results. Finalization should be an explicit administrative state where required.


<!-- LOGICAL PAGE 043 -->

## 42. Notification Center

The portal includes a full notification center with categories, read/unread state, priority, scheduled notifications, and targeted delivery.

Notifications can represent system events such as content review decisions, event registration changes, team invitations, voting opening, voting closing, announcements, reminders, or administrative messages.

Students should be able to see which notifications are unread and mark them as read without losing the notification history.


<!-- LOGICAL PAGE 044 -->

## 43. Notification Categories

Notification categories should make the notification center understandable. Categories may include profile, portfolio, event, voting, system, moderation, team, and announcement.

Administrators should be able to configure category behavior and delivery rules. Students should not receive administrative-only categories that contain confidential internal details.


<!-- LOGICAL PAGE 045 -->

## 44. Notification Targeting

Notifications can be targeted to all students, specific years, sections, event participants, individual students, or custom groups.

Targeting should be resolved at send time according to the configured policy, while the system should retain the audience definition for auditing.

A targeted notification must not leak the existence or membership of a private group to users outside that group.


<!-- LOGICAL PAGE 046 -->

## 45. Automated Email System

The portal includes automated email delivery for important student and administrative events. Emails should be generated from configurable automation rules rather than hard-coded one-off messages.

Examples include submission confirmation, approval, rejection, profile publication, event registration, team invitations, voting opening, voting closing, reminders, and results.

One fixed ELITE sender identity is used as the sender for the portal's automated emails.


<!-- LOGICAL PAGE 047 -->

## 46. Email Automation Builder

The email automation builder supports triggers, conditions, templates, recipient targeting, and scheduled delivery.

A trigger can originate from a student action, an administrator action, a system state change, a scheduled time, or an event lifecycle point. Conditions can determine whether a message should be sent.

The automation designer should make the intended recipient audience explicit and should prevent ambiguous or contradictory rules from being activated without review.


<!-- LOGICAL PAGE 048 -->

## 47. Email Templates

Email templates are configurable content objects. They should support reusable text, event-specific information, student-specific information, and administrative placeholders according to the portal's template policy.

An administrator should be able to save, edit, preview, disable, and test a template before activating it.

Templates should have a clear status such as draft, active, disabled, or archived.


<!-- LOGICAL PAGE 049 -->

## 48. Email Preview and Testing

Before an email automation is activated, an administrator can preview the message and send a test email.

The preview should show the effective sender identity, subject, body, recipient model, and substituted values where available.

Test sending must be visually and functionally distinct from live delivery so that an administrator can verify content without accidentally notifying a full student population.


<!-- LOGICAL PAGE 050 -->

## 49. Scheduled Email Triggers

The automation system supports scheduled triggers such as sending a reminder one day before an event, notifying students when voting opens, or delivering a deadline reminder.

Scheduled automation must respect the configured event dates and recipients. When an event is cancelled or a relevant condition changes, the system should apply the configured behavior for pending scheduled notifications.

Administrative users should be able to see which schedules are active, paused, completed, or invalid.


<!-- LOGICAL PAGE 051 -->

## 50. Email Delivery History

Email history records the fact that an automation attempted delivery, the intended recipient, the automation or template used, the result status, and the relevant timestamp.

Administrators should be able to filter the history by event, template, recipient, status, and date.

The email log supports operational troubleshooting and auditability and should not be editable by ordinary students.


<!-- LOGICAL PAGE 052 -->

## 51. Admin Dashboard Overview

The administrative dashboard is the central operational control center. It should provide a high-level view of students, content submissions, moderation workload, events, voting, notifications, emails, storage, and system activity.

The dashboard should surface actionable conditions rather than only decorative metrics. Examples include pending moderation, approaching event deadlines, failed automated emails, storage thresholds, unresolved change requests, and active voting campaigns.

Dashboard modules shown to an administrator must be filtered through that administrator's permissions.


<!-- LOGICAL PAGE 053 -->

## 52. Student Administration

Authorized administrators can search, view, filter, and manage student records. Student administration should distinguish authoritative identity data from student-managed portfolio information.

Administrative actions may include changing status, reviewing change requests, managing visibility, viewing submission states, and assigning administrative treatment according to policy.

Student records must remain auditable. Material administrative changes should identify the actor, timestamp, affected student, previous state, and new state.


<!-- LOGICAL PAGE 054 -->

## 53. Content Moderation

Moderation covers introduction videos, resumes, achievements, certificates, and other content types for which approval is required.

Moderators can review submitted content, approve it, reject it, request changes, or take other configured moderation actions.

The moderation interface should make evidence and status clear and should support a reason when rejecting or requesting changes so that the student understands what must be corrected.


<!-- LOGICAL PAGE 055 -->

## 54. Configurable Approval Rules

Approval requirements are configurable by content type and, where appropriate, by category, event, or other conditions.

Administrators can define automatic approval rules as well as manual review requirements. Automatic approval must still produce a traceable state transition.

An item that requires manual review must not appear in public contexts until the required approval state has been reached.


<!-- LOGICAL PAGE 056 -->

## 55. Moderation States

The platform should support meaningful moderation states such as draft, submitted, under review, approved, rejected, changes requested, published, hidden, withdrawn, and archived where relevant.

A state change should be understandable to the student and to administrators. The system should avoid silently moving content between states in a way that creates uncertainty about whether the content is visible.


<!-- LOGICAL PAGE 057 -->

## 56. Change Requests

Change requests are used for authoritative student data that students cannot directly edit. Examples include name, roll number, academic year, section, or institutional information.

An administrator reviews the request, confirms or rejects it, and the system records the decision. The student receives a notification and, where configured, an email.

Change requests must not be confused with ordinary portfolio edits.


<!-- LOGICAL PAGE 058 -->

## 57. Featured Students

Administrators can manually feature or unfeature selected students. Featured status is an explicit administrative curation mechanism and is not automatically awarded based on likes or votes.

The portal may use featured status in a dedicated showcase area. The administrative interface should show which students are currently featured and permit removal of the designation.

Feature selection should respect public visibility and approval requirements.


<!-- LOGICAL PAGE 059 -->

## 58. Event Administration

Event Managers and other authorized administrators can create and manage events. Event administration includes title, description, schedule, registration window, audience, custom fields, team rules, notifications, and event state.

An event should move through controlled lifecycle stages such as draft, scheduled, open, active, closed, and archived.

Only users with the relevant event permissions can change event rules after publication. Sensitive changes should be audited.


<!-- LOGICAL PAGE 060 -->

## 59. Event Form Builder

The event registration form builder allows administrators to define custom registration fields. Fields can be required or optional and can use appropriate structured response types.

Examples include team name, contact information, participation category, skill level, special requirements, and custom questions.

The form configuration should be versioned or otherwise protected so that changes do not unexpectedly invalidate existing registrations.


<!-- LOGICAL PAGE 061 -->

## 60. Event Participant Management

Administrators can inspect event participants and registration status. They can search, filter, approve, reject, cancel, or modify participation states according to event permissions.

Participant management should preserve the submitted registration details while making administrative status changes visible.

Where team participation is enabled, participant and team views should remain linked so administrators can see both individual and collective participation.


<!-- LOGICAL PAGE 062 -->

## 61. Voting Administration

Authorized administrators can configure voting campaigns, eligibility, rules, dates, candidate population, public result behavior, reminders, and finalization.

The administration experience should clearly distinguish configuration from active operations. A campaign that is already open should have more restricted settings than a draft campaign.

Critical voting settings should require elevated permissions where configured.


<!-- LOGICAL PAGE 063 -->

## 62. Announcement Management

Administrators can create announcements, select target audiences, set delivery channels, schedule publication, and deactivate or archive announcements.

The system should show the effective audience before an announcement is published. This helps prevent accidental delivery to the wrong year, section, event, or individual.

Announcements should remain auditable after publication.


<!-- LOGICAL PAGE 064 -->

## 63. Storage Management

Storage is provider-configurable. Administrators can choose storage providers and assign them by content type.

The storage management experience includes provider selection, folder or bucket assignment, allowed file types, file-size limits, retention rules, access permissions, and cleanup rules.

Storage policy should distinguish between content that must remain private, content visible to authenticated students, and content eligible for public presentation.


<!-- LOGICAL PAGE 065 -->

## 64. File Policy Management

The platform should support administrator-defined file policies. A policy can specify permitted file types, maximum size, naming expectations, storage destination, visibility, retention, and review requirements.

Profile photos currently require JPG, PNG, or WebP and a 5 MB maximum according to the locked requirement. Resume content is PDF-based and subject to the configured resume policy.

The administrator interface should make file policy changes understandable and should apply them consistently across future uploads.


<!-- LOGICAL PAGE 066 -->

## 65. Access Control Model

Access control is based on roles, permissions, context, and content state.

Roles define collections of permissions. Permissions should be granular enough to govern individual modules and actions. Contextual checks then consider the target student, event, content status, audience, and visibility.

A user having access to a module does not automatically imply permission to perform every action within that module.


<!-- LOGICAL PAGE 067 -->

## 66. Role Definitions

The baseline roles are Super Admin, Admin, Event Manager, and Moderator.

**Super Admin** is responsible for system-wide governance, role configuration, permissions, storage, automation, and security-sensitive settings.

**Admin** manages operational functions assigned through permissions.

**Event Manager** focuses on events, registration, teams, participant management, event announcements, and event-level operations.

**Moderator** focuses on profile and portfolio moderation, verification, approval workflows, and content visibility decisions.

The platform supports creation of additional custom roles.


<!-- LOGICAL PAGE 068 -->

## 67. Granular Permissions

Permissions should be expressed at the action level wherever practical. Examples include view students, edit students, review videos, approve resumes, manage events, publish announcements, configure voting, view analytics, export data, manage storage, manage automations, manage roles, and view audit logs.

A role may have view permission without edit permission, or edit permission without delete permission.

Sensitive actions should be limited to elevated roles and should create audit entries.


<!-- LOGICAL PAGE 069 -->

## 68. Role and Permission Administration

Super Admins can create, modify, disable, and assign roles and permissions according to policy.

Permission changes must be auditable because changing a role's access can materially alter system behavior.

The system should prevent a lower-privileged administrator from granting themselves permissions they do not already possess.


<!-- LOGICAL PAGE 070 -->

## 69. Audit Log

The platform includes a full audit trail for important administrative and system actions. The audit record should identify the action, actor, timestamp, affected record, before-and-after values where applicable, and context.

The audit log should support filtering and export. It is intended for accountability, troubleshooting, moderation review, and controlled administration.

Students should not have access to the complete administrative audit trail.


<!-- LOGICAL PAGE 071 -->

## 70. Data Status and Inactive Students

The portal supports administrative configuration for what happens when a student becomes inactive or leaves the college.

Possible outcomes include disabling login, retaining approved content, hiding the public profile, or applying another administrator-defined policy.

The rule must be explicit so that a student record is not accidentally exposed or deleted simply because the student's current academic status changed.


<!-- LOGICAL PAGE 072 -->

## 71. Administrative Analytics

The admin analytics area should cover student registrations, submissions, approvals, event registrations, likes, votes, profile views, video views where applicable in authenticated contexts, and email delivery metrics.

Analytics should support charts, trends, date filters, event filters, and other useful breakdowns.

Analytics should not be used to expose private student-level data to administrators who lack the corresponding permission.


<!-- LOGICAL PAGE 073 -->

## 72. Export Management

Administrators can export platform data. The export system supports custom filters and selectable columns.

Potential export areas include student lists, event registrations, submission records, voting data, likes, analytics data, moderation outcomes, email history, and other administrative datasets subject to permission.

Before a large or sensitive export is executed, the system should clearly show the filter scope and selected fields.


<!-- LOGICAL PAGE 074 -->

## 73. Data Retention and Cleanup

Retention rules are configurable for stored files and administrative records.

Cleanup rules should consider content type, event lifecycle, student status, moderation state, and legal or institutional requirements.

Automated cleanup should be visible to administrators and should not silently delete records that are subject to audit, unresolved review, or active event operations.


<!-- LOGICAL PAGE 075 -->

## 74. Student Activity History

Students should have access to relevant personal status history, such as submission states, event registration states, notification history, team invitations, and other meaningful actions tied to their own account.

The student-facing history is intentionally narrower than the administrative audit log. It should help students understand what the system has recorded without revealing private administration details.


<!-- LOGICAL PAGE 076 -->

## 75. Administrative Home Page

The admin home page should prioritize operational queues. Examples include pending moderation, unresolved student-data change requests, open voting campaigns, upcoming registration deadlines, failed email automations, inactive storage policies, and recent administrative actions.

The interface should allow an administrator to move from a summary metric directly into the underlying work queue.

Dashboard summaries should respect the administrator's role and permissions.


<!-- LOGICAL PAGE 077 -->

## 76. Student Status Management

Student status may include active, inactive, suspended, graduated, withdrawn, or other administrator-defined states.

Status affects authentication, profile visibility, event eligibility, voting eligibility, and content treatment according to the selected policy.

Status changes should generate appropriate notifications when the policy requires student communication.


<!-- LOGICAL PAGE 078 -->

## 77. Public versus Authenticated Access

The platform distinguishes three broad access contexts: public visitor access, authenticated student access, and administrative access.

Public access is limited to approved profile and directory content. Authenticated student access includes the student's own management functions and any department-level experiences allowed by portal rules. Administrative access includes management operations based on role.

No access context should gain sensitive information merely because another module exposes a link or identifier.


<!-- LOGICAL PAGE 079 -->

## 78. Student Self-Service Rules

Students can manage their own portfolio information where the relevant field is student-editable. They can replace their profile photo, update their biography, manage skills, maintain projects, add achievements, upload certificates, submit or replace an introduction video, and upload or replace a resume.

Students cannot directly change authoritative college information. They also cannot alter another student's content, administrative review state, voting eligibility, event configuration, system permissions, or public-visibility policy.


<!-- LOGICAL PAGE 080 -->

## 79. Admin Override Rules

Administrators can override certain student-level states when their role has the relevant permission. Examples include hiding content, changing approval state, correcting profile visibility, disabling student access, or modifying event participation.

Overrides should be deliberate, auditable, and clearly distinguishable from student-initiated changes.

Administrative override capability should never bypass a higher-level platform permission rule.


<!-- LOGICAL PAGE 081 -->

## 80. Error and Exception Behavior

The functional design should define clear user-facing responses for invalid files, expired sessions, ineligible events, closed voting, rejected content, failed uploads, unavailable storage providers, failed email delivery, duplicate vote attempts, duplicate likes, and permission-denied actions.

The system should explain the next available action when possible. For example, a rejected resume should provide a status and reason, while a closed event should state that registration is no longer available.

Operational failure should not result in misleading success messages.


<!-- LOGICAL PAGE 082 -->

## 81. Empty States

Every major student and admin module should define a meaningful empty state.

Examples include no projects yet, no achievements yet, no current resume, no notifications, no registered events, no available voting campaigns, no pending moderation, no active automations, and no current announcements.

Empty states should explain the purpose of the section and identify the authorized next action without clutter.


<!-- LOGICAL PAGE 083 -->

## 82. Search and Filtering

Student discovery and administration require structured search and filtering.

The public student directory supports name, roll number, year, section, skills, and latest-profile sorting according to the chosen public behavior.

Administrative screens should support filters appropriate to the module, such as content status, event, date, student group, approval state, and delivery status.


<!-- LOGICAL PAGE 084 -->

## 83. Status Communication

Status should be represented consistently across the platform. Students should be able to recognize submitted, pending, approved, rejected, changes requested, published, inactive, and closed states without needing to interpret internal system codes.

Administrators should receive richer operational details than students when appropriate.

Whenever an action changes a state that affects student expectations, the system should provide the appropriate notification or email trigger.


<!-- LOGICAL PAGE 085 -->

## 84. Student Experience of Moderation

When student-submitted content enters moderation, the student should see that the item is under review.

When approved, the student should see the approval result and the resulting visibility according to policy. When rejected or changes are requested, the student should see a meaningful reason and a clear route to replace or edit the item.

A new replacement should not create confusion about which item is currently active or approved.


<!-- LOGICAL PAGE 086 -->

## 85. Event Experience of Moderation

Some events may require registration approval. In those cases, registration state should be visible to the student and event manager.

An event manager may configure registration questions and team requirements. If a registration is rejected, the student should receive the configured reason or explanation.

Changes to team membership, event eligibility, or event status should trigger relevant notifications according to the active automation policy.


<!-- LOGICAL PAGE 087 -->

## 86. Notification and Email Coordination

In-portal notifications and emails should work together without causing unnecessary duplication.

Critical events may use both channels. Lower-priority events may use only the channel selected by the administrator.

The automation system should be able to express channel-specific rules while retaining a clear record of what was attempted and what was delivered.


<!-- LOGICAL PAGE 088 -->

## 87. Public Directory Safety

The public directory must expose only information explicitly approved for public display.

Institutional email may be publicly displayed according to the locked requirement, but other contact information such as personal phone numbers should not be exposed unless a future policy explicitly allows it.

No administrative identifiers, internal statuses, private notes, audit information, or restricted documents should appear in the public directory.


<!-- LOGICAL PAGE 089 -->

## 88. Profile Discoverability

Public profiles are discoverable through the public directory. Direct profile links are also valid.

Discoverability should reflect public visibility status. A student whose profile is hidden should not continue appearing in normal public directory search results.

Search indexing behavior, if enabled in the future, should be governed by the same public visibility policy.


<!-- LOGICAL PAGE 090 -->

## 89. Content Ownership

Student portfolio content belongs to the student's portal record for purposes of maintenance and presentation, while the platform retains operational control over storage, moderation, and visibility.

Students can edit their own permitted content. Administrators can moderate it according to policy.

Removing a public item from visibility should not necessarily delete its internal administrative record.


<!-- LOGICAL PAGE 091 -->

## 90. Content Versioning

For major replaceable content, the portal should conceptually distinguish current content from prior versions.

This is especially important for introduction videos and resumes. A newly uploaded replacement may be pending review while the previously approved version remains the active approved version, depending on the configured workflow.

Version history should support administrative traceability without unnecessarily exposing old private content to students or the public.


<!-- LOGICAL PAGE 092 -->

## 91. Operational Workflows

The main operational workflows are: authenticate; build profile; upload profile media; add skills; request a new skill; add project; add achievement; upload certificate; submit intro video; upload resume; wait for moderation; receive result; register for event; complete configurable event form; join or create a team; receive team invitation; participate in configured voting; receive notifications; and receive automated emails.

Administrative workflows include reviewing students, resolving change requests, moderating content, configuring events, configuring voting, publishing announcements, configuring automations, managing storage rules, reviewing analytics, exporting data, and managing roles.


<!-- LOGICAL PAGE 093 -->

## 92. Workflow: Student Onboarding

After first successful login, the portal should recognize the student using institutional identity and prepopulate authoritative academic information.

The student should then be guided through profile completion according to the current administrator-defined required sections.

The onboarding experience should not force students to configure optional information before they can access normal portal functions unless an administrator explicitly makes those sections required.


<!-- LOGICAL PAGE 094 -->

## 93. Workflow: Intro Video Submission

The student chooses the intro video section, selects an allowed file according to the event or portal policy, and submits it.

The portal validates the submission, stores it according to the configured provider policy, creates a review state where required, and confirms submission to the student.

Administrative review may approve, reject, or request changes. The student receives the configured notifications and email.


<!-- LOGICAL PAGE 095 -->

## 94. Workflow: Resume Submission

The student uploads a PDF resume and submits it for review if approval is required.

The system preserves the current approved version when policy requires continuity while the new version is being reviewed.

After approval, the new resume becomes eligible for the configured public or authenticated viewer. The viewer does not provide an intentional download action.


<!-- LOGICAL PAGE 096 -->

## 95. Workflow: Project Submission

The student creates a project entry with title, description, technologies, GitHub link, and optional Google Drive video link according to the portal rules.

The project appears in the student's editable portfolio. If project moderation is enabled, it enters the configured approval workflow.

The student can reorder projects and the selected order becomes the display order subject to administrator visibility policy.


<!-- LOGICAL PAGE 097 -->

## 96. Workflow: Achievement Submission

The student creates an achievement entry with title, description, date, organization, category, and proof upload.

The item follows the approval policy for its category or current portal rules.

Approved achievements become visible in eligible profile contexts. Rejected achievements remain controlled by the student's history and administrative retention policy.


<!-- LOGICAL PAGE 098 -->

## 97. Workflow: Certificate Submission

The student uploads a certificate file. The platform validates the file against current rules and sends it into the configured review workflow.

After approval, the certificate may become visible in authenticated or public contexts depending on visibility policy.

Replacement of a certificate should follow the same moderation rules as the original submission where configured.


<!-- LOGICAL PAGE 099 -->

## 98. Workflow: Event Registration

A student opens an event that is currently accepting registrations and passes the event eligibility check.

The student completes the administrator-defined registration form. If the event requires a team, the student either enters a team manually or creates and manages invitations according to the event configuration.

After successful registration, the student sees the registration status and receives configured confirmation communication.


<!-- LOGICAL PAGE 100 -->

## 99. Workflow: Voting

A student with active voting eligibility enters a voting campaign during its configured voting window.

The portal explains the voting rule and available candidates. The student casts a valid vote according to the event's configured restriction.

A duplicate or otherwise invalid vote is rejected and clearly explained. After the voting window closes, new votes are not accepted.


<!-- LOGICAL PAGE 101 -->

## 100. Workflow: Automated Email

A configured trigger occurs. The automation engine evaluates the relevant conditions, resolves the recipient audience, selects the active template, generates the message, and submits it through the configured email provider.

The result is recorded in the email history. Failures should be visible to administrators.

Administrators can preview and test automations before activation.


<!-- LOGICAL PAGE 102 -->

## 101. Workflow: Announcement

An administrator creates an announcement, selects audience targeting, chooses delivery behavior, and optionally schedules publication.

Before activation, the portal shows the effective target group.

Once published, the announcement is delivered according to the selected channels and recorded for audit purposes.


<!-- LOGICAL PAGE 103 -->

## 102. Workflow: Change Request

A student submits a request to change authoritative college information. The request is routed to an administrator.

The administrator reviews the requested change and either approves or rejects it. The action is audited and the student receives the configured result notification.

The change request system prevents students from bypassing the authoritative student master source.


<!-- LOGICAL PAGE 104 -->

## 103. Workflow: Student Inactive Status

An administrator or authoritative status process changes the student's status to inactive or another configured state.

The portal evaluates the configured consequences for login, profile visibility, event eligibility, voting eligibility, and public presentation.

The system retains records according to administrative and retention policy.


<!-- LOGICAL PAGE 105 -->

## 104. Functional Requirements: Identity

FR-IDENTITY-001: The system shall authenticate students using the institutional Google account only.  
FR-IDENTITY-002: The system shall verify that the authenticated account is eligible for student access.  
FR-IDENTITY-003: The system shall associate authenticated identity with the authoritative student record.  
FR-IDENTITY-004: The system shall preserve authoritative identity fields separately from student-editable portfolio data.  
FR-IDENTITY-005: The system shall support administrator review of student-data change requests.


<!-- LOGICAL PAGE 106 -->

## 105. Functional Requirements: Profile

FR-PROFILE-001: The system shall provide a structured student profile.  
FR-PROFILE-002: The system shall allow student-managed profile photo replacement within the configured file policy.  
FR-PROFILE-003: The system shall enforce the 300-character biography limit.  
FR-PROFILE-004: The system shall support student skills from an administrator-managed predefined list.  
FR-PROFILE-005: The system shall support requests for new skills.  
FR-PROFILE-006: The system shall support professional links.  
FR-PROFILE-007: The system shall support configurable required and optional profile sections.


<!-- LOGICAL PAGE 107 -->

## 106. Functional Requirements: Portfolio

FR-PORT-001: The system shall support configurable project limits.  
FR-PORT-002: The system shall allow project reordering by the student.  
FR-PORT-003: The system shall support project title, description, technologies, GitHub link, and Google Drive video link.  
FR-PORT-004: The system shall support structured achievements with category and proof.  
FR-PORT-005: The system shall support certificate uploads.  
FR-PORT-006: The system shall support configurable moderation for portfolio content.


<!-- LOGICAL PAGE 108 -->

## 107. Functional Requirements: Intro Video

FR-VIDEO-001: The system shall support one active student introduction video.  
FR-VIDEO-002: The system shall support replacement of the active introduction video.  
FR-VIDEO-003: The system shall support configurable moderation for introduction videos.  
FR-VIDEO-004: The system shall allow the student to download their own introduction video.  
FR-VIDEO-005: The system shall not display introduction videos on public student profiles.


<!-- LOGICAL PAGE 109 -->

## 108. Functional Requirements: Resume

FR-RESUME-001: The system shall support one active resume per student.  
FR-RESUME-002: The system shall support resume replacement.  
FR-RESUME-003: The system shall support administrator approval of resumes.  
FR-RESUME-004: The system shall provide an embedded PDF viewer for approved public resumes.  
FR-RESUME-005: The system shall not intentionally provide a resume download action in the public viewer.


<!-- LOGICAL PAGE 110 -->

## 109. Functional Requirements: Public Profiles

FR-PUBLIC-001: The system shall provide public student profile URLs based on roll number.  
FR-PUBLIC-002: The system shall provide a public student directory.  
FR-PUBLIC-003: The system shall support public search and filtering according to configured directory capabilities.  
FR-PUBLIC-004: The system shall expose only approved and visible content.  
FR-PUBLIC-005: The system shall not expose the introduction video publicly.  
FR-PUBLIC-006: The system shall support public profile viewing without login.


<!-- LOGICAL PAGE 111 -->

## 110. Functional Requirements: Events

FR-EVENT-001: The system shall support configurable events.  
FR-EVENT-002: The system shall support configurable registration windows.  
FR-EVENT-003: The system shall support configurable registration fields.  
FR-EVENT-004: The system shall support team-based events.  
FR-EVENT-005: The system shall support manual team entry.  
FR-EVENT-006: The system shall support invitation-based team formation.  
FR-EVENT-007: The system shall support event-specific eligibility.  
FR-EVENT-008: The system shall provide registration status to students.


<!-- LOGICAL PAGE 112 -->

## 111. Functional Requirements: Voting

FR-VOTE-001: The system shall allow administrators to configure voter eligibility.  
FR-VOTE-002: The system shall allow administrators to configure voting rules.  
FR-VOTE-003: The system shall enforce voting-window dates.  
FR-VOTE-004: The system shall prevent duplicate invalid votes according to the configured rule.  
FR-VOTE-005: The system shall retain vote records for administrative reporting.  
FR-VOTE-006: The system shall support administrator-controlled result visibility.


<!-- LOGICAL PAGE 113 -->

## 112. Functional Requirements: Likes

FR-LIKE-001: The system shall support optional likes where enabled.  
FR-LIKE-002: A student shall be able to like an eligible item once.  
FR-LIKE-003: A student shall be able to unlike an item they have liked.  
FR-LIKE-004: The system shall prevent duplicate active likes for the same student and target.


<!-- LOGICAL PAGE 114 -->

## 113. Functional Requirements: Notifications

FR-NOTIF-001: The system shall provide an in-portal notification center.  
FR-NOTIF-002: The system shall support read and unread notification states.  
FR-NOTIF-003: The system shall support notification categories.  
FR-NOTIF-004: The system shall support priority.  
FR-NOTIF-005: The system shall support scheduled and targeted notifications.  
FR-NOTIF-006: The system shall support targeting by year, section, event participation, individual student, and custom group.


<!-- LOGICAL PAGE 115 -->

## 114. Functional Requirements: Email

FR-EMAIL-001: The system shall support configurable email automations.  
FR-EMAIL-002: The system shall support student-action triggers.  
FR-EMAIL-003: The system shall support admin-action triggers.  
FR-EMAIL-004: The system shall support scheduled triggers.  
FR-EMAIL-005: The system shall support conditions.  
FR-EMAIL-006: The system shall support editable templates.  
FR-EMAIL-007: The system shall support email preview and test sending.  
FR-EMAIL-008: The system shall record email delivery history.


<!-- LOGICAL PAGE 116 -->

## 115. Functional Requirements: Administration

FR-ADMIN-001: The system shall provide an administrative dashboard.  
FR-ADMIN-002: The system shall support student management.  
FR-ADMIN-003: The system shall support moderation.  
FR-ADMIN-004: The system shall support event management.  
FR-ADMIN-005: The system shall support voting management.  
FR-ADMIN-006: The system shall support announcement management.  
FR-ADMIN-007: The system shall support analytics.  
FR-ADMIN-008: The system shall support exports.  
FR-ADMIN-009: The system shall support storage policy management.  
FR-ADMIN-010: The system shall support role and permission management.


<!-- LOGICAL PAGE 117 -->

## 116. Functional Requirements: Audit

FR-AUDIT-001: The system shall record important administrative actions.  
FR-AUDIT-002: Audit records shall identify the actor.  
FR-AUDIT-003: Audit records shall include timestamps.  
FR-AUDIT-004: Audit records shall identify affected data.  
FR-AUDIT-005: Relevant records shall include before-and-after values.  
FR-AUDIT-006: Administrators with permission shall be able to filter and export audit data.


<!-- LOGICAL PAGE 118 -->

## 117. Role Access Matrix – Overview

The role model should be interpreted as an access framework rather than as a single fixed set of screens. A role may receive view, create, edit, approve, publish, delete, export, or configuration rights independently.

The Super Admin has authority over the permission model itself. The Admin manages operational functions granted by permissions. The Event Manager manages event-centric functions. The Moderator manages content and verification functions. Students manage their own permitted data and participate in eligible portal activities.

Public visitors have no administrative rights and no authenticated student-management rights.


<!-- LOGICAL PAGE 119 -->

## 118. Student Access

Students can authenticate through the institutional Google account, view and edit permitted personal profile information, manage their profile photo, maintain skills and professional links, manage projects, submit achievements and certificates, submit and replace the introduction video, upload and replace the resume, view their own statuses, register for eligible events, participate in eligible team flows, receive notifications, participate in configured voting, and use permitted likes.

Students cannot manage global portal settings, other students' data, admin roles, event configuration, email automation rules, storage policies, or audit logs.


<!-- LOGICAL PAGE 120 -->

## 119. Super Admin Access

Super Admin access includes platform governance, role management, permission management, administrator assignment, system-wide configuration, storage policy, automation configuration, analytics, exports, moderation override where allowed, event oversight, voting oversight, notification policy, audit access, and student-status control.

Super Admin actions should be treated as high-impact and should be auditable.


<!-- LOGICAL PAGE 121 -->

## 120. Admin Access

Admin access depends on granular permissions. Typical capabilities include student management, moderation, events, voting, announcements, analytics, exports, notifications, and operational settings.

An Admin must not automatically inherit Super Admin rights. High-sensitivity settings such as permission architecture should remain restricted unless explicitly granted.


<!-- LOGICAL PAGE 122 -->

## 121. Event Manager Access

Event Managers manage event creation and editing, registration windows, audience targeting, custom registration forms, teams, participant status, event announcements, and event-level communications.

Event Managers should not automatically receive permission to change global roles, storage policy, or system-wide email architecture.


<!-- LOGICAL PAGE 123 -->

## 122. Moderator Access

Moderators manage content review, approvals, rejections, change requests within their assigned scope, and public visibility decisions where permission is granted.

Moderators should not automatically be able to modify voting rules, global event configuration, role permissions, or storage architecture.


<!-- LOGICAL PAGE 124 -->

## 123. Public Visitor Access

Public visitors can browse the public student directory, search and filter public profiles, open individual public profile URLs, and view approved public content.

Public visitors cannot like, vote, edit profiles, download public resumes intentionally through the portal, view intro videos, access private event data, view audit history, or perform administrative actions.


<!-- LOGICAL PAGE 125 -->

## 124. Access to Student Contact Information

The public profile may display the institutional college email according to the locked requirement. Personal contact information is not part of the public baseline.

Administrative users with appropriate permissions can access contact information needed for legitimate operations. Such access should be auditable where the information is sensitive.


<!-- LOGICAL PAGE 126 -->

## 125. Access to Resumes

Students can manage their own resume. Administrators with appropriate permissions can review and manage resumes. Public visitors can view approved public resumes through the embedded viewer when public resume visibility is enabled.

Students and visitors should not receive an intentional public download workflow.


<!-- LOGICAL PAGE 127 -->

## 126. Access to Intro Videos

Students can view their own intro video and download their own video. Authorized administrators can review intro videos.

Other authenticated students do not receive general download rights. Public profiles do not display intro videos.

Event-specific experiences may use approved videos where rules allow, but such exposure must be explicit rather than inferred from profile publication.


<!-- LOGICAL PAGE 128 -->

## 127. Access to Portfolio Moderation

Students own the submission experience for their own portfolio entries. Moderators or other administrators with relevant permissions can inspect and change moderation state.

Public users only see approved and publicly visible content.

A rejected or hidden item remains unavailable publicly even if the student can still see and edit the underlying record.


<!-- LOGICAL PAGE 129 -->

## 128. Access to Events

Students can view events targeted to them and register when eligible. Event Managers can configure events and manage participation.

Public visitors may see public event information if the event is configured for public presentation, but registration remains authenticated unless another explicit policy is introduced.


<!-- LOGICAL PAGE 130 -->

## 129. Access to Voting

Students can access voting only when they are eligible under the active event rule and within the voting period.

Administrators with voting permissions can configure and inspect campaigns. Public visitors do not receive voting rights in the baseline system.

Vote records and administrative investigations remain protected from ordinary students.


<!-- LOGICAL PAGE 131 -->

## 130. Access to Announcements

Students receive announcements targeted to their audience and can read them in the notification center according to the configured delivery channel.

Authorized administrators can create and target announcements. The ability to reach custom groups should be restricted to roles with appropriate audience-management permission.


<!-- LOGICAL PAGE 132 -->

## 131. Access to Analytics

Analytics access is administrative. Super Admins generally have the broadest analytics access, while Admins and specialized roles may receive selected dashboards.

Student-level analytics should only be exposed when necessary and permitted. Students should not gain access to system-wide operational metrics simply because they participate in an event.


<!-- LOGICAL PAGE 133 -->

## 132. Access to Exports

Exports are administrative and permission controlled. The system should provide selectable columns and filters while preventing a lower-privileged role from exporting data outside its access scope.

Export actions should be auditable, especially for sensitive student information and voting data.


<!-- LOGICAL PAGE 134 -->

## 133. Access to Storage Configuration

Storage configuration is restricted to elevated administrators. It includes provider selection, destination mapping, file rules, retention, permissions, and cleanup.

Student users have no access to storage architecture or provider credentials. They interact only with the upload and viewing experiences that the platform exposes.


<!-- LOGICAL PAGE 135 -->

## 134. Access to Audit Logs

Audit logs are reserved for administrators with explicit permission, with broader access typically assigned to Super Admins.

Moderators or Event Managers may receive scoped audit visibility only where necessary for their operational responsibilities.

Students have access only to their own relevant status history, not the administrative audit log.


<!-- LOGICAL PAGE 136 -->

## 135. Access to Role Management

Role creation, permission assignment, and administrator role changes are restricted to Super Admin authority in the baseline model.

The system should make these controls separate from ordinary student or event administration because permission changes affect the security boundary of the platform.


<!-- LOGICAL PAGE 137 -->

## 136. Administrative Email Access

Users with email-automation permission can create, edit, preview, test, activate, disable, and inspect automated emails.

Event Managers may be granted event-scoped email capabilities without receiving permission to modify unrelated global automations.

Students do not manage system email templates or delivery rules.


<!-- LOGICAL PAGE 138 -->

## 137. Access to Skill Management

Administrators with appropriate configuration permission can manage the predefined skill list and review requests for new skills.

Students can select existing skills and request additions but cannot directly publish new skills to the shared list.


<!-- LOGICAL PAGE 139 -->

## 138. Access to Category Management

Administrators can create and manage categories for achievements and other configurable content types.

Category changes should be controlled so that archival does not destroy the meaning of existing historical records.


<!-- LOGICAL PAGE 140 -->

## 139. Access to Featured Student Controls

Administrators with curation permission can feature or unfeature students.

Featured status should not be automatically assigned based on likes or votes in the baseline requirements. It is a deliberate administrative selection.


<!-- LOGICAL PAGE 141 -->

## 140. Access to Visibility Controls

Visibility controls are administrative. A student may manage the content itself while an administrator controls whether the content is public, authenticated-only, or hidden.

This separation is essential for a department-controlled public showcase.


<!-- LOGICAL PAGE 142 -->

## 141. Functional Dependencies

Profile publication depends on identity eligibility and required-section configuration.

Public resume exposure depends on resume approval and public-visibility settings.

Public achievement or certificate exposure depends on moderation state and visibility rules.

Voting depends on an active campaign, voter eligibility, candidate availability, voting timing, and configured restrictions.

Automated email delivery depends on an enabled automation, valid trigger, satisfied conditions, target resolution, template availability, and sender configuration.


<!-- LOGICAL PAGE 143 -->

## 142. Governance Rules

Administrative governance should favor explicit configuration over hidden behavior. Any rule that changes who can see content, who can vote, who can register, or who receives communication should be visible in the corresponding administration module.

Global policy and event-specific policy should be clearly distinguished.

When multiple rules apply, the more restrictive applicable rule should control unless a documented override is intentionally configured.


<!-- LOGICAL PAGE 144 -->

## 143. Moderation Governance

Moderation should be evidence-based and traceable. Reviewers should know what content they are reviewing, what state it is in, what policy applies, and what action they are taking.

Rejected items should carry a useful reason. Administrative moderation changes should be visible in audit history.

Moderation policies should be configurable but should not be so complex that students cannot understand why a submission is blocked or unpublished.


<!-- LOGICAL PAGE 145 -->

## 144. Voting Governance

Voting governance requires a declared voting rule, explicit eligibility, fixed opening and closing times, and clear handling of invalid attempts.

Changes to an active campaign should be restricted and audited. Finalized results should be distinguishable from temporary live counts.

The portal should maintain enough history to support legitimate administrative review of voting activity.


<!-- LOGICAL PAGE 146 -->

## 145. Communication Governance

Automated email and notification rules should be owned by authorized administrators. Test sending must be available before activation.

Targeting should be transparent. High-volume communication should not be activated without a clear recipient scope.

Templates should be reviewed for clarity and should identify the relevant event or action so students understand why they received the message.


<!-- LOGICAL PAGE 147 -->

## 146. Storage Governance

Storage configuration should align the data's sensitivity with its storage and access policy.

Publicly visible files and private administrative files should not share the same access assumptions simply because they use the same provider.

Retention and cleanup should be predictable and auditable.


<!-- LOGICAL PAGE 148 -->

## 147. Administrative Exception Handling

Exceptional administrative actions such as force-hiding a profile, overriding a moderation decision, changing a voting campaign after publication, or deactivating a student's access should require the relevant elevated permission and should create an audit record.

Where practical, exceptional actions should require an explanation or reason field.


<!-- LOGICAL PAGE 149 -->

## 148. User Experience Quality Requirements

The portal should be easy to understand without requiring training for ordinary student tasks. Statuses, actions, and access limitations should be communicated in plain language.

Administration screens should prioritize clarity and operational speed without sacrificing auditability.

The clean, minimal visual direction should be maintained across student and admin surfaces while allowing the admin portal to present denser operational information.


<!-- LOGICAL PAGE 150 -->

## 149. Mobile Behavior

The student portal must be usable on mobile devices. Navigation uses bottom navigation on mobile and a left sidebar on desktop.

Uploads, resume viewing, profile editing, event registration, team invitations, notifications, and voting should remain usable on smaller screens.

Administrative experiences may remain desktop-oriented but should preserve responsive behavior where reasonably practical.


<!-- LOGICAL PAGE 151 -->

## 150. Accessibility Expectations

Core portal functions should be accessible through clear labels, sufficient contrast, predictable focus behavior, understandable error messages, and readable controls.

Important states such as approval, rejection, and closed registration should not rely only on color.

Administrative tables and filters should remain usable for common keyboard and assistive workflows where technically supported.


<!-- LOGICAL PAGE 152 -->

## 151. Reporting and Operational Review

Administrators should be able to review operational performance through analytics and exports.

Useful reporting dimensions include student participation, profile completion, submission status, event registration, voting volume, likes, email delivery outcomes, moderation workload, and public profile activity.

Reports should support time ranges and event context where available.


<!-- LOGICAL PAGE 153 -->

## 152. Data Quality Controls

The portal should minimize duplicate identities, inconsistent skill names, invalid event registrations, duplicate likes, invalid votes, and orphaned content.

Authoritative student data should come from the master student identity source. Shared categories should come from administrator-managed lists. Votes and likes should be constrained by their governing rules.


<!-- LOGICAL PAGE 154 -->

## 153. Administrative Search

Administrative search should support students, submissions, events, registrations, emails, and audit records as appropriate to the user's permissions.

Search should provide filters rather than relying only on free-text matching. Results should clearly identify the entity type to prevent accidental actions on the wrong record.


<!-- LOGICAL PAGE 155 -->

## 154. Archive Behavior

Completed events, old submissions, disabled automations, retired categories, and obsolete notifications should be archivable rather than indiscriminately deleted.

Archived information remains available to authorized administrators for historical reporting according to retention policy.

Archived content should not accidentally appear in active public or student workflows.


<!-- LOGICAL PAGE 156 -->

## 155. Deletion Behavior

Deletion is a privileged action. Where business history matters, the preferred behavior is often to deactivate, hide, archive, or withdraw rather than physically delete.

When physical deletion is allowed, the system should evaluate dependencies and audit requirements before removing the record.


<!-- LOGICAL PAGE 157 -->

## 156. Replacement Behavior

Replaceable content should have predictable behavior.

Replacing a profile photo changes the current profile image without changing unrelated fields.

Replacing a project updates the selected project record.

Replacing a resume or intro video may create a new pending version while retaining the prior approved state until review, depending on configured policy.


<!-- LOGICAL PAGE 158 -->

## 157. Notification Examples

Representative notifications include profile-change-request approved, profile-change-request rejected, intro video submitted, intro video approved, intro video changes requested, resume approved, resume rejected, achievement approved, certificate verified, event registration confirmed, event registration status changed, team invitation received, team invitation accepted, voting opened, voting closing soon, voting closed, announcement published, and automation-related operational notices for administrators.


<!-- LOGICAL PAGE 159 -->

## 158. Email Automation Examples

Representative automations include a submission receipt after a student uploads an intro video; an approval email after moderation; a rejection email with a reason; a team invitation email after a team member is invited; a reminder one day before an event deadline; a voting-open email at campaign start; a voting-closing reminder; an event result notification; and an administrator alert after a configured operational failure.


<!-- LOGICAL PAGE 160 -->

## 159. Student Journey Summary

The student journey begins with institutional sign-in, moves to profile completion, then allows professional portfolio building and controlled submissions.

The student can maintain projects, achievements, certificates, resume, and introduction video without encountering unrelated administrative complexity.

Events and voting provide participation modules. Notifications and automated emails keep the student informed. Public profiles provide controlled presentation of approved information without exposing the authenticated management environment.


<!-- LOGICAL PAGE 161 -->

## 160. Administrator Journey Summary

The administrator journey begins at the operational dashboard, where queues and system health are visible.

Administrators manage students, content, events, notifications, voting, email automation, storage, analytics, exports, and audit information according to role.

The Super Admin additionally manages the access model and system-wide governance. Specialized roles operate within clear boundaries.


<!-- LOGICAL PAGE 162 -->

## 161. Functional Acceptance Themes

A functional review should confirm that each module has a normal success path, a permission check, a validation path, a moderation path where required, a notification outcome where required, and an audit outcome where required.

A public profile should never expose content that is hidden or unapproved. A voter should never bypass the configured ballot rule. A lower-privileged administrator should never perform an action outside their permissions.


<!-- LOGICAL PAGE 163 -->

## 162. Acceptance: Student Profile

Acceptance is satisfied when an eligible student can sign in with the institutional Google account, view authoritative academic identity details, update permitted profile sections, use a 300-character biography, select managed skills, request new skills, manage professional links, and see clear completion status based on current administrator configuration.


<!-- LOGICAL PAGE 164 -->

## 163. Acceptance: Portfolio

Acceptance is satisfied when a student can add projects with the defined information, reorder them, add structured achievements and certificates, and see correct moderation states when approval is required.

Public presentation must respect visibility policy.


<!-- LOGICAL PAGE 165 -->

## 164. Acceptance: Resume

Acceptance is satisfied when a student can upload and replace a PDF resume, receive a review status, and view the approved resume in an embedded viewer.

Public viewers can view an approved public resume but do not receive an intentional download workflow.


<!-- LOGICAL PAGE 166 -->

## 165. Acceptance: Introduction Video

Acceptance is satisfied when a student can submit one active introduction video, replace it, track review state, and download their own video.

The public profile and public directory must not display the intro video.


<!-- LOGICAL PAGE 167 -->

## 166. Acceptance: Events

Acceptance is satisfied when administrators can create an event with configurable registration details, eligibility, team behavior, and targeting, and eligible students can register using the configured form.

Both manual team membership and invitation-based team membership must be supportable where enabled.


<!-- LOGICAL PAGE 168 -->

## 167. Acceptance: Voting

Acceptance is satisfied when an administrator can define voter eligibility, voting rules, candidate participation, dates, and result behavior, and when the system enforces the configuration for students during and after the voting window.


<!-- LOGICAL PAGE 169 -->

## 168. Acceptance: Notifications and Email

Acceptance is satisfied when administrators can configure portal notifications and automated emails with triggers, conditions, targeting, schedules, templates, preview, and test sending.

The system must retain delivery history and display operational failures to authorized administrators.


<!-- LOGICAL PAGE 170 -->

## 169. Acceptance: RBAC

Acceptance is satisfied when Super Admin, Admin, Event Manager, and Moderator can be assigned distinct granular permissions and when each role can access only the functions it has been granted.

A role without a permission must be denied that action even if the corresponding screen is discoverable.


<!-- LOGICAL PAGE 171 -->

## 170. Acceptance: Audit

Acceptance is satisfied when material administrative actions produce audit entries that identify actor, time, affected object, action, and relevant before-and-after values.

Audit records must remain protected from ordinary student access.


<!-- LOGICAL PAGE 172 -->

## 171. Future Expansion Boundaries

The architecture should leave room for later functions such as richer alumni profiles, placement-oriented portfolios, verified skills, departmental achievements, certificates with stronger institutional verification, additional event types, richer analytics, or other department services.

Future expansion should not reintroduce the removed social-feed model unless separately approved as a new product requirement.


<!-- LOGICAL PAGE 173 -->

## 172. Removed Social Feed Decision

The social feed is explicitly removed from this specification.

There is no feed of student posts, no general timeline, no follower graph, no comment system, no social post composer, and no direct-message experience.

Student discovery is structured through the directory, profile pages, projects, achievements, certificates, and event participation. Interaction remains limited to the separately governed like and voting functions where enabled.


<!-- LOGICAL PAGE 174 -->

## 173. Consolidated Student Function List

Students can authenticate; view their dashboard; manage their professional profile; upload/change profile photo; maintain a 300-character biography; select skills; request new skills; maintain professional links; create, edit, reorder, and remove projects within the configured limit; add achievements; upload certificates; submit and replace one active intro video; download their own intro video; upload and replace one resume; view content status; submit data change requests; browse events; register for events; complete configurable event forms; participate in manual or invitation-based team formation; receive notifications; participate in eligible voting; like eligible content where enabled; and view public profiles and the public directory as a member of the IT student community.


<!-- LOGICAL PAGE 175 -->

## 174. Consolidated Super Admin Function List

Super Admins can manage students, student status, moderation, events, voting, notifications, announcements, email automation, templates, storage policy, retention rules, analytics, exports, audit logs, categories, skills, featured students, visibility policies, approval rules, system settings, roles, permissions, and administrator access assignments.

Super Admins can also configure the rules that determine how lower-level administrators operate.


<!-- LOGICAL PAGE 176 -->

## 175. Consolidated Admin Function List

Admins can perform the operational tasks assigned by granular permissions. Depending on configuration, this includes student management, content review, approvals, event management, voting administration, announcements, notifications, analytics, exports, email workflows, and visibility controls.

Admin capability is never assumed to be identical to Super Admin capability.


<!-- LOGICAL PAGE 177 -->

## 176. Consolidated Event Manager Function List

Event Managers can create and manage events, registration periods, eligibility, registration fields, team methods, participant records, team status, event announcements, event reminders, and event-specific communication.

Their access remains scoped to event administration unless additional permissions are explicitly assigned.


<!-- LOGICAL PAGE 178 -->

## 177. Consolidated Moderator Function List

Moderators can review and moderate student-submitted content, including intro videos, resumes, achievements, certificates, and other configured content types.

They can approve, reject, request changes, hide, or otherwise manage content states when granted those permissions.


<!-- LOGICAL PAGE 179 -->

## 178. Consolidated Public Visitor Function List

Public visitors can browse the student directory, search and filter students, open public student profile pages, read approved profile information, view approved public portfolio content, and use the embedded public resume viewer where enabled.

Visitors cannot edit content, access intro videos, vote, like, view private information, or access administration.


<!-- LOGICAL PAGE 180 -->

## 179. Final Functional Blueprint

The final functional blueprint is centered on controlled identity, structured portfolio management, moderated student showcase content, event operations, governed voting, targeted notifications, automated email, configurable storage, analytics, exports, and granular administration.

The platform is not a social network. It is a department-level student portal with portfolio and participation functions.

The most important design rule is that the same content may have different editing, approval, authenticated visibility, and public visibility states. The portal must preserve those distinctions consistently across every module.


<!-- LOGICAL PAGE 181 -->

## 180. Final Requirements Summary

The redesigned ELITE Student Portal shall serve current IT students only; use institutional Google authentication; provide a professional student profile; support profile photo, biography, skills, links, projects, achievements, certificates, intro video, and resume; allow configurable profile completion; use administrator-controlled visibility; provide public student profiles and a public directory; omit public intro video display; allow public resume viewing without an intentional download function; support configurable events and team registration; support administrator-defined voting eligibility and rules; support optional likes; provide a full notification center; support targeted announcements; support a configurable email automation builder with triggers, conditions, schedules, templates, preview, and test delivery; use fixed ELITE sender identity; support administrator-configurable storage policies; provide granular role-based access control; provide Super Admin, Admin, Event Manager, and Moderator roles; maintain full audit history; provide analytics and custom exports; and explicitly exclude a social feed.

This document therefore defines a reusable functional foundation for an ELITE Student Portal that can support future student showcases, department events, portfolio requirements, voting campaigns, and communication workflows without remaining locked to a single intro-video use case.


---

# End of SRS

---

# Appendices

## Appendix A. Detailed User-to-Function Access Matrix

The following matrix describes the intended baseline access model. “Manage” means the role can create, edit, configure, or administer the function within its permitted scope. “Review” means the role can inspect and make moderation decisions where applicable. “Own” means a student can manage only their own record. “Read” means the role can view the function without changing it.

| Function Area | Student | Moderator | Event Manager | Admin | Super Admin | Public Visitor |
|---|---|---|---|---|---|---|
| Institutional sign-in | Own | Admin account | Admin account | Admin account | Admin account | No |
| Own profile | Own | Read | Read | Manage if permitted | Manage | Public approved view |
| Other student profiles | Approved view | Read | Read | Read/Manage if permitted | Manage | Public approved view |
| Student master data | Request change | Read/Review if permitted | Read if permitted | Manage if permitted | Manage |
| Profile photo | Own | Review if permitted | Read | Manage if permitted | Manage |
| Biography | Own | Review if configured | Read | Manage if permitted | Manage |
| Skills | Select own | Read | Read | Manage list if permitted | Manage |
| Skill requests | Create own request | Review if permitted | No default | Review/Manage if permitted | Manage |
| Social links | Own | Read | Read | Manage if permitted | Manage |
| Projects | Own | Review if configured | Read | Manage if permitted | Manage |
| Achievements | Own | Review | Read | Manage | Manage |
| Certificates | Own upload/view | Verify | Read | Verify/Manage | Manage |
| Intro video | Own upload/view | Review | Read if event permits | Review/Manage | Manage |
| Own intro download | Yes | No default | No default | No default | Yes by privilege | No |
| Resume | Own upload/view | Review | Read if permitted | Review/Manage | Manage | Approved public view |
| Public resume viewer | N/A | Read | Read | Read | Read | View only |
| Public directory | Yes | Yes | Yes | Yes | Yes | Yes |
| Event browsing | Yes | Read | Manage | Manage | Manage | Public events only |
| Event registration | Yes | No default | Read | Read/Manage | Manage |
| Team creation | Yes when enabled | No default | Manage | Manage | Manage |
| Team invitation | Yes when enabled | No default | Manage | Manage | Manage |
| Event participant management | Own | Read | Manage | Manage | Manage |
| Voting | Eligible students only | No default | Manage if granted | Manage if granted | Manage |
| Vote review | Own result visibility only | Read if permitted | Manage if permitted | Manage | Manage |
| Likes | Yes where enabled | Read | Read | Manage if permitted | Manage |
| Notifications | Own | Own/admin scope | Own/admin scope | Manage | Manage |
| Announcements | Read targeted | Read | Create/manage scoped | Create/manage | Full manage |
| Email templates | No | No default | Scoped if granted | Manage if granted | Full manage |
| Email automations | No | No default | Event-scoped if granted | Manage if permitted | Full manage |
| Email testing | No | No | Scoped if granted | Manage if granted | Full manage |
| Email history | Own delivery notices | Scoped if granted | Event scope | Manage if permitted | Full view |
| Storage policy | No | No | No default | Manage if granted | Full manage |
| Categories | No | No | Read | Manage if granted | Full manage |
| Featured students | No | No | No default | Manage if permitted | Full manage |
| Analytics | Own limited summaries | Scoped | Event scoped | Operational | Full |
| Exports | No | Scoped if granted | Event scoped | Operational | Full |
| Audit log | No | Scoped if granted | Scoped if granted | Operational if granted | Full |
| Roles | No | No | No | No unless explicitly granted | Full |
| Permissions | No | No | No | No unless explicitly granted | Full |
| Student status | No | No | No default | Manage if permitted | Full |
| Retention rules | No | No | No | Manage if granted | Full |
| System configuration | No | No | No | Limited | Full |

## Appendix B. Student Function Catalog

### B1. Authentication and Account Entry

The student can begin a portal session through the institutional Google authentication route. The portal identifies the student from the authenticated college account and checks eligibility against current student records. A student with an eligible active status proceeds to the portal. A student who is not eligible receives an appropriate access message without being exposed to another student's data.

The student does not maintain a separate portal password. This reduces the number of identity systems the student must understand and ensures that access is tied to the institutional account.

### B2. Profile Management

The student can inspect the current profile, understand which fields are authoritative, and update permitted professional information. The system distinguishes college identity from portfolio content. Profile editing is divided into logical sections so that the student can update one area without navigating a large monolithic form.

The student can update profile photo, biography, skills, professional links, projects, achievements, and other permitted fields. Basic college information remains controlled by the master student record.

### B3. Profile Change Request

When a locked identity field is incorrect, the student can submit a correction request. The student should not be required to contact an administrator through an unrelated external channel simply to correct a profile value.

The change-request status should be visible to the student. A pending request means that an administrator has not completed review. An approved request means the authoritative record has been updated or queued according to the configured workflow. A rejected request means the change was not accepted.

### B4. Profile Completion

The student can view completion progress generated from administrator configuration. Required sections are distinguished from optional sections. The completion display is intended to guide the student, not pressure them into entering information that the portal does not require.

### B5. Skills

The student selects skills from the ELITE skill catalog. Search and selection should be understandable and should prevent obvious duplicate entries. When a skill is missing, the student requests it instead of inventing a new spelling.

### B6. Projects

The student creates a project with the required structured information. Project order is controlled by the student. The configured maximum number of projects is respected. Existing projects can be edited without affecting unrelated projects.

### B7. Achievements

The student creates an achievement record, chooses an administrator-managed category, and provides evidence where the configuration requires it. The student sees whether the achievement is pending, approved, rejected, or hidden.

### B8. Certificates

The student uploads a certificate file. The student sees the current review state. Replacing a certificate follows the active approval policy.

### B9. Intro Video

The student submits one active introduction video and can replace it. The student receives status information throughout review. The student's own download permission is distinct from other users' access.

### B10. Resume

The student uploads one PDF resume and can replace it. A replacement may be held for review while the prior approved version remains available according to the configured business rule.

### B11. Events

The student can discover relevant events, inspect eligibility, read dates and descriptions, and complete configurable registration forms. Team-related functions appear only when the event enables them.

### B12. Voting

The student can enter an eligible campaign, read the active voting rule, and submit votes according to the rule. The portal communicates why voting is unavailable when the campaign has not started, has closed, or the student is ineligible.

### B13. Notifications

The student can see notifications, distinguish unread items, and understand the source of important actions. Notifications should link to the relevant portal context where useful.

## Appendix C. Administrative Function Catalog

### C1. Student Operations

Administrators can locate a student, review profile completeness, inspect content, review status, manage visibility where permitted, and handle change requests. Student operations must clearly separate student-owned profile content from authoritative academic identity.

### C2. Moderation Operations

Moderators review content according to configured policies. A review screen should identify the student, content type, content state, submission time, previous decisions where relevant, and available actions.

### C3. Event Operations

Event Managers create events, define target audiences, control registration periods, build registration questions, select team behavior, review registrations, and communicate with participants.

### C4. Voting Operations

Authorized administrators create voting campaigns, define eligible voters, define ballot constraints, set dates, determine result visibility, and monitor campaign activity. Once a campaign is active, configuration changes should be controlled and audited.

### C5. Communication Operations

Administrators create targeted announcements and configure automated communication. They should be able to understand the difference between an announcement, a notification, and an email automation.

### C6. Storage Operations

Authorized administrators choose the storage destination for content types, define file policies, control retention, and manage cleanup. Storage changes should not silently rewrite historical content rules.

### C7. Analytics Operations

Administrators inspect system participation and operational trends. Analytics should help answer questions such as how many students completed their profile, how many submissions are pending, which events are attracting registrations, how many votes have been recorded, and whether communication delivery is functioning.

### C8. Export Operations

Administrators can create exports using filters and selectable columns. The system should report the effective export scope before generation.

### C9. Audit Operations

Administrators can inspect a chronological record of material administrative changes. Audit information is evidence of what the system recorded, not a replacement for broader organizational policy.

## Appendix D. Access Rules by Data State

### D1. Draft State

Draft content belongs to the student or creator and is not public unless a policy explicitly makes it public. Moderators do not need to review draft content unless the workflow is configured to do so.

### D2. Submitted State

Submitted content has been formally sent into an approval or processing workflow. The student should see that the item is no longer simply a local draft.

### D3. Under Review State

Under review means an authorized reviewer is expected to inspect the item. Public publication remains blocked when approval is required.

### D4. Approved State

Approved content has passed the configured review requirement. Approval does not automatically imply public visibility if the visibility policy remains private.

### D5. Rejected State

Rejected content does not qualify for the visibility level that depends on approval. A reason should normally accompany the decision.

### D6. Changes Requested State

Changes requested means the content requires student action before it can return to an eligible review or publication state.

### D7. Published State

Published means the content has passed both the required content decision and the required visibility decision.

### D8. Hidden State

Hidden means the content is intentionally unavailable in the affected presentation context even if its internal record still exists.

### D9. Archived State

Archived means the item is retained for historical or administrative purposes and removed from normal active workflows.

## Appendix E. Administrative Configuration Areas

The following areas should be configurable rather than hard-coded where practical:

1. Profile-required sections.
2. Profile visibility policy.
3. Maximum project count.
4. Skill catalog.
5. Achievement categories.
6. Certificate moderation requirements.
7. Resume approval requirements.
8. Intro video approval requirements.
9. Event audience.
10. Event registration period.
11. Event registration questions.
12. Team participation method.
13. Voting audience.
14. Voting rule.
15. Voting dates.
16. Public result behavior.
17. Like availability.
18. Announcement audience.
19. Notification categories.
20. Notification priority.
21. Notification schedules.
22. Email triggers.
23. Email conditions.
24. Email schedules.
25. Email templates.
26. Email test behavior.
27. Storage provider.
28. Storage destination.
29. Allowed file types.
30. File-size limits.
31. Retention rules.
32. Cleanup rules.
33. Role permissions.
34. Student status consequences.
35. Public resume visibility.
36. Public profile field visibility.
37. Featured-student controls.
38. Analytics visibility.
39. Export fields.
40. Audit retention.

## Appendix F. Functional Permission Principles

Permissions should follow least privilege. A user receives the minimum access needed to perform their assigned work. Specialized roles should not gain unrelated powers merely because they can access the same dashboard.

Permissions should also be separable. For example, viewing a student record, editing a student record, approving a resume, and exporting student data are different actions even if they occur on the same screen.

Permissions should be revocable. When an administrator changes roles, the effective access must change according to the new role configuration.

Permissions should be auditable. Changes to roles and high-impact permissions should themselves be recorded.

Permissions should be contextual. Event Managers may have permission to manage one event without gaining permission to manage every event. Moderators may have permission to review certificates without permission to configure voting.

## Appendix G. Functional Notification Catalog

| Trigger | Typical Recipient | Portal Notification | Optional Email |
|---|---|---|---|
| First profile onboarding | Student | Yes | Configurable |
| Change request submitted | Student/Admin | Yes | Configurable |
| Change request approved | Student | Yes | Yes |
| Change request rejected | Student | Yes | Yes |
| Intro video submitted | Student/Admin | Yes | Yes |
| Intro video approved | Student | Yes | Yes |
| Intro video rejected | Student | Yes | Yes |
| Resume submitted | Student/Admin | Yes | Yes |
| Resume approved | Student | Yes | Yes |
| Resume rejected | Student | Yes | Yes |
| Achievement approved | Student | Yes | Configurable |
| Certificate verified | Student | Yes | Configurable |
| Event registration confirmed | Student | Yes | Yes |
| Event registration rejected | Student | Yes | Yes |
| Team invitation | Invited Student | Yes | Yes |
| Team invitation accepted | Team creator | Yes | Configurable |
| Event reminder | Targeted Students | Yes | Yes |
| Voting opened | Eligible voters | Yes | Yes |
| Voting reminder | Eligible voters | Yes | Yes |
| Voting closed | Relevant users | Yes | Configurable |
| Result published | Targeted students | Yes | Yes |
| Announcement | Target audience | Yes | Configurable |

## Appendix H. Functional Email Automation Catalog

The automation system should support the following conceptual trigger families.

### Student-initiated triggers
A student submits content, updates a profile section, requests a change, registers for an event, accepts a team invitation, declines a team invitation, or performs another configured student action.

### Administrator-initiated triggers
An administrator approves content, rejects content, requests changes, publishes an announcement, changes an event state, changes voting state, or performs another configured administrative action.

### Time-based triggers
An event approaches its registration deadline, an event starts, voting opens, voting approaches closure, a scheduled reminder becomes due, or another defined date-time condition occurs.

### Condition-based triggers
A student has not completed a required section, a moderation queue exceeds a defined threshold, an email automation fails, a configured audience has not completed an action, or another supported business condition becomes true.

## Appendix I. Functional Analytics Catalog

Recommended administrative measures include:

- Total active students.
- Inactive students.
- Profile completion distribution.
- Number of video submissions.
- Video approval rate.
- Video rejection rate.
- Resume submission count.
- Resume approval rate.
- Achievement verification volume.
- Certificate verification volume.
- Event registrations by event.
- Event registrations by year and section.
- Team counts.
- Voting participation.
- Votes by event.
- Likes by content type.
- Public profile views.
- Resume views.
- Notification delivery count.
- Email delivery success and failure count.
- Pending moderation volume.
- Average moderation queue age.
- Change-request volume.
- Change-request resolution rate.
- Storage consumption.
- Active automations.
- Failed automations.

Analytics are descriptive operational measurements. They should not grant access to private data beyond the administrator's permission scope.

## Appendix J. Export Catalog

The export function should be able to produce, subject to permission:

- Student identity export.
- Student profile export.
- Profile completion export.
- Portfolio content export.
- Event registration export.
- Team membership export.
- Voting participation export.
- Vote count export.
- Like activity export.
- Moderation export.
- Notification export.
- Email delivery export.
- Analytics summaries.
- Audit log export.

Each export should record its creator, date, filters, selected columns, and relevant scope in the administrative audit record.

## Appendix K. Operational Questions the Portal Must Answer

A well-designed system should allow authorized administrators to answer questions such as:

1. Which students are eligible to use the portal?
2. Which students have incomplete required profiles?
3. Which students have not submitted an intro video?
4. Which introduction videos are pending review?
5. Which resumes are awaiting approval?
6. Which students have public profiles?
7. Which projects are publicly visible?
8. Which achievement items are awaiting verification?
9. Which certificates require review?
10. Which events are currently open?
11. Who has registered for a selected event?
12. Which teams are incomplete?
13. Which students are eligible to vote?
14. Which voting campaign is currently active?
15. What voting rule applies to that campaign?
16. How many valid votes have been recorded?
17. Which announcements are scheduled?
18. Which email automations are active?
19. Which automated emails failed?
20. Which storage policy is assigned to a file type?
21. Which administrators changed a sensitive setting?
22. Which students are featured?
23. Which student-data corrections are waiting for review?
24. Which records are approaching retention or cleanup?
25. Which data can a particular administrator role access?

## Appendix L. Explicitly Excluded Functions

The following are explicitly excluded from this version:

- Social feed.
- Student posts.
- Public comment system.
- Student following.
- Direct messaging.
- Public intro-video display.
- Public voting.
- Public liking.
- Public resume download.
- Student self-assignment of official college identity values.
- Unrestricted custom role escalation.
- Uncontrolled skill creation.
- Hard-coded event registration forms.
- Hard-coded voting rules.
- Hard-coded communication flows.

The exclusions are important because they define the product boundary. A future change request should treat any excluded function as a new requirement rather than assuming it belongs to the current scope.

## Appendix M. Final Role Statements

**Student:** Uses the institutional identity to maintain a professional department profile, manage permitted portfolio information, submit moderated content, register for events, join teams, participate in eligible voting, receive notifications, and view public department profiles.

**Moderator:** Reviews student-submitted content and maintains moderation decisions within the assigned scope.

**Event Manager:** Owns event configuration and event operations within the assigned scope, including registration and team participation.

**Admin:** Performs operational management functions according to granular assigned permissions.

**Super Admin:** Governs the platform's administrative model, role system, permissions, configuration, and high-impact operational controls.

**Public Visitor:** Discovers public student profiles and reads approved public content without gaining authenticated management or interaction rights.

## Appendix N. Final Product Boundary

The product boundary is intentionally clear:

The student side is a **professional academic portal**.

The public side is a **controlled student directory and profile showcase**.

The event side is a **configurable participation system**.

The voting side is a **governed event mechanism**.

The administrative side is a **permission-controlled management and operations center**.

The communication side is a **targeted notification and email automation system**.

The content side is a **moderated portfolio and document-management experience**.

Together, these functions form one reusable ELITE platform rather than a single-purpose introduction-video uploader.

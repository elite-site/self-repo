# ELITE Study Resources — Drive & Access Setup Guide

This document outlines the recommended Google Drive folder architecture, permission management, and backend security policies for the **Resources** module in the ELITE Portal.

---

## 1. Recommended Google Drive Folder Structure

To keep study materials organized and easily maintainable across academic batches and semesters, configure the Google Drive root folder as follows:

```text
ELITE Resources (Root Shared Folder)
├── Year-1/
│   ├── Sem-1/
│   │   ├── Mathematics-I/
│   │   │   ├── Notes/
│   │   │   ├── PPTs/
│   │   │   ├── Question-Papers/
│   │   │   └── Lab-Manuals/
│   │   └── Programming-in-C/
│   │       ├── Notes/
│   │       ├── Question-Papers/
│   │       └── Lab-Manuals/
│   └── Sem-2/
│       ├── Data-Structures/
│       │   ├── Notes/
│       │   ├── PPTs/
│       │   ├── Question-Papers/
│       │   └── Syllabus/
│       └── Digital-Logic/
├── Year-2/
│   ├── Sem-3/
│   │   ├── Java-Programming/
│   │   └── Discrete-Math/
│   └── Sem-4/
│       ├── DBMS/
│       └── Operating-Systems/
├── Year-3/
│   ├── Sem-5/
│   │   ├── Computer-Networks/
│   │   └── Web-Technologies/
│   └── Sem-6/
│       ├── Artificial-Intelligence/
│       └── Software-Engineering/
└── Year-4/
    ├── Sem-7/
    │   ├── Cloud-Computing/
    │   └── Information-Security/
    └── Sem-8/
        ├── Deep-Learning/
        └── Project-Guidelines/
```

---

## 2. Google Drive Sharing & Security Recommendation

> [!IMPORTANT]
> **Do NOT use "Anyone with the link can view" on sensitive internal course materials.**
> Anyone with the link allows external sharing, leaks material indexation, and bypasses institutional access control.

### Recommended Access Model: Google Groups per Academic Batch
Use Google Workspace Groups to restrict Drive file/folder viewing exclusively to verified college emails:

| Year Cohort | Google Group Address | Permitted Drive Folder |
|---|---|---|
| 1st Year Students | `batch-2026-year1@gmrit.edu.in` | `Year-1/` (Viewer) |
| 2nd Year Students | `batch-2025-year2@gmrit.edu.in` | `Year-1/`, `Year-2/` (Viewer) |
| 3rd Year Students | `batch-2024-year3@gmrit.edu.in` | `Year-1/`, `Year-2/`, `Year-3/` (Viewer) |
| 4th Year Students | `batch-2023-year4@gmrit.edu.in` | `Year-1/`, `Year-2/`, `Year-3/`, `Year-4/` (Viewer) |
| Faculty / Coordinators | `resources-coordinators@gmrit.edu.in` | `ELITE Resources (Root)` (Editor / Manager) |

When students advance to the next academic year, their group membership is updated in Google Workspace, automatically granting revision access to earlier semesters while strictly withholding upcoming semesters.

---

## 3. Data Layer Security: Backend & Database Level Enforcement

Access restrictions are enforced at the **data query layer**, not merely hidden in the frontend UI.

### 3.1 Backend Application Enforcement (Express + Prisma)
The backend service checks the student's year from the authenticated JWT session:
- If a student calls `GET /api/student/resources?semester=7` but is in 2nd or 3rd year, the backend immediately throws a `403 Forbidden` (`FORBIDDEN`).
- Even when no `semester` query parameter is passed, the Prisma repository query explicitly executes:
  ```ts
  where: {
    semester: { in: allowedSemesters }
  }
  ```
  Consequently, future semester study materials are never loaded into memory or returned over the network.

### 3.2 Database Row Level Security (RLS) Policy for PostgreSQL / Supabase
If querying PostgreSQL directly via Supabase or PostgREST, enable Row Level Security (RLS) on the `resources` table.

Paste the following SQL in your **Supabase SQL Editor** or **PostgreSQL console**:

```sql
-- 1. Enable Row Level Security on the resources table
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Authenticated students can only read resources for their allowed semesters
-- Assumes student year is stored in auth.jwt() -> app_metadata or user_metadata
CREATE POLICY "student_semester_access_policy"
ON "resources"
FOR SELECT
TO authenticated
USING (
  -- Super admin / staff bypass
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('ADMIN', 'SUPER_ADMIN')
  OR
  -- Student can only read semesters up to (student_year * 2)
  (
    semester <= (
      coalesce((auth.jwt() -> 'user_metadata' ->> 'year')::integer, 1) * 2
    )
  )
);

-- 3. Policy: Only admins can insert, update, or delete resources
CREATE POLICY "admin_resources_management_policy"
ON "resources"
FOR ALL
TO authenticated
USING (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('ADMIN', 'SUPER_ADMIN')
)
WITH CHECK (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('ADMIN', 'SUPER_ADMIN')
);
```

---

## 4. How to Add a New Study Resource as an Admin

1. Open the Admin Console at `/admin`.
2. Sign in with administrative credentials.
3. In the sidebar under **Academics & Learning**, click **Study Resources**.
4. Click **+ Add Resource** in the top right.
5. Fill in the required fields:
   - **Title**: Descriptive name (e.g. `Computer Networks Unit 1 & 2 Notes`).
   - **Year**: Select Academic Year (1, 2, 3, or 4).
   - **Semester**: Select Semester (1 to 8).
   - **Subject**: Enter Subject Name (e.g. `Computer Networks`).
   - **Type**: Select from `Notes`, `PPT`, `Question Paper`, `Lab Manual`, `Syllabus`, or `Other`.
   - **Google Drive Link**: Paste the Google Drive link (`https://drive.google.com/file/d/...` or folder link).
6. Click **Create Resource**. The link is validated and immediately available to students in that semester and above.

# Roster Import Runbook

`Students_Master_List.xlsx` at the repo root is the single source of truth for which
emails may sign in. Roster emails are the **SSO allowlist**: `Student.email` is matched
exactly against the verified Google identity. 26 students currently have a blank email cell
and are locked out until an email is added here and the roster is re-imported.

## The sheet

- File: `Students_Master_List.xlsx` (repo root).
- Sheet: `Students` (or the first worksheet if missing).
- Columns (row 1 is the header, data starts at row 2):

  | Col | Field |
  |---|---|
  | A | `email` |
  | B | `rollNo` |
  | C | `name` |
  | D | `year` |
  | E | `section` |
  | F | `branch` (defaults to `IT`) |

- 404 data rows today: 378 emails filled, 26 blank.

## 1. Edit the sheet

Edit the Excel file directly (in place). Rules:

- Only here do emails change. Never patch the DB by hand.
- Fix an email typo by editing the cell; the re-import overwrites it.
- To register a student currently locked out, fill in their college email (must end in
  `@sasi.ac.in` for SSO to accept it).
- A blank cell means the student stays locked out; the import stores `NULL` and **never**
  wipes an email that was previously filled.
- Keep the header row intact.

## 2. Commit the change

```bash
git add Students_Master_List.xlsx
git commit -m "roster: register <n> student emails"
git push
```

The CI gate runs normally on the changed file.

## 3. Import

```bash
cd backend
npm run roster:import        # ts-node scripts/import-roster.ts (reads the repo-root sheet)
```

`import-roster.ts` is idempotent and keyed by `rollNo` (`prisma.student.upsert`): it can be
re-run any number of times. A filled email is always applied; a blank cell preserves an
existing email or stores `NULL` only when there was no previous value.

Expected output:

```
✓ imported 404 students from .../Students_Master_List.xlsx
```

## 4. Verify the blank count changed

```bash
npm run prisma:seed          # prints the blank-email count at the end
```

or, from a SQL prompt:

```sql
select count(*) from "Student" where email is null;
select count(*) from "Student" where email is not null;
```

Expected: counts match the sheet (e.g. 26 / 378). Any student whose email is still blank
remains `email = NULL` and cannot sign in - that is correct behaviour, not a bug.

## 5. Apply to production

1. Merge to `main`. The Render deployment runs `npx prisma migrate deploy` (no schema change
   here, so it is a no-op) and restarts.
2. Run `npm run roster:import` against the production database from a Render shell /
   one-off service so the prod `Student` table matches the committed sheet.
3. Have the newly-registered student sign in on the production site as the acceptance test.
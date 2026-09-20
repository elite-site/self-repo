# Restore Runbook

Recovery target: **RPO <= 24h** (Supabase automatic backups/PITR), **RTO <= 24h** (this
procedure). Restoring the database restores *references*, not media - the videos themselves
live in the college Google Drive and are not touched by this runbook.

## 1. Understand the blast radius

The Postgres database holds:

- `Student` roster entries (rollNo, name, year, section, branch, email),
- `Submission` records (metadata + `videoDriveId` pointing at Drive),
- `Event`, `AdminUser`, `EmailLog`, `DriveFolderCache`, `ActivityLog`.

Drive files are the durable media. A DB restore may orphan/refer to files that still exist
in Drive; it never deletes them.

## 2. Restore the Postgres backup

Supabase dashboard -> **Database -> Backups**:

1. Pick a backup or a point-in-time point. For PITR, the project must have PITR enabled
   (paid tier); Free tier is limited to manual/automatic full backups.
2. Restore into the same project or a new one. If you restore to a new project, the project
   **ref in the pooler URL changes** - update `DATABASE_URL`.

## 3. Point the backend at the restored DB

- Local / staging: edit `backend/.env` `DATABASE_URL` (and re-set any `?schema=` param it
  used).
- Render: update `DATABASE_URL` on the staging and production services, then trigger a
  deploy so the change applies.

## 4. Reconcile the schema

```bash
cd backend
npm ci
npm run prisma:generate     # prisma generate
npx prisma migrate deploy   # bring the restored DB up to the committed migrations
```

`prisma migrate deploy` only applies un-applied migrations; it never drifts by pushing
schema. If the backup predates the current migrations, this replays them to the latest
shape.

## 5. Re-import the roster

```bash
npm run roster:import       # idempotent upsert keyed by rollNo
```

The roster import fills emails forward and never wipes them, so it is safe to run after any
restore regardless of backup age. Re-run to guarantee `Student` matches the committed
`Students_Master_List.xlsx`.

## 6. Verify

```bash
curl -s https://<render-service>.onrender.com/ready   # {"status":"ok","db":"ok","drive":"ok"}
```

1. Open the admin and confirm submissions list with their video previews.
2. Confirm the expected blank-email count for the roster (see `docs/runbooks/roster-import.md`).
3. Sign in as a roster student on a staging site as a final end-to-end check.

## RPO notes

Supabase retention depends on the plan (Free: 7-day manual backups; Pro: PITR with a
configurable window). Treat "RPO <= 24h" as an operational commitment: run a manual backup
before any risky schema change or large edit, since a PITR restore cannot reach points
before the backup window.
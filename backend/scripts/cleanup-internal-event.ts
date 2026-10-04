/**
 * Removes student-facing artefacts that were attached to the internal
 * self-introduction submission event (`self-introduction-2026`).
 *
 * Background: that event is not a real, registrable event — it is the container
 * that Submission rows hang off. Because it is still a row in the `Event` table,
 * a student who once hit the register endpoint (or any code path that created a
 * registration against it) ended up with an EventRegistration that surfaced on
 * the student Registrations page as "Self Introduction", linking to a detail page
 * with placeholder copy and no real content.
 *
 * The API now filters these out at read time (see INTERNAL_EVENT_ID in
 * ../src/config/constants.ts), so this script is *hygiene*, not a fix for a
 * visible bug. Run it when you want the rows physically gone.
 *
 * Deliberately NOT touched:
 *   - Submission rows      — real student data.
 *   - ActivityLog rows     — the audit trail, including entries whose eventId is
 *                            the internal event.
 *   - Event rows           — the internal event itself is required by Submission
 *                            and is what the submission flow keys off.
 *   - VotingCampaign rows  — electing a best self-introduction is a legitimate
 *                            use of this event.
 *
 * Usage:
 *   npm run cleanup:internal-event            # dry run — reports, deletes nothing
 *   npm run cleanup:internal-event -- --apply # actually delete
 *
 * Requires an explicit --apply. Without it the script only prints what it would
 * remove, so it is safe to run against production to preview the blast radius.
 */
import { PrismaClient } from '@prisma/client';
import { INTERNAL_EVENT_ID } from '../src/config/constants';
import { planCleanup, summariseByStatus, CleanupStep } from './internalEventCleanup';

const prisma = new PrismaClient();

const DEV_FALLBACK = 'postgresql://postgres:postgres@localhost:5432/photoclub?schema=public';
const APPLY = process.argv.includes('--apply');

function guard(): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url === DEV_FALLBACK) {
    console.error(
      '[cleanup] DATABASE_URL is not configured to a real database — refusing to run.\n' +
        '[cleanup] Set DATABASE_URL in backend/.env or your host environment.',
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  guard();

  const event = await prisma.event.findUnique({
    where: { id: INTERNAL_EVENT_ID },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!event) {
    console.log(`[cleanup] No event with id "${INTERNAL_EVENT_ID}" — nothing to clean.`);
    return;
  }

  console.log(`[cleanup] Target event: ${event.name} (${event.id}) — status ${event.status}\n`);

  // Registrations are removed first. RegistrationAnswer has a Restrict FK to
  // EventRegistration, so its rows have to go first or the delete is rejected.
  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId: INTERNAL_EVENT_ID },
    select: { id: true, studentId: true, status: true, teamId: true, registeredAt: true },
  });

  // Teams: TeamMember and TeamInvitation both Restrict the Team FK, so children
  // must be removed before the team row itself.
  const teams = await prisma.team.findMany({
    where: { eventId: INTERNAL_EVENT_ID },
    select: { id: true, name: true, leaderId: true },
  });
  const teamIds = teams.map((t) => t.id);

  const byStatus = summariseByStatus(registrations);

  const plan = planCleanup(registrations, teams);

  console.log('[cleanup] Would remove:');
  for (const step of plan) {
    console.log(`  ${step.model.padEnd(18)} ${step.ids.length} id(s)`);
  }

  if (registrations.length > 0) {
    console.log('\n[cleanup] Registrations by status:');
    for (const [status, count] of Object.entries(byStatus)) {
      console.log(`  ${status.padEnd(12)} ${count}`);
    }
    console.log('\n[cleanup] Sample (first 10):');
    for (const r of registrations.slice(0, 10)) {
      console.log(`  ${r.id}  student=${r.studentId}  status=${r.status}  at=${r.registeredAt.toISOString()}`);
    }
    if (registrations.length > 10) {
      console.log(`  ... and ${registrations.length - 10} more`);
    }
  }

  // Registrations on *other* events that point at one of these teams keep the
  // student registered; their teamId is nulled by the FK's ON DELETE SET NULL.
  const crossEventTeamRefs =
    teamIds.length > 0
      ? await prisma.eventRegistration.count({
          where: { teamId: { in: teamIds }, eventId: { not: INTERNAL_EVENT_ID } },
        })
      : 0;
  if (crossEventTeamRefs > 0) {
    console.log(
      `\n[cleanup] Note: ${crossEventTeamRefs} registration(s) on other events point at these\n` +
        `[cleanup] teams. Those students stay registered; only their team link is cleared.`,
    );
  }

  if (!APPLY) {
    console.log('\n[cleanup] Dry run — nothing was deleted. Re-run with --apply to remove these rows.');
    return;
  }

  // The plan is executed exactly as ordered by planCleanup; see that module for
  // the FK constraints each step depends on.
  const counts: Record<string, number> = {};
  await prisma.$transaction(async (tx) => {
    for (const step of plan) {
      counts[step.model] = await runStep(tx, step);
    }
  });

  console.log('\n[cleanup] Deleted:');
  for (const [model, count] of Object.entries(counts)) {
    console.log(`  ${model.padEnd(18)} ${count}`);
  }
  console.log('\n[cleanup] Done. Submissions, activity logs, voting campaigns and the event itself were left intact.');
}

/**
 * Execute one planned step. The `where` clause was built and tested in
 * internalEventCleanup, so this only has to dispatch on the model name.
 */
async function runStep(tx: any, step: CleanupStep): Promise<number> {
  const result = await tx[step.model].deleteMany({ where: step.where });
  return result.count;
}

main()
  .catch((err) => {
    console.error('[cleanup] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

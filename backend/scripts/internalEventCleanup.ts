/**
 * Pure planning logic for the internal-event cleanup.
 *
 * Kept separate from the script's Prisma calls (and in the spirit of
 * `roster-parser.ts` beside `import-roster.ts`) so the part that is hard to
 * verify by hand — the delete order — can be unit tested. Getting this order
 * wrong does not produce a partial delete; it produces a foreign-key violation
 * and the whole transaction rolls back.
 *
 * FK behaviour this plan depends on, from schema.prisma:
 *   RegistrationAnswer -> EventRegistration   Restrict  (answers must go first)
 *   TeamMember         -> Team                Restrict  (members must go first)
 *   TeamInvitation     -> Team                Restrict  (invitations must go first)
 *   EventRegistration  -> Team                SetNull   (safe either way)
 */

export interface CleanupRegistration {
  id: string;
  status: string;
}

export interface CleanupTeam {
  id: string;
}

/** Prisma client model names this plan deletes from. */
export type CleanupModel =
  | 'RegistrationAnswer'
  | 'TeamMember'
  | 'TeamInvitation'
  | 'EventRegistration'
  | 'Team';

/**
 * The column each model is filtered on. RegistrationAnswer and EventRegistration
 * point at the registration; TeamMember, TeamInvitation and Team point at the
 * team. Getting one wrong deletes unrelated rows, so it lives here as data and
 * is asserted in tests rather than being re-derived at each call site.
 */
export const CLEANUP_FILTER_COLUMN: Record<CleanupModel, string> = {
  RegistrationAnswer: 'registrationId',
  EventRegistration: 'id',
  TeamMember: 'teamId',
  TeamInvitation: 'teamId',
  Team: 'id',
};

/** A single `deleteMany` call, in the order it must be issued. */
export type CleanupStep = {
  model: CleanupModel;
  /** Ready to hand to Prisma as `where`. */
  where: Record<string, unknown>;
  /** Ids the step targets, retained for reporting. */
  ids: string[];
};

/**
 * Build the ordered delete plan.
 *
 * Steps with no ids are omitted so the caller never issues a `deleteMany` with
 * an empty `in` list. Answers come before registrations; members and
 * invitations come before teams.
 */
export function planCleanup(
  registrations: CleanupRegistration[],
  teams: CleanupTeam[],
): CleanupStep[] {
  const registrationIds = registrations.map((r) => r.id);
  const teamIds = teams.map((t) => t.id);

  const step = (model: CleanupModel, ids: string[]): CleanupStep => ({
    model,
    where: { [CLEANUP_FILTER_COLUMN[model]]: { in: ids } },
    ids,
  });

  const steps: CleanupStep[] = [];

  if (registrationIds.length > 0) {
    steps.push(step('RegistrationAnswer', registrationIds));
  }

  if (teamIds.length > 0) {
    steps.push(step('TeamMember', teamIds));
    steps.push(step('TeamInvitation', teamIds));
  }

  if (registrationIds.length > 0) {
    steps.push(step('EventRegistration', registrationIds));
  }

  if (teamIds.length > 0) {
    steps.push(step('Team', teamIds));
  }

  return steps;
}

/** Count registrations by status, for the dry-run report. */
export function summariseByStatus(
  registrations: CleanupRegistration[],
): Record<string, number> {
  return registrations.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
}

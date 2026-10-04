import { describe, it, expect } from 'vitest';
import {
  planCleanup,
  summariseByStatus,
  CLEANUP_FILTER_COLUMN,
} from '../scripts/internalEventCleanup';

const regs = (...ids: string[]) => ids.map((id) => ({ id, status: 'PENDING' }));
const teams = (...ids: string[]) => ids.map((id) => ({ id }));

describe('planCleanup', () => {
  it('deletes answers before the registrations they belong to', () => {
    const plan = planCleanup(regs('r1', 'r2'), []);
    const models = plan.map((s) => s.model);

    expect(models.indexOf('RegistrationAnswer')).toBeLessThan(models.indexOf('EventRegistration'));
  });

  it('deletes team members and invitations before the team itself', () => {
    const plan = planCleanup([], teams('t1'));
    const models = plan.map((s) => s.model);

    expect(models.indexOf('TeamMember')).toBeLessThan(models.indexOf('Team'));
    expect(models.indexOf('TeamInvitation')).toBeLessThan(models.indexOf('Team'));
  });

  it('emits the full expected order when both registrations and teams exist', () => {
    const plan = planCleanup(regs('r1'), teams('t1'));

    expect(plan.map((s) => s.model)).toEqual([
      'RegistrationAnswer',
      'TeamMember',
      'TeamInvitation',
      'EventRegistration',
      'Team',
    ]);
  });

  it('targets the given ids on every step', () => {
    const plan = planCleanup(regs('r1', 'r2'), teams('t1', 't2'));

    for (const step of plan) {
      if (step.model === 'EventRegistration' || step.model === 'RegistrationAnswer') {
        expect(step.ids).toEqual(['r1', 'r2']);
      } else {
        expect(step.ids).toEqual(['t1', 't2']);
      }
    }
  });

  it('omits steps with no ids so no deleteMany runs with an empty in-list', () => {
    expect(planCleanup([], [])).toEqual([]);

    const regsOnly = planCleanup(regs('r1'), []).map((s) => s.model);
    expect(regsOnly).toEqual(['RegistrationAnswer', 'EventRegistration']);

    const teamsOnly = planCleanup([], teams('t1')).map((s) => s.model);
    expect(teamsOnly).toEqual(['TeamMember', 'TeamInvitation', 'Team']);
  });
});

describe('filter columns', () => {
  it('pins the column each model is filtered on', () => {
    // A wrong column here deletes unrelated rows in production, so the mapping is
    // asserted rather than trusted.
    expect(CLEANUP_FILTER_COLUMN).toEqual({
      RegistrationAnswer: 'registrationId',
      EventRegistration: 'id',
      TeamMember: 'teamId',
      TeamInvitation: 'teamId',
      Team: 'id',
    });
  });

  it('builds a where clause on the right column for every step', () => {
    const plan = planCleanup(regs('r1', 'r2'), teams('t1', 't2'));

    expect(plan).toEqual([
      { model: 'RegistrationAnswer', where: { registrationId: { in: ['r1', 'r2'] } }, ids: ['r1', 'r2'] },
      { model: 'TeamMember', where: { teamId: { in: ['t1', 't2'] } }, ids: ['t1', 't2'] },
      { model: 'TeamInvitation', where: { teamId: { in: ['t1', 't2'] } }, ids: ['t1', 't2'] },
      { model: 'EventRegistration', where: { id: { in: ['r1', 'r2'] } }, ids: ['r1', 'r2'] },
      { model: 'Team', where: { id: { in: ['t1', 't2'] } }, ids: ['t1', 't2'] },
    ]);
  });

  it('filters Team by id, not by teamId', () => {
    // Regression guard: Team was once filtered by teamId, which does not exist
    // on that model and would have thrown at runtime.
    const teamStep = planCleanup([], teams('t1')).find((s) => s.model === 'Team');
    expect(teamStep?.where).toEqual({ id: { in: ['t1'] } });
  });
});

describe('summariseByStatus', () => {
  it('counts registrations per status', () => {
    const result = summariseByStatus([
      { id: 'r1', status: 'PENDING' },
      { id: 'r2', status: 'PENDING' },
      { id: 'r3', status: 'CONFIRMED' },
      { id: 'r4', status: 'CANCELLED' },
    ]);

    expect(result).toEqual({ PENDING: 2, CONFIRMED: 1, CANCELLED: 1 });
  });

  it('returns an empty object for no registrations', () => {
    expect(summariseByStatus([])).toEqual({});
  });
});

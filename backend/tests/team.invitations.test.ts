import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/server';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    student: {
      findUnique: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    teamInvitation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    eventRegistration: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const mock = <T extends object>(fn: unknown) => fn as unknown as ReturnType<typeof vi.fn> & T;

const leaderId = 'stud_leader';
const memberId = 'stud_member';

const leaderToken = jwt.sign({ studentId: leaderId, rollNo: '23K61A0001', name: 'Lead' }, env.STUDENT_JWT_SECRET);
const memberToken = jwt.sign({ studentId: memberId, rollNo: '23K61A0002', name: 'Member' }, env.STUDENT_JWT_SECRET);

const team = {
  id: 'team_1',
  eventId: 'evt_1',
  name: 'AlgoRhythms',
  leaderId,
  status: 'FORMING',
  members: [{ studentId: leaderId }, { studentId: memberId }],
};

const activeStudent = { id: memberId, status: 'ACTIVE' };

describe('Team invitations and team removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/student/teams/:id/invite', () => {
    it('rejects a self-invite instead of creating an un-acceptable invitation', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.team.findUnique).mockResolvedValue(team);
      // The leader inviting themselves resolves to the leader's own student row.
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.student.findUnique).mockResolvedValue({
        id: leaderId,
        rollNo: '23K61A0001',
      });

      const res = await request(app)
        .post('/api/student/teams/team_1/invite')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ rollNo: '23K61A0001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('SELF_INVITE');
      expect(prisma.teamInvitation.create).not.toHaveBeenCalled();
      expect(prisma.teamInvitation.upsert).not.toHaveBeenCalled();
    });

    it('refuses to let a non-leader invite', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.team.findUnique).mockResolvedValue(team);

      const res = await request(app)
        .post('/api/student/teams/team_1/invite')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ rollNo: '23K61A0003' });

      expect(res.status).toBe(403);
      expect(prisma.teamInvitation.upsert).not.toHaveBeenCalled();
    });

    it('returns the existing pending invitation instead of a 500 on a duplicate invite', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.team.findUnique).mockResolvedValue(team);
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.student.findUnique).mockResolvedValue({
        id: 'stud_third',
        rollNo: '23K61A0003',
      });
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.teamInvitation.findUnique).mockResolvedValue({
        id: 'inv_existing',
        teamId: 'team_1',
        studentId: 'stud_third',
        status: 'PENDING',
      });

      const res = await request(app)
        .post('/api/student/teams/team_1/invite')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ rollNo: '23K61A0003' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('inv_existing');
      expect(prisma.teamInvitation.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/student/team-invitations/:id/accept', () => {
    it('accepts a valid invitation and joins the member', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.student.findUnique).mockResolvedValue(activeStudent);
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.teamInvitation.findFirst).mockResolvedValue({
        id: 'inv_1',
        teamId: 'team_1',
        studentId: memberId,
        status: 'PENDING',
      });
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.$transaction).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/student/team-invitations/inv_1/accept')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      // An idempotent join, not a plain create that can violate the unique
      // constraint on TeamMember and abort the whole transaction.
      expect(prisma.teamMember.upsert).toHaveBeenCalledWith({
        where: { teamId_studentId: { teamId: 'team_1', studentId: memberId } },
        update: {},
        create: { teamId: 'team_1', studentId: memberId },
      });
    });

    it('rejects a unique-constraint violation as a 409, not a bare 500', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.student.findUnique).mockResolvedValue(activeStudent);
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.teamInvitation.findFirst).mockResolvedValue({
        id: 'inv_1',
        teamId: 'team_1',
        studentId: memberId,
        status: 'PENDING',
      });
      mock<{ mockRejectedValue: (v: unknown) => void }>(prisma.$transaction).mockRejectedValue(
        Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
      );

      const res = await request(app)
        .post('/api/student/team-invitations/inv_1/accept')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ALREADY_MEMBER');
    });

    it('refuses to replay an invitation that was already answered', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.student.findUnique).mockResolvedValue(activeStudent);
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.teamInvitation.findFirst).mockResolvedValue({
        id: 'inv_1',
        teamId: 'team_1',
        studentId: memberId,
        status: 'DECLINED',
      });

      const res = await request(app)
        .post('/api/student/team-invitations/inv_1/accept')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ALREADY_RESPONDED');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/student/teams/:id', () => {
    it('dissolves a team the caller leads and cleans up its relations', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.team.findUnique).mockResolvedValue(team);
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.$transaction).mockResolvedValue([]);

      const res = await request(app)
        .delete('/api/student/teams/team_1')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Registrations keep the student signed up for the event but lose the
      // team affiliation before the row is removed.
      expect(prisma.eventRegistration.updateMany).toHaveBeenCalledWith({
        where: { teamId: 'team_1' },
        data: { teamId: null },
      });
      expect(prisma.teamInvitation.deleteMany).toHaveBeenCalledWith({ where: { teamId: 'team_1' } });
      expect(prisma.teamMember.deleteMany).toHaveBeenCalledWith({ where: { teamId: 'team_1' } });
      expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: 'team_1' } });
    });

    it('refuses to remove a team the caller does not lead', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.team.findUnique).mockResolvedValue(team);

      const res = await request(app)
        .delete('/api/student/teams/team_1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(prisma.team.delete).not.toHaveBeenCalled();
    });

    it('404s for a team that does not exist', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.team.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/student/teams/nope')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
      const res = await request(app).delete('/api/student/teams/team_1');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/student/teams', () => {
    it('marks which teams the caller leads so the UI can gate the controls', async () => {
      mock<{ mockResolvedValue: (v: unknown) => void }>(prisma.team.findMany).mockResolvedValue([
        team,
        { ...team, id: 'team_2', leaderId: 'stud_other' },
      ]);

      const res = await request(app)
        .get('/api/student/teams')
        .set('Authorization', `Bearer ${leaderToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].isLeader).toBe(true);
      expect(res.body[1].isLeader).toBe(false);
    });
  });
});

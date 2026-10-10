import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';
import { EXCLUDE_INTERNAL_EVENT } from '../config/constants';
import { ActivityService } from '../services/activity.service';

const router = Router();
router.use(requireAdminAuth);

// ==========================================
// LIST EVENTS (GET /admin/api/events)
// ==========================================
router.get('/events', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    // The admin Events table renders a Registrations column from registrationCount.
    // Without this _count the client falls back to 0 and every event looks empty.
    const events = await prisma.event.findMany({
      where: EXCLUDE_INTERNAL_EVENT,
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { registrations: true, submissions: true },
        },
      },
    });
    res.json({
      events: events.map((e) => ({
        ...e,
        registrationCount: e._count.registrations,
        submissionCount: e._count.submissions,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching events list:', err);
    return httpError(res, 500, err, "FAILED_TO_FETCH_EVENTS");
  }
});


// ==========================================
// EVENT REGISTRATIONS & TEAM ADMINISTRATION (ADM-08 & ADM-09)
// ==========================================
router.get('/registrations', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const section = req.query.section ? String(req.query.section).trim() : undefined;
    const team = req.query.team ? String(req.query.team).trim().toLowerCase() : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '25'), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (eventId && eventId !== 'all') {
      where.eventId = eventId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (year && !isNaN(year)) {
      where.student = { ...(where.student || {}), year };
    }
    if (section && section !== 'ALL') {
      where.student = { ...(where.student || {}), section };
    }
    if (team === 'team') {
      where.teamId = { not: null };
    } else if (team === 'solo') {
      where.teamId = null;
    }
    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { rollNo: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { team: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const statsFilter = eventId && eventId !== 'all' ? { eventId } : {};

    const [
      total,
      registrations,
      statsConfirmed,
      statsPending,
      statsWaitlisted,
      statsCancelled,
      statsRejected,
      totalTeams,
      completedTeams
    ] = await Promise.all([
      prisma.eventRegistration.count({ where }),
      prisma.eventRegistration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' },
        include: {
          student: true,
          event: true,
          team: {
            include: {
              members: {
                include: {
                  student: {
                    select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
                  }
                }
              }
            }
          },
          answers: {
            include: {
              field: true
            }
          }
        }
      }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'CONFIRMED' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'PENDING' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'WAITLISTED' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'CANCELLED' } }),
      prisma.eventRegistration.count({ where: { ...statsFilter, status: 'REJECTED' } }),
      prisma.team.count({ where: statsFilter }),
      prisma.team.count({ where: { ...statsFilter, status: 'COMPLETE' } }),
    ]);

    const leaderIds = registrations
      .map(r => r.team?.leaderId)
      .filter((id): id is string => Boolean(id));

    let leaderMap = new Map<string, any>();
    if (leaderIds.length > 0) {
      const leaders = await prisma.student.findMany({
        where: { id: { in: leaderIds } },
        select: { id: true, rollNo: true, name: true, email: true }
      });
      leaderMap = new Map(leaders.map(l => [l.id, l]));
    }

    const enriched = registrations.map(reg => ({
      ...reg,
      team: reg.team
        ? {
            ...reg.team,
            leader: leaderMap.get(reg.team.leaderId) || null
          }
        : null
    }));

    res.json({
      registrations: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        total: statsConfirmed + statsPending + statsWaitlisted + statsCancelled + statsRejected,
        confirmed: statsConfirmed,
        pending: statsPending,
        waitlisted: statsWaitlisted,
        cancelled: statsCancelled,
        rejected: statsRejected,
        totalTeams,
        completedTeams,
      }
    });
  } catch (err: any) {
    console.error('Error fetching registrations:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/registrations/export', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const section = req.query.section ? String(req.query.section).trim() : undefined;

    const where: any = {};
    if (eventId && eventId !== 'all') where.eventId = eventId;
    if (status && status !== 'ALL') where.status = status;
    if (year && !isNaN(year)) where.student = { ...(where.student || {}), year };
    if (section && section !== 'ALL') where.student = { ...(where.student || {}), section };

    const registrations = await prisma.eventRegistration.findMany({
      where,
      orderBy: { registeredAt: 'desc' },
      include: {
        student: true,
        event: true,
        team: true,
        answers: { include: { field: true } }
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ELITE Student Portal Admin';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: 'Registration ID', key: 'id', width: 28 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Roll No', key: 'rollNo', width: 16 },
      { header: 'Student Name', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Branch', key: 'branch', width: 10 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Registered At', key: 'registeredAt', width: 22 },
      { header: 'Answers', key: 'answers', width: 45 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF0B192C' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    headerRow.height = 24;

    registrations.forEach(r => {
      const answersText = r.answers.map(a => `${a.field?.label || 'Field'}: ${a.value || ''}`).join('; ');
      worksheet.addRow({
        id: r.id,
        event: r.event.name,
        rollNo: r.student.rollNo,
        name: r.student.name,
        email: r.student.email || '',
        year: r.student.year,
        section: r.student.section,
        branch: r.student.branch,
        team: r.team ? r.team.name : 'Solo',
        status: r.status,
        registeredAt: r.registeredAt.toISOString(),
        answers: answersText,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=event-registrations-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting registrations:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/registrations/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: {
        student: true,
        event: true,
        team: {
          include: {
            members: {
              include: {
                student: {
                  select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
                }
              }
            },
            invitations: {
              include: {
                student: {
                  select: { id: true, rollNo: true, name: true, email: true }
                }
              }
            }
          }
        },
        answers: {
          include: {
            field: true
          }
        }
      }
    });

    if (!reg) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
      return;
    }

    let leader = null;
    if (reg.team?.leaderId) {
      leader = await prisma.student.findUnique({
        where: { id: reg.team.leaderId },
        select: { id: true, rollNo: true, name: true, email: true }
      });
    }

    res.json({
      ...reg,
      team: reg.team ? { ...reg.team, leader } : null
    });
  } catch (err: any) {
    console.error('Error fetching registration detail:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/registrations/:id/status', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { status, note } = req.body;
    const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'WAITLISTED'];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: 'INVALID_STATUS', message: `Status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: { student: true, event: true }
    });
    if (!reg) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
      return;
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        student: true,
        event: true,
        team: true,
        answers: { include: { field: true } }
      }
    });

    await ActivityService.log({
      eventId: reg.eventId,
      category: 'ADMIN',
      action: `Admin updated registration status to ${status}`,
      details: note || `Registration for ${reg.student.name} (${reg.student.rollNo}) set to ${status}`,
      applicantName: reg.student.name,
      userEmail: reg.student.email || undefined,
      status: 'SUCCESS'
    });

    res.json({ success: true, registration: updated });
  } catch (err: any) {
    console.error('Error updating registration status:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.delete('/registrations/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: { student: true }
    });
    if (!reg) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
      return;
    }

    await prisma.registrationAnswer.deleteMany({
      where: { registrationId: reg.id }
    });

    await prisma.eventRegistration.delete({
      where: { id: reg.id }
    });

    await ActivityService.log({
      eventId: reg.eventId,
      category: 'ADMIN',
      action: `Admin deleted registration`,
      details: `Registration for ${reg.student.name} (${reg.student.rollNo}) deleted`,
      applicantName: reg.student.name,
      userEmail: reg.student.email || undefined,
      status: 'SUCCESS'
    });

    res.json({ success: true, message: 'Registration deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting registration:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// Teams management (ADM-09)
router.get('/teams', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const where: any = {};
    if (eventId && eventId !== 'all') where.eventId = eventId;
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { members: { some: { student: { name: { contains: search, mode: 'insensitive' } } } } },
        { members: { some: { student: { rollNo: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: true,
        members: {
          include: {
            student: {
              select: { id: true, rollNo: true, name: true, email: true, year: true, section: true, branch: true }
            }
          }
        },
        invitations: {
          include: {
            student: {
              select: { id: true, rollNo: true, name: true, email: true }
            }
          }
        },
        registrations: {
          include: {
            student: {
              select: { id: true, rollNo: true, name: true }
            }
          }
        }
      }
    });

    const leaderIds = teams.map(t => t.leaderId);
    let leaderMap = new Map<string, any>();
    if (leaderIds.length > 0) {
      const leaders = await prisma.student.findMany({
        where: { id: { in: leaderIds } },
        select: { id: true, rollNo: true, name: true, email: true }
      });
      leaderMap = new Map(leaders.map(l => [l.id, l]));
    }

    const enriched = teams.map(t => ({
      ...t,
      leader: leaderMap.get(t.leaderId) || null
    }));

    res.json({ teams: enriched });
  } catch (err: any) {
    console.error('Error fetching teams:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/teams/:id/status', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { status } = req.body;
    const allowed = ['FORMING', 'ACTIVE', 'COMPLETE', 'REJECTED'];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: 'INVALID_STATUS', message: `Status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        event: true,
        members: { include: { student: true } }
      }
    });

    await ActivityService.log({
      eventId: team.eventId,
      category: 'ADMIN',
      action: `Admin updated team status to ${status}`,
      details: `Team ${team.name} status updated to ${status}`,
      status: 'SUCCESS'
    });

    res.json({ success: true, team });
  } catch (err: any) {
    console.error('Error updating team status:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/teams/:id/members/remove', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { studentId, reason } = req.body;
    if (!studentId) {
      res.status(400).json({ error: 'MISSING_DATA', message: 'studentId is required' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });
    if (!team) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
      return;
    }

    const member = await prisma.teamMember.findFirst({
      where: { teamId: team.id, studentId },
      include: { student: true }
    });
    if (!member) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Student is not a member of this team' });
      return;
    }

    await prisma.$transaction([
      prisma.teamMember.delete({
        where: { id: member.id }
      }),
      prisma.eventRegistration.updateMany({
        where: { eventId: team.eventId, studentId, teamId: team.id },
        data: { teamId: null }
      })
    ]);

    await ActivityService.log({
      eventId: team.eventId,
      category: 'ADMIN',
      action: `Admin removed member from team`,
      details: `Removed ${member.student.name} (${member.student.rollNo}) from ${team.name}. Reason: ${reason || 'Admin action'}`,
      applicantName: member.student.name,
      userEmail: member.student.email || undefined,
      status: 'SUCCESS'
    });

    res.json({ success: true, message: 'Member removed from team successfully' });
  } catch (err: any) {
    console.error('Error removing team member:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

export default router;

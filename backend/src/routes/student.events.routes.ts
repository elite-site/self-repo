import { Router, Request, Response } from 'express';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireStudentAuth);

// --- Events ---

router.get('/', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: (req as any).studentId }
    });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    
    const events = await prisma.event.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(events.map(e => ({
      ...e,
      title: e.name,
      date: e.createdAt,
      type: 'GENERAL',
      eligibility: `Year ${e.year || 'All'}`,
      deadline: e.createdAt
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { formFields: { orderBy: { displayOrder: 'asc' } } }
    });
    if (!event) return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    res.json({
      ...event,
      title: event.name,
      date: event.createdAt,
      type: 'GENERAL',
      eligibility: `Year ${event.year || 'All'}`,
      deadline: event.createdAt,
      registrationFields: event.formFields
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/register', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const eventId = req.params.id;
    const { teamId, answers } = req.body;
    
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        studentId,
        teamId,
        status: 'CONFIRMED',
        answers: {
          create: answers ? Object.entries(answers).map(([fieldId, value]: any) => ({
            fieldId,
            value: String(value)
          })) : []
        }
      }
    });
    res.status(201).json(registration);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Registrations ---

router.get('/registrations/all', async (req: Request, res: Response) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: { studentId: (req as any).studentId },
      include: { event: true }
    });
    res.json(registrations.map(r => ({
      ...r,
      eventTitle: r.event.name,
      status: r.status === 'CONFIRMED' ? 'REGISTERED' : r.status,
      registeredAt: r.registeredAt
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/registrations/:id', async (req: Request, res: Response) => {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });
    if (!reg || reg.studentId !== (req as any).studentId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
    }
    res.json({
      ...reg,
      eventTitle: reg.event.name,
      status: reg.status === 'CONFIRMED' ? 'REGISTERED' : reg.status,
      registeredAt: reg.registeredAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/registrations/:id/cancel', async (req: Request, res: Response) => {
  try {
    const reg = await prisma.eventRegistration.updateMany({
      where: { id: req.params.id, studentId: (req as any).studentId },
      data: { status: 'CANCELLED' }
    });
    if (reg.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Cancelled successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// --- Teams ---

router.get('/teams', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId;
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { leaderId: studentId },
          { members: { some: { studentId } } }
        ]
      },
      include: { members: { include: { student: true } }, event: true }
    });
    res.json(teams);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/teams', async (req: Request, res: Response) => {
  try {
    const { name, eventId } = req.body;
    const team = await prisma.team.create({
      data: {
        name,
        eventId,
        leaderId: (req as any).studentId
      }
    });
    res.status(201).json(team);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/teams/:id/invite', async (req: Request, res: Response) => {
  try {
    const { rollNo } = req.body;
    const student = await prisma.student.findUnique({ where: { rollNo } });
    if (!student) return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    
    const invite = await prisma.teamInvitation.create({
      data: {
        teamId: req.params.id,
        studentId: student.id,
        status: 'PENDING'
      }
    });
    res.status(201).json(invite);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/team-invitations', async (req: Request, res: Response) => {
  try {
    const invitations = await prisma.teamInvitation.findMany({
      where: { studentId: (req as any).studentId, status: 'PENDING' },
      include: { team: true }
    });
    res.json(invitations);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/team-invitations/:id/accept', async (req: Request, res: Response) => {
  try {
    const invite = await prisma.teamInvitation.findFirst({
      where: { id: req.params.id, studentId: (req as any).studentId }
    });
    if (!invite) return res.status(404).json({ error: 'NOT_FOUND', message: 'Invitation not found' });
    
    await prisma.$transaction([
      prisma.teamInvitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' }
      }),
      prisma.teamMember.create({
        data: { teamId: invite.teamId, studentId: invite.studentId }
      })
    ]);
    res.json({ message: 'Accepted' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/team-invitations/:id/decline', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.teamInvitation.updateMany({
      where: { id: req.params.id, studentId: (req as any).studentId },
      data: { status: 'DECLINED' }
    });
    if (updated.count === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.json({ message: 'Declined' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;

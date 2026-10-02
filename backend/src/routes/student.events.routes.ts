import { Router, Request, Response } from 'express';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';
import { ActivityService } from '../services/activity.service';

const router = Router();
router.use(requireStudentAuth);

// --- Events Routes (Mounted at /api/student/events) ---

let cachedOpenEvents: { data: any[]; expiry: number } | null = null;

router.get('/', async (req: Request, res: Response) => {
  try {
    if (cachedOpenEvents && Date.now() < cachedOpenEvents.expiry) {
      res.set('Cache-Control', 'private, max-age=30, must-revalidate');
      return res.json(cachedOpenEvents.data);
    }

    const events = await prisma.event.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const mapped = events.map(e => ({
      ...e,
      title: e.name,
      date: e.eventDate || e.createdAt,
      eligibility: `Year ${e.year || 'All'}`,
      deadline: e.registrationEnd || e.createdAt
    }));

    cachedOpenEvents = { data: mapped, expiry: Date.now() + 15_000 };

    res.set('Cache-Control', 'private, max-age=30, must-revalidate');
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: req.params.id },
          { slug: req.params.id }
        ]
      },
      include: { formFields: { orderBy: { displayOrder: 'asc' } } }
    });
    if (!event) return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    res.json({
      ...event,
      title: event.name,
      date: event.eventDate || event.createdAt,
      eligibility: `Year ${event.year || 'All'}`,
      deadline: event.registrationEnd || event.createdAt,
      registrationFields: event.formFields
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/:id/register', async (req: Request, res: Response) => {
  try {
    const studentId = req.student?.studentId || (req as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!student || student.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'NOT_ACTIVE', message: 'Your account is no longer active for this activity.' });
    }
    const eventIdParam = req.params.id;
    const { teamId, answers, status: reqStatus } = req.body;

    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: eventIdParam },
          { slug: eventIdParam }
        ]
      }
    });
    if (!event) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }
    // Registration must be refused once an event is not open. The admin UI tells
    // an admin that archiving an event stops registrations, and closing it is
    // meaningless if students can still sign up, but the lookup above matched on
    // id/slug alone and accepted DRAFT, CLOSED and ARCHIVED alike.
    if (event.status !== 'OPEN') {
      return res.status(403).json({
        error: 'EVENT_NOT_OPEN',
        message: `Registration is closed for this event (${event.status}).`,
      });
    }

    const eventId = event.id;
    const validStatuses = ['PENDING', 'CONFIRMED'] as const;
    const targetStatus = (reqStatus && validStatuses.includes(reqStatus))
      ? reqStatus
      : 'CONFIRMED';

    const answersData = answers ? (
      Array.isArray(answers)
        ? answers.map((a: any) => ({ fieldId: a.fieldId, value: String(a.value ?? '') }))
        : Object.entries(answers).map(([fieldId, value]: any) => ({ fieldId, value: String(value ?? '') }))
    ) : [];

    const registration = await prisma.eventRegistration.upsert({
      where: {
        eventId_studentId: {
          eventId,
          studentId,
        }
      },
      update: {
        status: targetStatus,
        teamId: teamId !== undefined ? teamId : undefined,
        ...(answersData.length > 0 ? {
          answers: {
            deleteMany: {},
            create: answersData,
          }
        } : {})
      },
      create: {
        eventId,
        studentId,
        teamId: teamId || null,
        status: targetStatus,
        answers: {
          create: answersData
        }
      },
      include: {
        event: true,
        student: true,
        team: true,
        answers: {
          include: {
            field: true
          }
        }
      }
    });

    await ActivityService.log({
      eventId,
      category: 'APPLICATION',
      action: `Student registered for event: ${event.name}`,
      details: `Student ${registration.student?.name || studentId} registered with status ${targetStatus}`,
      applicantName: registration.student?.name || undefined,
      userEmail: registration.student?.email || undefined,
      status: 'SUCCESS'
    });

    res.status(201).json({
      ...registration,
      eventTitle: registration.event?.name || event.name,
      status: registration.status,
      registeredAt: registration.registeredAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;

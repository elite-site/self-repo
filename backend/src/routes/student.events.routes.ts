import { Router, Request, Response } from 'express';
import { requireStudentAuth } from '../middleware/studentAuth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireStudentAuth);

// --- Events Routes (Mounted at /api/student/events) ---

router.get('/', async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).studentId || req.student?.studentId;
    const student = await prisma.student.findUnique({
      where: { id: studentId }
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
    const studentId = (req as any).studentId || req.student?.studentId;
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

export default router;

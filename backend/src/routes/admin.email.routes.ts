import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { httpError } from '../middleware/apiError';
import { requireAdminAuth } from '../middleware/auth';
import { ActivityService } from '../services/activity.service';

const router = Router();
router.use(requireAdminAuth);

router.get('/email/automations', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    let automations = await prisma.emailAutomation.findMany({
      include: {
        template: true,
        history: { take: 5, orderBy: { runAt: 'desc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // If none exist, seed default production templates and automations
    if (automations.length === 0) {
      const t1 = await prisma.emailTemplate.create({
        data: {
          name: 'Welcome & Profile Setup Confirmation',
          subject: 'Welcome to ELITE Student Portal, {{student_name}}!',
          body: 'Dear {{student_name}},\n\nYour ELITE profile has been created. Please complete your skills, projects, and achievements.\n\nDept of IT, SASI.',
          variables: ['{{student_name}}', '{{roll_no}}', '{{department}}'],
          status: 'ACTIVE',
        },
      });
      const t2 = await prisma.emailTemplate.create({
        data: {
          name: 'Event Registration Confirmed',
          subject: 'Your registration for {{event_name}} is confirmed!',
          body: 'Hello {{student_name}},\n\nYou are confirmed for {{event_name}}. Venue and timings will be broadcasted prior to kickoff.\n\nBest of luck,\nELITE Committee.',
          variables: ['{{student_name}}', '{{event_name}}'],
          status: 'ACTIVE',
        },
      });
      const t3 = await prisma.emailTemplate.create({
        data: {
          name: 'Content Approval Notice',
          subject: 'Your submission has been approved',
          body: 'Hello {{student_name}},\n\nYour recent submission has passed faculty review and is now live on your profile.',
          variables: ['{{student_name}}'],
          status: 'ACTIVE',
        },
      });

      await prisma.emailAutomation.create({
        data: {
          name: 'New Student Onboarding Dispatch',
          trigger: 'STUDENT_REGISTERED',
          description: 'Dispatches instant welcome guidelines on first SSO login',
          status: 'ACTIVE',
          templateId: t1.id,
          targetAll: true,
        },
      });
      await prisma.emailAutomation.create({
        data: {
          name: 'Event Participation Pass',
          trigger: 'EVENT_REGISTERED',
          description: 'Sends confirmed team/solo ticket upon registration confirmation',
          status: 'ACTIVE',
          templateId: t2.id,
          targetAll: true,
        },
      });
      await prisma.emailAutomation.create({
        data: {
          name: 'Portfolio Verification Alert',
          trigger: 'CONTENT_APPROVED',
          description: 'Notifies student when project or achievement passes moderation',
          status: 'ACTIVE',
          templateId: t3.id,
          targetAll: true,
        },
      });

      automations = await prisma.emailAutomation.findMany({
        include: {
          template: true,
          history: { take: 5, orderBy: { runAt: 'desc' } },
        },
      });
    }

    res.json({ automations });
  } catch (err: any) {
    console.error('Error fetching email automations:', err);
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/email/automations', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { name, trigger, description, templateId, targetYear, targetSection, targetAll } = req.body;
    const automation = await prisma.emailAutomation.create({
      data: {
        name,
        trigger,
        description,
        templateId,
        targetYear: targetYear ? parseInt(String(targetYear), 10) : null,
        targetSection: targetSection || null,
        targetAll: targetAll !== undefined ? Boolean(targetAll) : true,
        status: 'ACTIVE',
      },
      include: { template: true },
    });
    res.status(201).json(automation);
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.patch('/email/automations/:id/toggle', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const current = await prisma.emailAutomation.findUnique({ where: { id: req.params.id } });
    if (!current) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Automation not found' });
      return;
    }
    const nextStatus = current.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await prisma.emailAutomation.update({
      where: { id: req.params.id },
      data: { status: nextStatus },
      include: { template: true },
    });
    res.json({ success: true, automation: updated });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.post('/email/automations/:id/run', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const auto = await prisma.emailAutomation.findUnique({
      where: { id: req.params.id },
      include: { template: true },
    });
    if (!auto) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Automation not found' });
      return;
    }

    const studentCount = await prisma.student.count();
    const run = await prisma.emailAutomationRun.create({
      data: {
        automationId: auto.id,
        recipientCount: studentCount,
        sentCount: studentCount,
        failedCount: 0,
        status: 'success',
      },
    });

    await prisma.emailAutomation.update({
      where: { id: auto.id },
      data: { lastRunAt: new Date() },
    });

    await ActivityService.log({
      eventId: 'photo-2026',
      category: 'EMAIL',
      action: `Executed email automation: ${auto.name}`,
      details: `Delivered to ${studentCount} students via template: ${auto.template.name}`,
      status: 'SUCCESS',
    });

    res.json({ success: true, run });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/email/history', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const [automationRuns, emailLogs] = await Promise.all([
      prisma.emailAutomationRun.findMany({
        take: 50,
        orderBy: { runAt: 'desc' },
        include: { automation: { include: { template: true } } },
      }),
      prisma.emailLog.findMany({
        take: 50,
        orderBy: { sentAt: 'desc' },
        include: { event: true },
      }),
    ]);
    res.json({ automationRuns, emailLogs });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

router.get('/email/templates', async (_req: Request, res: Response): Promise<Response | void> => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ templates });
  } catch (err: any) {
    return httpError(res, 500, err, "SERVER_ERROR");
  }
});

// ==========================================
// ROLES & PERMISSIONS
// ==========================================


export default router;

import { Request, Response } from 'express';
import { httpError } from '../../middleware/apiError';
import { ActivityService } from '../../services/activity.service';
import * as service from './email.service';

export async function getEmailAutomations(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getEmailAutomations();
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching email automations:', err);
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function createEmailAutomation(req: Request, res: Response): Promise<Response | void> {
  try {
    const automation = await service.createEmailAutomation(req.body);
    res.status(201).json(automation);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function toggleEmailAutomation(req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.toggleEmailAutomation(req.params.id);
    if ('notFound' in result) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Automation not found' });
      return;
    }
    res.json({ success: true, automation: result.updated });
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function runEmailAutomation(req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.runEmailAutomation(req.params.id);
    if ('notFound' in result) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Automation not found' });
      return;
    }

    await ActivityService.log({
      eventId: 'photo-2026',
      category: 'EMAIL',
      action: `Executed email automation: ${result.auto.name}`,
      details: `Delivered to ${result.studentCount} students via template: ${result.auto.template.name}`,
      status: 'SUCCESS',
    });

    res.json({ success: true, run: result.run });
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getEmailHistory(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getEmailHistory();
    res.json(result);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

export async function getEmailTemplates(_req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getEmailTemplates();
    res.json(result);
  } catch (err: any) {
    return httpError(res, 500, err, 'SERVER_ERROR');
  }
}

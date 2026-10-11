import { Request, Response } from 'express';
import { NotFoundError } from '../../utils/appError';
import { ActivityService } from '../admin';
import * as service from './email.service';

export async function getEmailAutomations(_req: Request, res: Response): Promise<void> {
  const result = await service.getEmailAutomations();
  res.json(result);
}

export async function createEmailAutomation(req: Request, res: Response): Promise<void> {
  const automation = await service.createEmailAutomation(req.body);
  res.status(201).json(automation);
}

export async function toggleEmailAutomation(req: Request, res: Response): Promise<void> {
  const result = await service.toggleEmailAutomation(req.params.id);
  if ('notFound' in result) {
    throw new NotFoundError('Automation not found');
  }
  res.json({ success: true, automation: result.updated });
}

export async function runEmailAutomation(req: Request, res: Response): Promise<void> {
  const result = await service.runEmailAutomation(req.params.id);
  if ('notFound' in result) {
    throw new NotFoundError('Automation not found');
  }

  await ActivityService.log({
    eventId: 'photo-2026',
    category: 'EMAIL',
    action: `Executed email automation: ${result.auto.name}`,
    details: `Delivered to ${result.studentCount} students via template: ${result.auto.template.name}`,
    status: 'SUCCESS',
  });

  res.json({ success: true, run: result.run });
}

export async function getEmailHistory(_req: Request, res: Response): Promise<void> {
  const result = await service.getEmailHistory();
  res.json(result);
}

export async function getEmailTemplates(_req: Request, res: Response): Promise<void> {
  const result = await service.getEmailTemplates();
  res.json(result);
}

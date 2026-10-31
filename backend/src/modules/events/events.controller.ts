import { Request, Response } from 'express';
import { AppError, ValidationError } from '../../utils/appError';
import * as service from './events.service';
import { parseEventPayload } from './events.schemas';

// Student controllers
export async function getStudentEvents(_req: Request, res: Response): Promise<Response | void> {
  const events = await service.getOpenStudentEvents();
  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.json(events);
}

export async function getStudentEventById(req: Request, res: Response): Promise<Response | void> {
  const event = await service.getStudentEventById(req.params.id);
  res.json(event);
}

// Admin API controllers
export async function getAdminEvents(_req: Request, res: Response): Promise<Response | void> {
  const events = await service.getAdminEventsList();
  res.json({ events });
}

export async function getRegistrations(req: Request, res: Response): Promise<Response | void> {
  const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
  const section = req.query.section ? String(req.query.section).trim() : undefined;
  const team = req.query.team ? String(req.query.team).trim().toLowerCase() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

  const result = await service.getRegistrationsList({
    eventId,
    status,
    year,
    section,
    team,
    search,
    page,
    limit,
  });
  res.json(result);
}

export async function exportRegistrations(req: Request, res: Response): Promise<Response | void> {
  const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
  const section = req.query.section ? String(req.query.section).trim() : undefined;

  const workbook = await service.exportRegistrationsWorkbook({
    eventId,
    status,
    year,
    section,
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=event-registrations-${Date.now()}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
}

export async function getRegistrationById(req: Request, res: Response): Promise<Response | void> {
  const result = await service.getRegistrationDetail(req.params.id);
  res.json(result);
}

export async function updateRegistrationStatus(req: Request, res: Response): Promise<Response | void> {
  const { status, note } = req.body;
  const updated = await service.updateRegistrationStatus(req.params.id, status, note);
  res.json({ success: true, registration: updated });
}

export async function deleteRegistration(req: Request, res: Response): Promise<Response | void> {
  await service.deleteRegistration(req.params.id);
  res.json({ success: true, message: 'Registration deleted successfully' });
}

export async function getTeams(req: Request, res: Response): Promise<Response | void> {
  const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const search = req.query.search ? String(req.query.search).trim() : undefined;

  const teams = await service.getTeamsList({ eventId, status, search });
  res.json({ teams });
}

export async function updateTeamStatus(req: Request, res: Response): Promise<Response | void> {
  const { status } = req.body;
  const team = await service.updateTeamStatus(req.params.id, status);
  res.json({ success: true, team });
}

export async function removeTeamMember(req: Request, res: Response): Promise<Response | void> {
  const { studentId, reason } = req.body;
  await service.removeTeamMember(req.params.id, studentId, reason);
  res.json({ success: true, message: 'Member removed from team successfully' });
}

// Admin Portal controllers
export async function getPortalEvents(_req: Request, res: Response): Promise<Response | void> {
  const events = await service.getPortalEventsList();
  res.json({ events });
}

export async function createPortalEvent(req: Request, res: Response): Promise<Response | void> {
  const parsed = parseEventPayload(req.body, { partial: false });
  if (!parsed.ok) {
    throw new ValidationError(parsed.message);
  }
  const event = await service.createPortalEvent(parsed.data);
  res.status(201).json(event);
}

export async function getPortalEventById(req: Request, res: Response): Promise<Response | void> {
  const event = await service.getPortalEventById(req.params.id);
  res.json(event);
}

export async function updatePortalEvent(req: Request, res: Response): Promise<Response | void> {
  const parsed = parseEventPayload(req.body, { partial: true });
  if (!parsed.ok) {
    throw new ValidationError(parsed.message);
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new ValidationError('No fields to update.');
  }

  const event = await service.updatePortalEvent(req.params.id, parsed.data);
  res.json(event);
}

export async function publishPortalEvent(req: Request, res: Response): Promise<Response | void> {
  const event = await service.setPortalEventStatus(req.params.id, 'OPEN');
  res.json(event);
}

export async function closePortalEvent(req: Request, res: Response): Promise<Response | void> {
  const event = await service.setPortalEventStatus(req.params.id, 'CLOSED');
  res.json(event);
}

export async function archivePortalEvent(req: Request, res: Response): Promise<Response | void> {
  const event = await service.setPortalEventStatus(req.params.id, 'ARCHIVED');
  res.json(event);
}

export async function deletePortalEvent(req: Request, res: Response): Promise<Response | void> {
  const adminEmail = (req as any).adminUser?.email;
  const force = Boolean(req.body?.force);
  const result = await service.deletePortalEvent(req.params.id, force, adminEmail);
  if (result.confirmationRequired) {
    // A 409 that carries the dependent counts the admin client renders.
    // Thrown as an AppError so the response still goes through errorHandler.
    throw new AppError('CONFIRMATION_REQUIRED', result.message, 409, undefined, undefined, {
      confirmationRequired: true,
      dependents: result.dependents,
    });
  }
  res.json(result);
}

export async function getPortalEventRegistrations(req: Request, res: Response): Promise<Response | void> {
  const registrations = await service.getPortalEventRegistrations(req.params.id);
  res.json({ registrations });
}

export async function createPortalEventFormField(req: Request, res: Response): Promise<Response | void> {
  const field = await service.createPortalEventFormField(req.params.id, req.body);
  res.status(201).json(field);
}

export async function updatePortalEventFormField(req: Request, res: Response): Promise<Response | void> {
  const field = await service.updatePortalEventFormField(req.params.id, req.params.fieldId, req.body);
  res.json(field);
}

export async function deletePortalEventFormField(req: Request, res: Response): Promise<Response | void> {
  await service.deletePortalEventFormField(req.params.id, req.params.fieldId);
  res.json({ success: true, message: 'Form field deleted' });
}

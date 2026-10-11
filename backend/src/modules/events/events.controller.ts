import { Request, Response } from 'express';
import { AppError } from '../../utils/appError';
import * as service from './events.service';
import { parseEventPayload } from './events.schemas';

// Student controllers
export async function getStudentEvents(_req: Request, res: Response): Promise<Response | void> {
  try {
    const events = await service.getOpenStudentEvents();
    res.set('Cache-Control', 'no-cache, must-revalidate');
    res.json(events);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getStudentEventById(req: Request, res: Response): Promise<Response | void> {
  try {
    const event = await service.getStudentEventById(req.params.id);
    res.json(event);
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

// Admin API controllers
export async function getAdminEvents(_req: Request, res: Response): Promise<Response | void> {
  try {
    const events = await service.getAdminEventsList();
    res.json({ events });
  } catch (err: any) {
    console.error('Error fetching events list:', err);
    throw new AppError('FAILED_TO_FETCH_EVENTS', 'Error fetching events list', 500);
  }
}

export async function getRegistrations(req: Request, res: Response): Promise<Response | void> {
  try {
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
  } catch (err: any) {
    console.error('Error fetching registrations:', err);
    throw err;
  }
}

export async function exportRegistrations(req: Request, res: Response): Promise<Response | void> {
  try {
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
  } catch (err: any) {
    console.error('Error exporting registrations:', err);
    throw err;
  }
}

export async function getRegistrationById(req: Request, res: Response): Promise<Response | void> {
  try {
    const result = await service.getRegistrationDetail(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
    }
    console.error('Error fetching registration detail:', err);
    throw err;
  }
}

export async function updateRegistrationStatus(req: Request, res: Response): Promise<Response | void> {
  try {
    const { status, note } = req.body;
    const updated = await service.updateRegistrationStatus(req.params.id, status, note);
    res.json({ success: true, registration: updated });
  } catch (err: any) {
    if (err.statusCode === 400 || err.code === 'INVALID_STATUS') {
      return res.status(400).json({ error: err.code || 'INVALID_STATUS', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
    }
    console.error('Error updating registration status:', err);
    throw err;
  }
}

export async function deleteRegistration(req: Request, res: Response): Promise<Response | void> {
  try {
    await service.deleteRegistration(req.params.id);
    res.json({ success: true, message: 'Registration deleted successfully' });
  } catch (err: any) {
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Registration not found' });
    }
    console.error('Error deleting registration:', err);
    throw err;
  }
}

export async function getTeams(req: Request, res: Response): Promise<Response | void> {
  try {
    const eventId = req.query.eventId ? String(req.query.eventId).trim() : undefined;
    const status = req.query.status ? String(req.query.status).trim() : undefined;
    const search = req.query.search ? String(req.query.search).trim() : undefined;

    const teams = await service.getTeamsList({ eventId, status, search });
    res.json({ teams });
  } catch (err: any) {
    console.error('Error fetching teams:', err);
    throw err;
  }
}

export async function updateTeamStatus(req: Request, res: Response): Promise<Response | void> {
  try {
    const { status } = req.body;
    const team = await service.updateTeamStatus(req.params.id, status);
    res.json({ success: true, team });
  } catch (err: any) {
    if (err.statusCode === 400 || err.code === 'INVALID_STATUS') {
      return res.status(400).json({ error: err.code || 'INVALID_STATUS', message: err.message });
    }
    console.error('Error updating team status:', err);
    throw err;
  }
}

export async function removeTeamMember(req: Request, res: Response): Promise<Response | void> {
  try {
    const { studentId, reason } = req.body;
    await service.removeTeamMember(req.params.id, studentId, reason);
    res.json({ success: true, message: 'Member removed from team successfully' });
  } catch (err: any) {
    if (err.statusCode === 400 || err.code === 'MISSING_DATA') {
      return res.status(400).json({ error: err.code || 'MISSING_DATA', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: err.message });
    }
    console.error('Error removing team member:', err);
    throw err;
  }
}

// Admin Portal controllers
export async function getPortalEvents(_req: Request, res: Response): Promise<Response | void> {
  try {
    const events = await service.getPortalEventsList();
    res.json({ events });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function createPortalEvent(req: Request, res: Response): Promise<Response | void> {
  try {
    const parsed = parseEventPayload(req.body, { partial: false });
    if (!parsed.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.message });
    }
    const event = await service.createPortalEvent(parsed.data);
    res.status(201).json(event);
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not create the event.' });
  }
}

export async function getPortalEventById(req: Request, res: Response): Promise<Response | void> {
  try {
    const event = await service.getPortalEventById(req.params.id);
    res.json(event);
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function updatePortalEvent(req: Request, res: Response): Promise<Response | void> {
  try {
    const parsed = parseEventPayload(req.body, { partial: true });
    if (!parsed.ok) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.message });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'No fields to update.' });
    }

    const event = await service.updatePortalEvent(req.params.id, parsed.data);
    res.json(event);
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }
    if (err.statusCode === 400 || err.code === 'BAD_REQUEST') {
      return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
    }
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
}

export async function publishPortalEvent(req: Request, res: Response): Promise<Response | void> {
  try {
    const event = await service.setPortalEventStatus(req.params.id, 'OPEN');
    res.json(event);
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found.' });
    }
    console.error(`Error setting event ${req.params.id} to OPEN:`, err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
}

export async function closePortalEvent(req: Request, res: Response): Promise<Response | void> {
  try {
    const event = await service.setPortalEventStatus(req.params.id, 'CLOSED');
    res.json(event);
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found.' });
    }
    console.error(`Error setting event ${req.params.id} to CLOSED:`, err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
}

export async function archivePortalEvent(req: Request, res: Response): Promise<Response | void> {
  try {
    const event = await service.setPortalEventStatus(req.params.id, 'ARCHIVED');
    res.json(event);
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found.' });
    }
    console.error(`Error setting event ${req.params.id} to ARCHIVED:`, err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not update the event.' });
  }
}

export async function deletePortalEvent(req: Request, res: Response): Promise<Response | void> {
  try {
    const adminEmail = (req as any).adminUser?.email;
    const force = Boolean(req.body?.force);
    const result = await service.deletePortalEvent(req.params.id, force, adminEmail);
    if (result.confirmationRequired) {
      return res.status(409).json(result);
    }
    res.json(result);
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'PROTECTED_EVENT') {
      return res.status(403).json({ error: 'PROTECTED_EVENT', message: err.message });
    }
    if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function getPortalEventRegistrations(req: Request, res: Response): Promise<Response | void> {
  try {
    const registrations = await service.getPortalEventRegistrations(req.params.id);
    res.json({ registrations });
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function createPortalEventFormField(req: Request, res: Response): Promise<Response | void> {
  try {
    const field = await service.createPortalEventFormField(req.params.id, req.body);
    res.status(201).json(field);
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function updatePortalEventFormField(req: Request, res: Response): Promise<Response | void> {
  try {
    const field = await service.updatePortalEventFormField(req.params.id, req.params.fieldId, req.body);
    res.json(field);
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

export async function deletePortalEventFormField(req: Request, res: Response): Promise<Response | void> {
  try {
    await service.deletePortalEventFormField(req.params.id, req.params.fieldId);
    res.json({ success: true, message: 'Form field deleted' });
  } catch (err: any) {
    if (err.statusCode === 409 || err.code === 'SYSTEM_RECORD') {
      return res.status(409).json({ error: 'SYSTEM_RECORD', message: err.message });
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' });
  }
}

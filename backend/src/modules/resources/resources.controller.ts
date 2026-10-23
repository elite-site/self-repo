import { Request, Response } from 'express';
import {
  validateStudentResourcesQuery,
  validateCreateResourceInput,
  validateUpdateResourceInput,
} from './resources.schemas';
import * as service from './resources.service';

export async function getStudentResources(req: Request, res: Response): Promise<void> {
  const studentId = req.student?.studentId || (req as any).studentId;
  const filter = validateStudentResourcesQuery(req.query);

  const result = await service.getStudentResources(studentId, filter);
  res.setHeader('Cache-Control', 'private, max-age=30');
  res.json(result);
}

export async function getStudentSemesters(req: Request, res: Response): Promise<void> {
  const studentId = req.student?.studentId || (req as any).studentId;
  const result = await service.getStudentAllowedSemesters(studentId);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json(result);
}

export async function adminListResources(req: Request, res: Response): Promise<void> {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const semester = req.query.semester ? Number(req.query.semester) : undefined;
  const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;
  const type = typeof req.query.type === 'string' ? (req.query.type.toUpperCase() as any) : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const result = await service.getAdminResources({ year, semester, subject, type, search });
  res.json(result);
}

export async function adminCreateResource(req: Request, res: Response): Promise<void> {
  const adminIdentifier = req.adminUser?.username || req.adminUser?.email || 'Admin';
  const input = validateCreateResourceInput(req.body);
  const resource = await service.createResource(adminIdentifier, input);
  res.status(201).json({ success: true, resource });
}

export async function adminUpdateResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const input = validateUpdateResourceInput(req.body);
  const resource = await service.updateResource(id, input);
  res.json({ success: true, resource });
}

export async function adminDeleteResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await service.deleteResource(id);
  res.json(result);
}

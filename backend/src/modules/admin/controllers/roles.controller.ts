import { Request, Response } from 'express';
import { ValidationError } from '../../../utils/appError';
import * as adminService from '../admin.service';

export async function listRoles(_req: Request, res: Response): Promise<void> {
  const roles = await adminService.listRoles();
  res.json(roles);
}

export async function createRole(req: Request, res: Response): Promise<void> {
  const { name, description } = req.body;
  const role = await adminService.createRole(name, description);
  res.status(201).json(role);
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const { description } = req.body;
  const role = await adminService.updateRole(req.params.id, description);
  res.json(role);
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  await adminService.deleteRole(req.params.id);
  res.json({ success: true, message: 'Role deleted' });
}

export async function assignRole(req: Request, res: Response): Promise<void> {
  const body: Record<string, unknown> = req.body ?? {};
  const adminId = typeof body.adminId === 'string' ? body.adminId.trim() : '';
  const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : '';

  const missing = [
    ...(adminId ? [] : [{ field: 'adminId', message: 'Admin id is required.' }]),
    ...(roleId ? [] : [{ field: 'roleId', message: 'Role id is required.' }]),
  ];
  if (missing.length > 0) {
    throw new ValidationError('adminId and roleId are required.', missing);
  }

  const assignment = await adminService.assignRole(adminId, roleId);
  res.json({ success: true, assignment });
}

export async function listPermissions(req: Request, res: Response): Promise<void> {
  const permissions = await adminService.listPermissions(req.params.id);
  res.json(permissions);
}

export async function listAdmins(_req: Request, res: Response): Promise<void> {
  const admins = await adminService.listAdmins();
  res.json(admins);
}

export async function createAdmin(req: Request, res: Response): Promise<void> {
  const admin = await adminService.createAdmin(req.body);
  res.status(201).json(admin);
}

export async function updateAdmin(req: Request, res: Response): Promise<void> {
  const admin = await adminService.updateAdmin(req.params.id, req.body);
  res.json(admin);
}

export async function deleteAdmin(req: Request, res: Response): Promise<void> {
  await adminService.deleteAdmin(req.params.id);
  res.json({ success: true, message: 'Admin user deleted' });
}

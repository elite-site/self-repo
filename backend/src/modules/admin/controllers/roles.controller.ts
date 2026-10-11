import { Request, Response } from 'express';
import * as adminService from '../admin.service';

export async function listRoles(_req: Request, res: Response): Promise<void> {
  try {
    const roles = await adminService.listRoles();
    res.json(roles);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createRole(req: Request, res: Response): Promise<void> {
  try {
    const { name, description } = req.body;
    const role = await adminService.createRole(name, description);
    res.status(201).json(role);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  try {
    const { description } = req.body;
    const role = await adminService.updateRole(req.params.id, description);
    res.json(role);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteRole(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function listPermissions(req: Request, res: Response): Promise<void> {
  try {
    const permissions = await adminService.listPermissions(req.params.id);
    res.json(permissions);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function listAdmins(_req: Request, res: Response): Promise<void> {
  try {
    const admins = await adminService.listAdmins();
    res.json(admins);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createAdmin(req: Request, res: Response): Promise<void> {
  try {
    const admin = await adminService.createAdmin(req.body);
    res.status(201).json(admin);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateAdmin(req: Request, res: Response): Promise<void> {
  try {
    const admin = await adminService.updateAdmin(req.params.id, req.body);
    res.json(admin);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteAdmin(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteAdmin(req.params.id);
    res.json({ success: true, message: 'Admin user deleted' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

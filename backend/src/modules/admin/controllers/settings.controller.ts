import { Request, Response } from 'express';
import { AppError } from '../../../utils/appError';
import * as adminService from '../admin.service';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await adminService.getSettings();
    res.json(settings);
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const { key, value, group } = req.body;
    await adminService.saveSetting(key, value, group);
    res.json({ message: 'Success' });
  } catch (err: any) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function getPortalSettings(_req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getPortalSettings();
    res.json(result);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updatePortalSettings(req: Request, res: Response): Promise<void> {
  try {
    await adminService.savePortalSettings(req.body, req.adminUser?.username);
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function listSkills(_req: Request, res: Response): Promise<void> {
  try {
    const skills = await adminService.listSkills();
    res.json(skills);
  } catch (err: any) {
    console.error('Error listing skills:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function createSkill(req: Request, res: Response): Promise<void> {
  try {
    const { name, category } = req.body;
    const skill = await adminService.createSkill(name, category);
    res.status(201).json(skill);
  } catch (err: any) {
    console.error('Error creating skill:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function deleteSkill(req: Request, res: Response): Promise<void> {
  try {
    await adminService.deleteSkill(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    console.error('Error deleting skill:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Server error' });
  }
}

export async function listPortalAnnouncements(_req: Request, res: Response): Promise<void> {
  try {
    const announcements = await adminService.listPortalAnnouncements();
    res.json(announcements);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function createPortalAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const announcement = await adminService.createPortalAnnouncement(req.body, req.adminUser?.username);
    res.status(201).json(announcement);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function publishPortalAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const announcement = await adminService.publishPortalAnnouncement(req.params.id);
    res.json(announcement);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

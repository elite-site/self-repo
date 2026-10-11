import { Request, Response } from 'express';
import { AppError } from '../../../utils/appError';
import {
  AcademicYearPromotionError,
  promoteAcademicYear as runAcademicYearPromotion,
} from '../services/academicYear.service';
import * as adminService from '../admin.service';

export async function getRoster(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getStudentRoster(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Error fetching student roster:', err);
    res.status(500).json({ error: 'FAILED_TO_FETCH_STUDENTS', message: err.message || 'Server error' });
  }
}

export async function exportRoster(req: Request, res: Response): Promise<void> {
  try {
    const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
    const { workbook, filename } = await adminService.exportRosterWorkbook(eventId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Error exporting student roster:', err);
    res.status(500).json({ error: 'STUDENTS_EXPORT_FAILED', message: err.message || 'Server error' });
  }
}

export async function getPortalStudents(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getPortalStudents(req.query as any);
    res.json(result);
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function getPortalStudentDetail(req: Request, res: Response): Promise<void> {
  try {
    const result = await adminService.getPortalStudentDetail(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function requestItemChange(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, type, itemId } = req.params;
    const { note } = req.body;
    const reasonText = (note || '').trim();
    const reviewerName = req.adminUser?.username || 'Admin';

    const result = await adminService.requestItemChange(
      studentId,
      type,
      itemId,
      reasonText,
      reviewerName,
      req.adminUser?.email
    );
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function deleteStudentItem(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, type, itemId } = req.params;
    const reasonText = (req.body?.reason || (req.query as any)?.reason || '').trim();

    const result = await adminService.deleteStudentItem(
      studentId,
      type,
      itemId,
      reasonText,
      req.adminUser?.email
    );
    res.json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function updateStudentProfileStatus(req: Request, res: Response): Promise<void> {
  try {
    const { isPublic } = req.body;
    const profile = await adminService.saveSetting(req.params.id, isPublic);
    res.json({ success: true, profile });
  } catch (err: any) {
    console.error('Internal server error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
}

export async function toggleStudentFeature(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, message: 'Student feature status toggled' });
}

export async function promoteAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    const adminEmail = req.adminUser?.email || req.adminUser?.username || 'ADMIN';
    const result = await runAcademicYearPromotion({
      adminEmail,
      force: req.body?.force === true,
      academicYear: req.body?.academicYear,
    });
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof AcademicYearPromotionError) {
      if (err.code === 'NO_ACTIVE_STUDENTS') {
        res.status(409).json({
          error: 'NO_ACTIVE_STUDENTS',
          message: 'No active students to promote.',
        });
        return;
      }
      res.status(409).json({
        error: 'ALREADY_PROMOTED',
        message: `Already promoted for academic year ${err.targetYear} — run again anyway?`,
        alreadyPromoted: true,
      });
      return;
    }
    console.error('Error promoting academic year:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Internal server error',
    });
  }
}

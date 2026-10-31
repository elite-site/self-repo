import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { promoteAcademicYear as runAcademicYearPromotion } from '../services/academicYear.service';
import {
  AcademicYearPromotionConflictError,
  AcademicYearPromotionError,
} from '../admin.errors';
import * as adminService from '../admin.service';

export async function getRoster(req: Request, res: Response): Promise<void> {
  const result = await adminService.getStudentRoster(req.query as any);
  res.json(result);
}

export async function exportRoster(req: Request, res: Response): Promise<void> {
  const eventId = ((req.query.eventId as string) || adminService.ACTIVE_EVENT_ID).trim();
  const { workbook, filename } = await adminService.exportRosterWorkbook(eventId);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  try {
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    // The workbook writes straight to the response; once it has flushed headers
    // the only safe failure signal is an aborted connection, not a JSON body.
    if (res.headersSent) {
      logger.error('Student roster export failed after streaming started', {
        route: 'GET /admin/api/students/export',
        eventId,
        error: String(err),
      });
      res.destroy();
      return;
    }
    throw err;
  }
}

export async function getPortalStudentDetail(req: Request, res: Response): Promise<void> {
  const result = await adminService.getPortalStudentDetail(req.params.id);
  res.json(result);
}

export async function requestItemChange(req: Request, res: Response): Promise<void> {
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
}

export async function deleteStudentItem(req: Request, res: Response): Promise<void> {
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
}

export async function updateStudentProfileStatus(req: Request, res: Response): Promise<void> {
  const { isPublic } = req.body;
  const profile = await adminService.saveSetting(req.params.id, isPublic);
  res.json({ success: true, profile });
}

export async function toggleStudentFeature(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, message: 'Student feature status toggled' });
}

export async function promoteAcademicYear(req: Request, res: Response): Promise<void> {
  const adminEmail = req.adminUser?.email || req.adminUser?.username || 'ADMIN';

  try {
    const result = await runAcademicYearPromotion({
      adminEmail,
      force: req.body?.force === true,
      academicYear: req.body?.academicYear,
    });
    res.status(200).json(result);
  } catch (err) {
    // The repository guard signals a business conflict; anything else is a real
    // failure and must reach the central error handler untouched.
    if (err instanceof AcademicYearPromotionError) {
      throw new AcademicYearPromotionConflictError(err.code, err.targetYear);
    }
    throw err;
  }
}

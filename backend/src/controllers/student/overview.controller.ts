import { Request, Response } from 'express';
import { AppError } from '../../utils/appError';
import { getStudentMeData, getStudentDashboardData } from '../../services/student/overview.service';

export async function getMe(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const rollNo = req.student?.rollNo;

  const result = await getStudentMeData(studentId, rollNo);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(result);
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const studentId = (req as any).studentId || req.student?.studentId;
  if (!studentId) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401, 'overview.controller:getDashboard');
  }

  const rollNo = req.student?.rollNo;
  const result = await getStudentDashboardData(studentId, rollNo);

  res.setHeader('Cache-Control', 'private, max-age=15');
  res.json(result);
}

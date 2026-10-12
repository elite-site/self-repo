import { Request, Response } from 'express';
import { reportsService } from './reports.service';
import { parseCourseIdParam } from './reports.schemas';

export async function getOverview(_req: Request, res: Response) {
  const result = await reportsService.getOverview();
  res.json(result);
}

export async function getCourseReport(req: Request, res: Response) {
  const courseId = parseCourseIdParam(req.params.id);
  const result = await reportsService.getCourseReport(courseId);
  res.json(result);
}

export async function exportCourseReport(req: Request, res: Response) {
  const courseId = parseCourseIdParam(req.params.id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="course-${courseId}-report.csv"`);
  await reportsService.streamCourseExport(courseId, res);
}

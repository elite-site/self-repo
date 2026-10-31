import { Request, Response } from 'express';
import * as service from './codechef.service';
import {
  parseConnectBody,
  parseVisibilityBody,
  parseAdminFilterQuery,
  parseLeaderboardQuery,
} from './codechef.schemas';
import { logActivityNonBlocking } from '../admin/services/activity.service';

export async function getStatus(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const status = await service.getStatus(studentId);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.json(status);
}

export async function getDetails(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const details = await service.getDetails(studentId);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json(details);
}

export async function connect(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const { handle } = parseConnectBody(req.body);
  const result = await service.connect(studentId, handle);
  res.json(result);
}

export async function verify(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const result = await service.verify(studentId);
  res.json(result);
}

export async function sync(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const result = await service.sync(studentId);
  res.json(result);
}

export async function setVisibility(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const { showPublic } = parseVisibilityBody(req.body);
  const result = await service.setVisibility(studentId, showPublic);
  res.json(result);
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  const studentId = req.student!.studentId;
  const result = await service.disconnect(studentId);
  res.json(result);
}

export async function getAdminStudents(req: Request, res: Response): Promise<void> {
  const query = parseAdminFilterQuery(req.query as Record<string, unknown>);
  const result = await service.getAdminStudents(query);
  res.json(result);
}

export async function getAdminLeaderboard(req: Request, res: Response): Promise<void> {
  const { year, limit } = parseLeaderboardQuery(req.query as Record<string, unknown>);
  const result = await service.getAdminLeaderboard(year, limit);
  res.json(result);
}

export async function getAdminStats(_req: Request, res: Response): Promise<void> {
  const stats = await service.getAdminStats();
  res.json(stats);
}

export async function getAdminStudentDetails(req: Request, res: Response): Promise<void> {
  const { studentId } = req.params;
  const details = await service.getDetails(studentId);
  res.json(details);
}

export async function adminResyncStudent(req: Request, res: Response): Promise<void> {
  const { studentId } = req.params;
  const userEmail = req.adminUser?.email || req.adminUser?.username || 'admin';
  const result = await service.adminResync(studentId);
  logActivityNonBlocking({
    userEmail,
    action: 'UPDATE_CODECHEF_RESYNC',
    category: 'ADMIN',
    details: JSON.stringify({ studentId, action: 'codechef_resync' }),
  });
  res.json(result);
}

export async function adminVerifyStudent(req: Request, res: Response): Promise<void> {
  const { studentId } = req.params;
  const userEmail = req.adminUser?.email || req.adminUser?.username || 'admin';
  const result = await service.adminVerify(studentId);
  logActivityNonBlocking({
    userEmail,
    action: 'UPDATE_CODECHEF_VERIFY',
    category: 'ADMIN',
    details: JSON.stringify({ studentId, action: 'codechef_manual_verify' }),
  });
  res.json(result);
}

export async function adminUnlinkStudent(req: Request, res: Response): Promise<void> {
  const { studentId } = req.params;
  const userEmail = req.adminUser?.email || req.adminUser?.username || 'admin';
  const result = await service.adminUnlink(studentId);
  logActivityNonBlocking({
    userEmail,
    action: 'DELETE_CODECHEF_UNLINK',
    category: 'ADMIN',
    details: JSON.stringify({ studentId, action: 'codechef_unlink' }),
  });
  res.json(result);
}

export async function exportStudentsCsv(req: Request, res: Response): Promise<void> {
  const query = parseAdminFilterQuery(req.query as Record<string, unknown>);
  const result = await service.getAdminStudents({ ...query, page: 1, limit: 100 });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="codechef_students.csv"');
  res.write('Roll No,Name,Year,Section,Handle,Verified,Status,Rating,Stars,Solved,Contests,Last Synced\n');
  for (const s of result.students) {
    res.write(
      `"${s.rollNo}","${s.name}",${s.year},"${s.section}","${s.handle || ''}",${s.verified},"${s.status}",${s.currentRating ?? ''},${s.stars ?? ''},${s.totalSolved ?? ''},${s.totalContests ?? ''},"${s.lastSyncedAt || ''}"\n`,
    );
  }
  res.end();
}

export async function handleInternalSyncTick(req: Request, res: Response): Promise<void> {
  const limit = parseInt((req.query.limit as string) || '10', 10);
  const result = await service.syncScheduledBatch(limit);
  res.json(result);
}

import { Request, Response } from 'express';
import { progressService } from './progress.service';
import { parseProgressPayload } from './progress.schemas';

export async function getLesson(req: Request, res: Response) {
  const result = await progressService.getLessonDetail(req.params.id, req.student!.studentId);
  res.json(result);
}

export async function updateLessonProgress(req: Request, res: Response) {
  const payload = parseProgressPayload(req.body);
  const result = await progressService.updateProgress(req.params.id, req.student!.studentId, payload);
  res.json(result);
}

export async function getMyLearning(req: Request, res: Response) {
  const result = await progressService.getMyLearning(req.student!.studentId);
  res.json(result);
}
